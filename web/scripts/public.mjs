/**
 * 公网常驻服务：生产构建 + 静态预览 + content/ 自动重建。
 *
 * 公网不直接使用 Vite 开发服务。开发服务会输出数百个未打包模块，
 * 经 FRP 访问时首屏极慢。这里对外提供打包后的 dist，并在内容变化后
 * 构建到临时目录，成功后原子替换正式目录。
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WEB_DIR = path.resolve(__dirname, '..');
const CONTENT_DIR = path.resolve(WEB_DIR, '..', 'content');
const VITEPRESS_ENTRY = path.join(
  WEB_DIR, 'node_modules', 'vitepress', 'bin', 'vitepress.js',
);
const DIST_DIR = path.join(WEB_DIR, '.vitepress', 'dist');
const NEXT_DIR = path.join(WEB_DIR, '.vitepress', 'dist-next');
const PREVIOUS_DIR = path.join(WEB_DIR, '.vitepress', 'dist-previous');
const ASSET_MANIFEST = '.nca-current-assets.json';
const DEBOUNCE_MS = 1500;
const FINDER_DUPLICATE_ASSET = / \d+\.(?:js|css|map|png|jpe?g|webp|svg|gif|woff2?|ttf|ico)$/i;

let preview = null;
let build = null;
let rebuildTimer = null;
let rebuildAgain = false;
let shuttingDown = false;

function listFiles(root, dir = root, result = []) {
  if (!fs.existsSync(dir)) return result;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) listFiles(root, full, result);
    else result.push(path.relative(root, full));
  }
  return result;
}

function retainedAssets(distDir) {
  const manifest = path.join(distDir, ASSET_MANIFEST);
  try {
    const entries = JSON.parse(fs.readFileSync(manifest, 'utf8'));
    if (Array.isArray(entries)) return entries;
  } catch {
    // 首次升级没有清单时，将当前构建视为需要保留的一代。
  }
  return listFiles(path.join(distDir, 'assets'));
}

function preservePreviousAssets(nextDir, currentDir) {
  const nextAssets = path.join(nextDir, 'assets');
  const currentAssets = path.join(currentDir, 'assets');
  const currentBuildAssets = listFiles(nextAssets);

  for (const relative of retainedAssets(currentDir)) {
    // Finder/iCloud conflict copies such as `chunk.hash 2.js` are not emitted
    // by VitePress and may be cloud placeholders that cannot be copied.
    if (FINDER_DUPLICATE_ASSET.test(relative)) continue;
    const source = path.join(currentAssets, relative);
    const destination = path.join(nextAssets, relative);
    if (!fs.existsSync(source) || fs.existsSync(destination)) continue;
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    try {
      fs.copyFileSync(source, destination);
    } catch (error) {
      // A stale asset must never prevent a fresh build from going live. Old
      // HTML is short-lived and will fetch the new hashed assets on refresh.
      console.warn(`[public] 跳过无法保留的旧资源：${relative} (${error.code || error.message})`);
    }
  }

  fs.writeFileSync(
    path.join(nextDir, ASSET_MANIFEST),
    JSON.stringify(currentBuildAssets),
  );
}

function runBuild() {
  if (build) {
    rebuildAgain = true;
    return;
  }

  fs.rmSync(NEXT_DIR, { recursive: true, force: true });
  console.log(`[public] 开始构建：${new Date().toISOString()}`);
  build = spawn(process.execPath, [VITEPRESS_ENTRY, 'build', '--outDir', NEXT_DIR], {
    cwd: WEB_DIR,
    stdio: 'inherit',
    env: process.env,
  });

  build.on('exit', (code, signal) => {
    build = null;
    if (code === 0 && fs.existsSync(path.join(NEXT_DIR, 'index.html'))) {
      // 保留上一版带 hash 的静态资源。浏览器若恰好在发布切换时拿到旧 HTML，
      // 仍能加载对应脚本完成 hydration，避免侧边栏和按钮集体失效。
      preservePreviousAssets(NEXT_DIR, DIST_DIR);
      fs.rmSync(PREVIOUS_DIR, { recursive: true, force: true });
      if (fs.existsSync(DIST_DIR)) fs.renameSync(DIST_DIR, PREVIOUS_DIR);
      fs.renameSync(NEXT_DIR, DIST_DIR);
      fs.rm(PREVIOUS_DIR, { recursive: true, force: true }, () => {});
      console.log(`[public] 发布完成：${new Date().toISOString()}`);
    } else {
      fs.rmSync(NEXT_DIR, { recursive: true, force: true });
      console.error(`[public] 构建失败 code=${code} signal=${signal}，继续提供上一版本`);
    }

    if (rebuildAgain && !shuttingDown) {
      rebuildAgain = false;
      runBuild();
    }
  });
}

function scheduleBuild(filename) {
  if (rebuildTimer) clearTimeout(rebuildTimer);
  rebuildTimer = setTimeout(() => {
    rebuildTimer = null;
    console.log(`[public] 检测到内容变化：${filename || 'unknown'}`);
    runBuild();
  }, DEBOUNCE_MS);
}

function startPreview() {
  preview = spawn(
    process.execPath,
    [VITEPRESS_ENTRY, 'preview', '--host', '0.0.0.0', '--port', '5173', '--strictPort'],
    { cwd: WEB_DIR, stdio: 'inherit', env: process.env },
  );
  preview.on('exit', (code, signal) => {
    preview = null;
    if (!shuttingDown) {
      console.error(`[public] 静态服务退出 code=${code} signal=${signal}`);
      process.exit(code || 1);
    }
  });
}

if (!fs.existsSync(path.join(DIST_DIR, 'index.html'))) {
  console.error('[public] 缺少生产构建，请先运行 npm run build');
  process.exit(1);
}

startPreview();
fs.watch(CONTENT_DIR, { recursive: true, persistent: true }, (_event, filename) => {
  if (!filename || filename.startsWith('.') || filename.includes(`${path.sep}.`)) return;
  scheduleBuild(filename);
});
console.log('[public] 监听 content/，变更后自动构建并发布');

for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
  process.on(signal, () => {
    shuttingDown = true;
    if (rebuildTimer) clearTimeout(rebuildTimer);
    if (build) build.kill('SIGTERM');
    if (preview) preview.kill('SIGTERM');
    setTimeout(() => process.exit(0), 1000).unref();
  });
}
