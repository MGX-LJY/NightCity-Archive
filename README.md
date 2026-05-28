# NightCity Archive · 夜之城档案库

《赛博朋克 2077》世界观数据库 —— 一份长期演化的 Obsidian 知识库 + 本地 VitePress Wiki。

目前收录 **548** 篇 md 节点，涵盖人物、公司、组织、科技、历史事件、地点、思想主题与原始资料。

---

## 项目结构

```
content/                Obsidian Vault(知识库主体, 用 Obsidian 直接打开此目录)
    00_原始资料/         芯片文本、新闻、对话、广播等一手素材
    01_人物/             V、强尼、朱迪、罗格、荒坂家族...
    02_公司/             荒坂、军用科技、生物动力、康陶...
    03_组织/             帮派、教派、地下势力
    04_科技/             义体、网际、武器、AI
    05_历史事件/         公司战争、DataKrash、夜之城起源
    06_地点/             夜之城各区、神秘地带
    07_思想主题/         公司统治、AI 与黑墙、数字永生、赛博精神病
    __网站/              VitePress 系统页(图谱等)
    索引.md              全库总索引

web/                    VitePress 站点(content 的可浏览前端)
    .vitepress/
        config.mjs       主配置(自动侧边栏、wikilinks 插件、Vue alias)
        sidebar.mjs      扫描 content/ 生成侧边栏
        wikilinks.mjs    [[wikilink]] 解析、反链与图谱数据
        theme/           Backlinks/LocalGraph/GlobalGraph 组件 + 配色

start.vbs               双击启动本地 Wiki(后台静默, 自动开浏览器)
stop.vbs                双击关闭本地 Wiki
```

## 维护原则(摘自 CLAUDE.md)

- **少建文件**：只有"高频引用 / 核心世界观 / 会持续扩展"的概念才独立成 md，其他写进已有节点的 `## 世界观意义`
- **优先更新已有文件**，不重复创建
- **原始资料**统一放 `00_原始资料/`，不做复杂拆分
- **思想主题**严格控制数量(目前只允许 `公司统治`/`AI与黑墙`/`数字永生`/`赛博精神病` 等核心设定独立成文)

完整规则见 [CLAUDE.md](./Claude.md) 与 [content/CLAUDE.md](./content/Claude.md)。

---

## 启动本地 Wiki

### 方式一(推荐) — 双击 `start.vbs`

后台静默启动 VitePress dev server, 自动打开浏览器到 http://localhost:5173/ 。
关闭用 `stop.vbs`。

### 方式二 — 命令行

```bash
cd web
npm install     # 首次或依赖丢失时
npm run dev     # 启动 dev server (http://localhost:5173)
npm run build   # 生成静态站到 web/.vitepress/dist/
```

要求 Node.js 18+(已在 Node 26 上验证)。

## 功能

- 全文搜索(VitePress local search)
- 反向链接(每个节点页底部, 自动从全库 wikilink 扫描)
- 局部关系图谱(节点页底部, 2 跳邻居, 力导向)
- 全局关系图谱(`🕸 图谱` 导航, 概览/ego 双模式 + 分类过滤 + 搜索)
- `[[wikilink]]` 直接编译为站内路由, 死链显示破损样式
- 侧边栏自动扫描 `content/`, 新增 md 无需改配置

## 仅本地使用

不提供线上部署。所有内容仅作个人世界观学习记录。

游戏版权归 CD Projekt Red 所有。
