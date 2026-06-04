// 找出"未被任何世界观节点(01-09,非 00_原始资料)正文引用"的原始资料文件。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONTENT = path.resolve(__dirname, '..', '..', 'content');
const RAW = path.join(CONTENT, '00_原始资料');

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

// 收集"引用方"= 非 00_原始资料、且非 索引.md 的节点正文中出现的所有 [[target]]
const referenced = new Set();
const LINK = /\[\[([^\]|#]+)(?:[|#][^\]]*)?\]\]/g;
for (const f of walk(CONTENT)) {
  if (f.startsWith(RAW)) continue;
  if (path.basename(f) === '索引.md') continue;
  const text = fs.readFileSync(f, 'utf8');
  let m;
  while ((m = LINK.exec(text))) referenced.add(m[1].trim());
}

// 原始资料文件
const rawFiles = walk(RAW).map((f) => ({
  name: path.basename(f, '.md'),
  rel: path.relative(RAW, f).replace(/\\/g, '/'),
}));

const orphans = rawFiles.filter((r) => !referenced.has(r.name));
const byFolder = {};
for (const o of orphans) {
  const folder = o.rel.split('/').slice(0, -1).join('/') || '(root)';
  (byFolder[folder] ||= []).push(o.name);
}

fs.writeFileSync(path.join(__dirname, '_orphans.json'), JSON.stringify(orphans, null, 0), 'utf8');
console.log(`原始资料总数 ${rawFiles.length}｜被节点引用 ${rawFiles.length - orphans.length}｜孤儿(无人引用) ${orphans.length}\n`);
for (const [folder, names] of Object.entries(byFolder).sort()) {
  console.log(`【${folder}】${names.length}`);
}
console.log('\n--- 孤儿明细 ---');
for (const [folder, names] of Object.entries(byFolder).sort()) {
  console.log(`\n# ${folder}`);
  for (const n of names.sort((a, b) => a.localeCompare(b, 'zh-Hans-CN'))) console.log(`  ${n}`);
}
