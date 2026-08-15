# NightCity Archive · 夜之城档案库

《赛博朋克 2077》世界观数据库 —— 一份长期演化的 Obsidian 知识库，以及本地维护、自动发布到公网的 VitePress Wiki。

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
    scripts/
        public.mjs       公网常驻服务、内容监听与原子发布脚本

start.vbs               双击启动本地 Wiki(后台静默, 自动开浏览器)
stop.vbs                双击关闭本地 Wiki
```

## 维护原则(摘自 CLAUDE.md)

- **少建文件**：只有"高频引用 / 核心世界观 / 会持续扩展"的概念才独立成 md，其他写进已有节点的 `## 世界观意义`
- **优先更新已有文件**，不重复创建
- **原始资料**统一放 `00_原始资料/`，不做复杂拆分
- **思想主题**严格控制数量(目前只允许 `公司统治`/`AI与黑墙`/`数字永生`/`赛博精神病` 等核心设定独立成文)

完整规则见 [Claude.md](./Claude.md)。

---

## 本地开发预览

### 方式一(推荐) — 双击 `start.vbs`

后台静默启动 VitePress dev server, 自动打开浏览器到 http://localhost:5173/ 。
关闭用 `stop.vbs`。

### 方式二 — 命令行

```bash
cd web
npm install     # 首次或依赖丢失时
npm run dev     # 启动 dev server (http://localhost:5173)
npm run build   # 生成静态站到 web/.vitepress/dist/
npm run preview # 预览已经生成的生产版本
```

要求 Node.js 18+(已在 Node 26 上验证)。

## 功能

- 全文搜索(VitePress local search)
- 反向链接(每个节点页底部, 自动从全库 wikilink 扫描)
- 局部关系图谱(节点页底部, 2 跳邻居, 力导向)
- 全局关系图谱(`🕸 图谱` 导航, 概览/ego 双模式 + 分类过滤 + 搜索)
- `[[wikilink]]` 直接编译为站内路由, 死链显示破损样式
- 侧边栏自动扫描 `content/`, 新增 md 无需改配置

## 公网自动发布

公网地址：<https://wiki.mgxnet.com>

站点不使用 Docker，而是由本机 VitePress 生产构建提供，并由 macOS `launchd` 常驻管理。`web/scripts/public.mjs` 会监听 `content/`；Markdown 新增、修改、删除或重命名后自动重新构建，构建成功再原子替换公网版本，构建失败时继续提供上一版本。

客户端使用浏览器标准 HTTP 缓存；带版本哈希的静态资源可安全复用，HTML 每次访问都会向服务器重新验证。旧版 Service Worker 会在更新后自动清理缓存并注销，避免跨版本 HTML 与脚本混用。

- 本地服务：`http://192.168.31.4:5173`
- 公网链路：DNSPod → 腾讯云入口 → FRP → Nginx Proxy Manager → 本机 VitePress
- 自动发布脚本：`web/scripts/public.mjs`
- LaunchAgent：`~/Library/LaunchAgents/com.mgxnet.nightcity-archive.plist`
- 标准日志：`~/Library/Logs/nightcity-archive.log`
- 错误日志：`~/Library/Logs/nightcity-archive.error.log`

常用管理命令：

```bash
# 前台运行，适合排查构建或发布问题
cd web
npm run public

# 重启、查看后台常驻服务
launchctl kickstart -k gui/$(id -u)/com.mgxnet.nightcity-archive
launchctl print gui/$(id -u)/com.mgxnet.nightcity-archive

# 查看最近日志
tail -n 100 ~/Library/Logs/nightcity-archive.log
tail -n 100 ~/Library/Logs/nightcity-archive.error.log
```

Git 仍用于内容版本历史和备份，但公网更新不依赖提交或推送。内容保存后会自动触发构建，通常在约一分钟内发布。

### 公网页面一直加载时

公网服务必须运行生产构建，不能把 VitePress dev server 直接暴露到 FRP 链路。先依次确认本地服务、LaunchAgent 和公网入口：

```bash
curl -I http://192.168.31.4:5173
launchctl print gui/$(id -u)/com.mgxnet.nightcity-archive
curl -I https://wiki.mgxnet.com
```

如果本地 `5173` 无响应，执行上面的 `launchctl kickstart`；如果日志显示某篇 Markdown 构建失败，修复内容后保存，监听器会再次自动构建。Docker 部署仅作为备选方案，见 [DOCKER.md](./DOCKER.md)。

游戏版权归 CD Projekt Red 所有。
