// 把孤儿原始资料按 _map.txt 的映射，带摘要钩子追加到各目标节点的「## 关联原始资料」段。
// 无该段的节点：在「## 世界观意义」前(否则 ## Tags 前/文末)新建一个。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONTENT = path.resolve(__dirname, '..', '..', 'content');
const RAW = path.join(CONTENT, '00_原始资料');
const HOOKS = path.join(__dirname, '_hooks');

function walk(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name.startsWith('__') || e.name.startsWith('.')) continue;
      walk(p, acc);
    } else if (e.name.endsWith('.md')) acc.push(p);
  }
  return acc;
}

// 节点 basename -> 路径（排除原始资料、索引）
const nodeFiles = new Map();
for (const f of walk(CONTENT)) {
  if (f.startsWith(RAW)) continue;
  if (path.basename(f) === '索引.md') continue;
  nodeFiles.set(path.basename(f, '.md'), f);
}

// 钩子 name -> hook
const hooks = new Map();
for (const hf of fs.readdirSync(HOOKS)) {
  if (!hf.endsWith('.txt')) continue;
  for (const line of fs.readFileSync(path.join(HOOKS, hf), 'utf8').split(/\r?\n/)) {
    const m = line.match(/^-\s*\[\[(.+?)\]\]（([\s\S]*?)）\s*$/);
    if (m && !hooks.has(m[1].trim())) hooks.set(m[1].trim(), m[2].trim());
  }
}

// 解析映射，按节点归并
const byNode = new Map();
const unknownNodes = new Map();
for (const line of fs.readFileSync(path.join(__dirname, '_map.txt'), 'utf8').split(/\r?\n/)) {
  const m = line.match(/^(.+?)\s*\|\|\|\s*(.+?)\s*$/);
  if (!m) continue;
  const [, orphan, node] = m;
  if (!nodeFiles.has(node)) {
    (unknownNodes.get(node) || unknownNodes.set(node, []).get(node)).push(orphan);
    continue;
  }
  (byNode.get(node) || byNode.set(node, []).get(node)).push(orphan.trim());
}

function bulletFor(orphan) {
  const h = hooks.get(orphan);
  return h ? `- [[${orphan}]]（${h}）` : `- [[${orphan}]]`;
}

let updated = 0, appended = 0, created = 0;
for (const [node, orphans] of byNode) {
  const file = nodeFiles.get(node);
  let text = fs.readFileSync(file, 'utf8');

  // 去掉已存在于本文件的（避免重复）
  const present = new Set([...text.matchAll(/\[\[([^\]|#]+)(?:[|#][^\]]*)?\]\]/g)].map((m) => m[1].trim()));
  const fresh = orphans.filter((o, i) => orphans.indexOf(o) === i && !present.has(o));
  if (!fresh.length) continue;
  const bullets = fresh.map(bulletFor).join('\n');

  const headRe = /\n## 关联原始资料[^\n]*\n/;
  const hm = text.match(headRe);
  if (hm) {
    const secStart = hm.index + hm[0].length;
    const after = text.slice(secStart);
    const nextH = after.search(/\n## /);
    const secEnd = nextH < 0 ? text.length : secStart + nextH;
    let body = text.slice(secStart, secEnd);
    body = body.replace(/^\s*[\(（]暂无[^\n]*\n?/m, ''); // 去掉占位行
    const trimmed = body.replace(/\s+$/, '');
    const newBody = (trimmed ? trimmed + '\n' : '') + bullets + '\n' + (nextH < 0 ? '' : '\n');
    text = text.slice(0, secStart) + newBody + text.slice(secEnd).replace(/^\n+/, '');
    appended += fresh.length;
  } else {
    const block = `\n## 关联原始资料\n\n${bullets}\n`;
    let anchor = text.search(/\n## 世界观意义/);
    if (anchor < 0) anchor = text.search(/\n## Tags/);
    if (anchor < 0) {
      text = text.replace(/\s*$/, '\n') + block;
    } else {
      text = text.slice(0, anchor) + block + text.slice(anchor);
    }
    created++;
    appended += fresh.length;
  }
  fs.writeFileSync(file, text, 'utf8');
  updated++;
  console.log(`  ${node}  +${fresh.length}`);
}

console.log(`\n更新节点 ${updated}（其中新建关联原始资料段 ${created}）｜追加链接 ${appended}`);
if (unknownNodes.size) {
  console.log(`\n未找到的目标节点（这些孤儿未挂靠）:`);
  for (const [n, list] of unknownNodes) console.log(`  [${n}] ← ${list.join(' / ')}`);
}
