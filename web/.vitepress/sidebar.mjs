import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONTENT_DIR = path.resolve(__dirname, '..', '..', 'content');

const CATEGORY_LABELS = {
  '00_原始资料': '原始资料',
  '01_人物': '人物',
  '02_公司': '公司',
  '03_组织': '组织',
  '04_科技': '科技',
  '05_历史事件': '历史事件',
  '06_地点': '地点',
  '07_思想主题': '思想主题',
  '09_时间线': '时间线',
};

const HIDE_TOPLEVEL_FILES = new Set(['索引.md']);

function listMarkdown(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith('.md'))
    .map((e) => e.name)
    .sort((a, b) => a.localeCompare(b, 'zh-Hans-CN'));
}

function listSubdirs(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !e.name.startsWith('__') && !e.name.startsWith('.'))
    .map((e) => e.name)
    .sort((a, b) => a.localeCompare(b, 'zh-Hans-CN'));
}

function toItem(file, relDir) {
  const name = file.replace(/\.md$/, '');
  return { text: name, link: `/${relDir}${relDir ? '/' : ''}${name}` };
}

function buildNode(fullDir, relDir, depth) {
  const items = [];

  for (const file of listMarkdown(fullDir)) {
    items.push(toItem(file, relDir));
  }

  for (const sub of listSubdirs(fullDir)) {
    const subFull = path.join(fullDir, sub);
    const subRel = relDir ? `${relDir}/${sub}` : sub;
    const subChildren = buildNode(subFull, subRel, depth + 1);
    if (subChildren.length === 0) continue;
    items.push({
      text: sub,
      collapsed: true,
      items: subChildren,
    });
  }

  return items;
}

export function buildSidebar() {
  const sidebar = [];
  for (const [cat, label] of Object.entries(CATEGORY_LABELS)) {
    const items = buildNode(path.join(CONTENT_DIR, cat), cat, 0);
    if (items.length === 0) continue;
    sidebar.push({
      text: label,
      collapsed: cat !== '01_人物',
      items,
    });
  }
  return sidebar;
}

export function topLevelMarkdown() {
  return listMarkdown(CONTENT_DIR).filter((f) => !HIDE_TOPLEVEL_FILES.has(f));
}
