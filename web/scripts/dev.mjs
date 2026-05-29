/**
 * dev wrapper：vitepress dev 的进程级"热重启"包装。
 *
 * 为什么不在 vitepress 内部用 server.restart()：
 *   vitepress 1.6 的 server.restart() 与本地搜索 MiniSearch 索引重建有冲突，
 *   restart 时报 "duplicate ID"，结果旧 server 还在但 sidebar/wikilink 未更新。
 *
 * 这里改在外层：监听 content/ 的结构变化（新增/删除/重命名 md 或目录），
 * kill 掉子 vitepress 进程后干净重启。每次都是全新进程，不存在状态残留。
 *
 * 已有 md 文件的"内容修改"不重启——
 *   - VitePress 自身负责 markdown HMR
 *   - backlinks.data.mjs / graph.data.mjs 用 watch 字段已经覆盖
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WEB_DIR = path.resolve(__dirname, '..');
const CONTENT_DIR = path.resolve(WEB_DIR, '..', 'content');

const isWin = process.platform === 'win32';
// 直接执行 vitepress 的 js 入口，避免 shell:true + 带空格路径的 quoting 问题
const VITEPRESS_ENTRY = path.join(
  WEB_DIR, 'node_modules', 'vitepress', 'bin', 'vitepress.js',
);

const DEBOUNCE_MS = 400;

let child = null;
let restartTimer = null;
const pending = new Set();
let shuttingDown = false;
// 标记我们正在主动 kill 子进程——避免 Windows 上 taskkill 导致的 code=1 被当成 crash
let killingDeliberately = false;

function startChild() {
  killingDeliberately = false;
  child = spawn(process.execPath, [VITEPRESS_ENTRY, 'dev'], {
    cwd: WEB_DIR,
    stdio: 'inherit',
    env: process.env,
  });
  child.on('exit', (code, signal) => {
    if (shuttingDown) {
      process.exit(code ?? 0);
      return;
    }
    if (killingDeliberately) {
      // 是我们主动 kill 的，等 restart() 里 startChild() 再起一个
      return;
    }
    if (code !== 0 && code !== null) {
      console.error(`[dev-wrapper] vitepress 异常退出 code=${code} signal=${signal}`);
      process.exit(code);
    }
  });
}

function killChild() {
  return new Promise((resolve) => {
    if (!child || child.exitCode !== null) {
      resolve();
      return;
    }
    killingDeliberately = true;
    child.once('exit', () => resolve());
    if (isWin) {
      // 用 taskkill /t /f 树形终止，确保 vitepress 派生的子进程也被回收
      spawn('taskkill', ['/pid', String(child.pid), '/t', '/f'], { stdio: 'ignore' });
    } else {
      child.kill('SIGTERM');
    }
  });
}

async function restart(reasons) {
  console.log('\n[dev-wrapper] content/ 结构变化，重启 vitepress：');
  for (const r of reasons) console.log(`  - ${r}`);
  await killChild();
  startChild();
}

function scheduleRestart(reason) {
  pending.add(reason);
  if (restartTimer) clearTimeout(restartTimer);
  restartTimer = setTimeout(() => {
    const reasons = [...pending];
    pending.clear();
    restartTimer = null;
    restart(reasons);
  }, DEBOUNCE_MS);
}

// 记录已知路径，用以判断 rename 事件到底是"新增"还是"删除"
const knownPaths = new Set();
function takeSnapshot() {
  knownPaths.clear();
  if (!fs.existsSync(CONTENT_DIR)) return;
  function walk(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.name.startsWith('.')) continue;
      const full = path.join(dir, e.name);
      knownPaths.add(full);
      if (e.isDirectory()) walk(full);
    }
  }
  walk(CONTENT_DIR);
}
takeSnapshot();

const rel = (p) => path.relative(CONTENT_DIR, p).replace(/\\/g, '/');

fs.watch(CONTENT_DIR, { recursive: true, persistent: true }, (eventType, filename) => {
  if (!filename) return;
  if (filename.startsWith('.') || filename.includes(`${path.sep}.`)) return;
  // change = 文件内容修改，交给 vitepress HMR + data loader
  if (eventType !== 'rename') return;

  const full = path.join(CONTENT_DIR, filename);
  const exists = fs.existsSync(full);
  const isMd = filename.endsWith('.md');

  if (exists) {
    if (knownPaths.has(full)) return;
    try {
      const stat = fs.statSync(full);
      if (stat.isDirectory()) {
        knownPaths.add(full);
        scheduleRestart(`新增目录 ${rel(full)}/`);
      } else if (isMd) {
        knownPaths.add(full);
        scheduleRestart(`新增 ${rel(full)}`);
      }
    } catch {
      // race：刚检测到就被删了，下一轮 rename 事件会处理
    }
  } else {
    if (!knownPaths.has(full)) return;
    knownPaths.delete(full);
    if (isMd) {
      scheduleRestart(`删除 ${rel(full)}`);
    } else {
      scheduleRestart(`删除目录 ${rel(full)}/`);
    }
  }
});

for (const sig of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
  process.on(sig, async () => {
    shuttingDown = true;
    await killChild();
    process.exit(0);
  });
}

console.log('[dev-wrapper] 监听 content/ 结构变化（新增/删除/重命名），自动重启 vitepress');
startChild();
