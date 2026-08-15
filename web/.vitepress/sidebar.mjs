import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONTENT_DIR = path.resolve(__dirname, '..', '..', 'content');

const CATEGORY_LABELS = {
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

function collectRawDirectories(fullDir, relDir, result = []) {
  const files = listMarkdown(fullDir);
  if (files.length > 0) result.push({ fullDir, relDir, files });

  for (const sub of listSubdirs(fullDir)) {
    collectRawDirectories(
      path.join(fullDir, sub),
      `${relDir}/${sub}`,
      result,
    );
  }
  return result;
}

export function buildSidebar() {
  // 人物、公司、组织等主知识库规模适中，始终展示在侧栏中，允许用户
  // 在任意页面直接展开其他栏目。体量巨大的原始资料单独按文件夹映射。
  const mainSidebar = [
    { text: '原始资料', link: '/#原始资料' },
  ];
  for (const [cat, label] of Object.entries(CATEGORY_LABELS)) {
    const items = buildNode(path.join(CONTENT_DIR, cat), cat, 0);
    if (items.length === 0) continue;
    mainSidebar.push({
      text: label,
      collapsed: cat !== '01_人物',
      items,
    });
  }

  const sidebar = {};

  // 原始资料按最末级文件夹拆分，每页只显示同文件夹中的资料。
  // 路径较深的映射先插入，确保它们优先于 /00_原始资料/ 兜底项。
  const rawRoot = path.join(CONTENT_DIR, '00_原始资料');
  const rawDirs = collectRawDirectories(rawRoot, '00_原始资料')
    .sort((a, b) => b.relDir.length - a.relDir.length);
  for (const { relDir, files } of rawDirs) {
    sidebar[`/${relDir}/`] = [
      { text: '← 原始资料总索引', link: '/#原始资料' },
      {
        text: path.basename(relDir),
        collapsed: false,
        items: files.map((file) => toItem(file, relDir)),
      },
      { text: '← 返回主知识库', link: '/' },
    ];
  }
  sidebar['/00_原始资料/'] ??= [
    { text: '← 原始资料总索引', link: '/#原始资料' },
  ];

  // 所有非原始资料页面共用可跨栏目展开的完整主侧栏。
  sidebar['/'] = mainSidebar;
  return sidebar;
}

export function topLevelMarkdown() {
  return listMarkdown(CONTENT_DIR).filter((f) => !HIDE_TOPLEVEL_FILES.has(f));
}
