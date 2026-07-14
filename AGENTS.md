# Repository Guidelines

## Repository Layout

`content/` is the Cyberpunk 2077 Obsidian lore database. Its main categories are `00_原始资料/`, `01_人物/`, `02_公司/`, `03_组织/`, `04_科技/`, `05_历史事件/`, `06_地点/`, `07_思想主题/`, and `09_时间线/`. Treat `content/索引.md` as the authoritative node catalogue. Directories beginning with `__` are website system pages, not lore categories.

`web/` is a local VitePress presentation layer. Its `.vitepress/` directory contains configuration, wikilink handling, and theme components; `scripts/` contains maintenance tools. The website parses `content/` at build time—do not alter source notes merely to accommodate website code.

## Lore Maintenance Rules

Before adding **or updating** a lore node, read `content/索引.md`, then read the existing target file. Prefer extending an existing node; create a file only for a frequently referenced, core, or likely-to-grow concept. Add any legitimate new node to the appropriate index section and maintain relevant two-way `[[中文文件名]]` links.

Keep the wiki concise: do not split every detail into a node or create broad theme files. Put analysis such as consumerism or media critique under `## 世界观意义`; reserve `07_思想主题/` for core, reusable, long-term settings. Preserve raw text with minimal splitting under `content/00_原始资料/`.

For people, companies, and organizations, retain the established template and top-level heading order. Include a Chinese title, an English-name quote block, and `## 关联原始资料` (use `(暂无关联原始资料)` when empty). Use Chinese filenames and wikilinks; give English names or abbreviations only on first mention. Put detailed cases under `## 已知活动 / 深度档案` as `###` subsections rather than inventing top-level sections.

## Development and Validation

Run from `web/` with Node.js 18+:

```bash
npm install       # install dependencies
npm run dev       # run the local wiki at http://localhost:5173
npm run build     # validate a production build
npm run preview   # preview the build
```

After adding or renaming a node, use `npm run dev` to verify its route and links; fix misspelled wikilinks or alias handling if a link is dead. Run `npm run build` after frontend, configuration, or rendering changes. There is no automated test suite. Use 2-space indentation, semicolons, and camelCase for JavaScript/Vue changes.

## Commits and Pull Requests

Use focused Conventional Commit-style messages, e.g. `fix(web): 修复死链` or `content: 补充荒坂关系`. Describe affected nodes or UI behavior, link issues when relevant, report validation, and attach screenshots for visible site changes. Do not commit generated output or local scratch files.
