import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONTENT_DIR = path.resolve(__dirname, '..', '..', 'content');
const BACKLINK_PUBLIC_DIR = path.resolve(__dirname, '..', 'public', '__data', 'backlinks');

const SYSTEM_DIR_PREFIX = '__';

function walk(dir, root, out) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, root, out);
    } else if (entry.name.endsWith('.md')) {
      const slug = entry.name.replace(/\.md$/, '');
      const rel = path.relative(root, full).replace(/\\/g, '/');
      const urlPath = '/' + rel.replace(/\.md$/, '');
      const parts = rel.split('/');
      const category = parts.length > 1 ? parts[0] : '';
      const subcategory = parts.length > 2 ? parts[1] : '';
      out.push({ slug, fullPath: full, urlPath, category, subcategory });
    }
  }
}

export function scanContent() {
  const files = [];
  walk(CONTENT_DIR, CONTENT_DIR, files);

  const linkMap = new Map();
  for (const f of files) {
    if (!linkMap.has(f.slug)) linkMap.set(f.slug, f.urlPath);
  }

  const backlinks = {};
  const edgeMap = new Map();
  const weight = new Map();
  const WIKILINK = /\[\[([^\]|\n]+?)(?:\|([^\]\n]+))?\]\]/g;

  for (const f of files) {
    const text = fs.readFileSync(f.fullPath, 'utf8');
    const seenTargets = new Set();
    let m;
    WIKILINK.lastIndex = 0;
    while ((m = WIKILINK.exec(text)) !== null) {
      const target = m[1].trim();
      if (!target || target === f.slug) continue;
      const targetUrl = linkMap.get(target);
      if (!targetUrl) continue;

      const edgeKey = f.slug + '' + target;
      if (!edgeMap.has(edgeKey)) {
        edgeMap.set(edgeKey, { from: f.slug, to: target });
        weight.set(target, (weight.get(target) || 0) + 1);
      }

      if (seenTargets.has(target)) continue;
      seenTargets.add(target);

      const ctxStart = Math.max(0, m.index - 60);
      const ctxEnd = Math.min(text.length, m.index + m[0].length + 60);
      const snippet = text
        .slice(ctxStart, ctxEnd)
        .replace(/\r?\n+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      if (!backlinks[targetUrl]) backlinks[targetUrl] = [];
      backlinks[targetUrl].push({
        label: f.slug,
        path: f.urlPath,
        category: f.category,
        snippet,
      });
    }
  }

  for (const list of Object.values(backlinks)) {
    list.sort((a, b) => a.label.localeCompare(b.label, 'zh-Hans-CN'));
  }

  const nodes = files.map((f) => ({
    id: f.slug,
    label: f.slug,
    category: f.category,
    subcategory: f.subcategory,
    path: f.urlPath,
    weight: weight.get(f.slug) || 0,
  }));

  const edges = [...edgeMap.values()];

  return { linkMap, backlinks, graph: { nodes, edges } };
}

export function buildWikilinkMap() {
  return scanContent().linkMap;
}

export function writeBacklinkFiles(backlinks) {
  fs.mkdirSync(BACKLINK_PUBLIC_DIR, { recursive: true });
  for (const [urlPath, entries] of Object.entries(backlinks)) {
    const output = path.join(BACKLINK_PUBLIC_DIR, `${urlPath}.json`);
    fs.mkdirSync(path.dirname(output), { recursive: true });
    fs.writeFileSync(output, JSON.stringify(entries));
  }
}

export function wikilinkPlugin(md, linkMap) {
  md.inline.ruler.before('link', 'wikilink', (state, silent) => {
    const src = state.src;
    const pos = state.pos;
    if (src.charCodeAt(pos) !== 0x5B || src.charCodeAt(pos + 1) !== 0x5B) return false;
    const end = src.indexOf(']]', pos + 2);
    if (end === -1) return false;
    const inner = src.slice(pos + 2, end);
    if (inner.includes('\n') || inner.includes('[[')) return false;

    const [rawName, rawAlias] = inner.split('|');
    const name = (rawName || '').trim();
    const alias = (rawAlias || '').trim();
    if (!name) return false;

    if (!silent) {
      const target = linkMap.get(name);
      const label = alias || name;
      if (target) {
        const open = state.push('link_open', 'a', 1);
        open.attrs = [['href', target], ['class', 'wikilink']];
        const text = state.push('text', '', 0);
        text.content = label;
        state.push('link_close', 'a', -1);
      } else {
        const open = state.push('html_inline', '', 0);
        open.content = `<span class="wikilink-broken" title="未找到节点: ${name}">`;
        const text = state.push('text', '', 0);
        text.content = label;
        const close = state.push('html_inline', '', 0);
        close.content = '</span>';
      }
    }
    state.pos = end + 2;
    return true;
  });
}
