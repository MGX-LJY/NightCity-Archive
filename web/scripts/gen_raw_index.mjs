// 用"真实文件列表"为准，套用子代理生成的摘要钩子，重建 索引.md 的「原始资料」整段。
// 钩子来源：web/scripts/_hooks/<文件夹名>.txt（每行 `- [[文件名]]（钩子）`）
// 输出：覆盖 content/索引.md 的「## 原始资料」及之后全部内容；并打印差异报告。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');
const CONTENT = path.join(ROOT, 'content');
const CHIP = path.join(CONTENT, '00_原始资料', '芯片文本');
const HOOKS = path.join(__dirname, '_hooks');
const INDEX = path.join(CONTENT, '索引.md');

const collator = new Intl.Collator('zh-Hans-CN');

// 段结构：按原索引顺序。level: 3=###, 4=####。folder: 相对 芯片文本 的路径。hooks: _hooks 下文件名（不含.txt）。
const SECTIONS = [
  { level: 3, heading: '夜之城名录文本', folder: '夜之城名录文本', hooks: '夜之城名录文本' },
  { level: 3, heading: '笔记文本', folder: '笔记文本', hooks: '笔记文本' },
  { level: 3, heading: '宗教和哲学文本', folder: '宗教和哲学文本', hooks: '宗教和哲学文本' },
  { level: 3, heading: '科技文本', folder: '科技文本', hooks: '科技文本' },
  { level: 3, heading: '文献文本', folder: '文献文本', hooks: '文献文本' },
  { level: 3, heading: '其他文本', folder: null, hooks: null }, // 纯分组标题
  { level: 4, heading: '00_命令与委托', folder: '其他文本/00_命令与委托', hooks: '00_命令与委托' },
  { level: 4, heading: '01_笔记与报告', folder: '其他文本/01_笔记与报告', hooks: '01_笔记与报告' },
  { level: 4, heading: '02_文章与媒体', folder: '其他文本/02_文章与媒体', hooks: '02_文章与媒体' },
  { level: 4, heading: '03_对话-公司与执法', folder: '其他文本/03_对话-公司与执法', hooks: '03_对话-公司与执法' },
  { level: 4, heading: '04_对话-帮派内斗', folder: '其他文本/04_对话-帮派内斗', hooks: '04_对话-帮派内斗' },
  { level: 4, heading: '05_对话-街头与个人', folder: '其他文本/05_对话-街头与个人', hooks: '05_对话-街头与个人' },
  { level: 3, heading: '赛博精神病文本（NCPD 扫描器 / 街头档案）', folder: '赛博精神病文本', hooks: '赛博精神病文本' },
  { level: 3, heading: '传单文本', folder: '传单文本', hooks: '传单文本' },
  { level: 3, heading: '文章文本', folder: '文章文本', hooks: '文章文本' },
];

function listMd(dir) {
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith('.md'))
    .map((e) => e.name.replace(/\.md$/, ''));
}

function parseHooks(file) {
  const map = new Map();
  if (!fs.existsSync(file)) return map;
  const text = fs.readFileSync(file, 'utf8');
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^-\s*\[\[(.+?)\]\]（([\s\S]*?)）\s*$/);
    if (m) {
      const name = m[1].trim();
      if (!map.has(name)) map.set(name, m[2].trim()); // 首次出现为准，自动去重
    }
  }
  return map;
}

const out = ['## 原始资料', ''];
const report = [];
let total = 0, withHook = 0, noHook = 0, orphanHooks = 0;

for (const sec of SECTIONS) {
  out.push(`${'#'.repeat(sec.level)} ${sec.heading}`, '');
  if (!sec.folder) continue;

  const dir = path.join(CHIP, sec.folder);
  const files = listMd(dir).sort(collator.compare);
  const hooks = parseHooks(path.join(HOOKS, `${sec.hooks}.txt`));

  const missing = [];
  for (const name of files) {
    total++;
    const hook = hooks.get(name);
    if (hook) {
      withHook++;
      out.push(`- [[${name}]]（${hook}）`);
    } else {
      noHook++;
      missing.push(name);
      out.push(`- [[${name}]]`);
    }
  }
  out.push('');

  const fileSet = new Set(files);
  const orphans = [...hooks.keys()].filter((k) => !fileSet.has(k));
  orphanHooks += orphans.length;
  report.push({ heading: sec.heading, files: files.length, missing, orphans });
}

// 重写 索引.md：保留「## 原始资料」之前的全部内容
const idx = fs.readFileSync(INDEX, 'utf8');
const pos = idx.indexOf('## 原始资料');
if (pos < 0) throw new Error('索引.md 未找到「## 原始资料」');
const head = idx.slice(0, pos).replace(/\s+$/, '\n\n');
fs.writeFileSync(INDEX, head + out.join('\n').replace(/\n+$/, '\n'), 'utf8');

// 报告
console.log(`总文件 ${total}｜有钩子 ${withHook}｜缺钩子 ${noHook}｜钩子无对应文件 ${orphanHooks}\n`);
for (const r of report) {
  if (r.missing.length || r.orphans.length) {
    console.log(`【${r.heading}】文件 ${r.files}`);
    if (r.missing.length) console.log(`  缺钩子(${r.missing.length}): ${r.missing.join(' / ')}`);
    if (r.orphans.length) console.log(`  钩子无文件(${r.orphans.length}): ${r.orphans.join(' / ')}`);
  }
}
