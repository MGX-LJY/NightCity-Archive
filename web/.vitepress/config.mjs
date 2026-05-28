import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitepress';
import { buildSidebar } from './sidebar.mjs';
import { buildWikilinkMap, wikilinkPlugin } from './wikilinks.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WEB_NODE_MODULES = path.resolve(__dirname, '..', 'node_modules');

const linkMap = buildWikilinkMap();
const sidebar = buildSidebar();

export default defineConfig({
  title: '夜之城档案库',
  description: 'Cyberpunk 2077 世界观 Wiki',
  lang: 'zh-CN',
  srcDir: '../content',
  cleanUrls: true,
  ignoreDeadLinks: true,

  vite: {
    // srcDir=../content 让 vite 默认 root 落到 content/，那里没有 node_modules，
    // 导致 dev optimizer 与 rollup 解析 vitepress 自身的 peer 依赖时全部失败。
    // 把 cacheDir 锁到 web/ 下，并显式 alias vue / vitepress 常用 peer，确保解析走 web/node_modules。
    cacheDir: path.resolve(__dirname, '..', 'node_modules', '.vite'),
    server: {
      host: true,
      fs: { allow: [path.resolve(__dirname, '..', '..')] },
    },
    resolve: {
      alias: [
        { find: /^vue\/(.*)$/, replacement: path.join(WEB_NODE_MODULES, 'vue', '$1') },
        { find: /^vue$/, replacement: path.join(WEB_NODE_MODULES, 'vue') },
        { find: '@vue/devtools-api', replacement: path.join(WEB_NODE_MODULES, '@vue', 'devtools-api') },
        { find: /^@vueuse\/core$/, replacement: path.join(WEB_NODE_MODULES, '@vueuse', 'core') },
        { find: /^@vueuse\/integrations\/(.*)$/, replacement: path.join(WEB_NODE_MODULES, '@vueuse', 'integrations', '$1') },
        { find: /^mark\.js\/(.*)$/, replacement: path.join(WEB_NODE_MODULES, 'mark.js', '$1') },
        { find: /^minisearch$/, replacement: path.join(WEB_NODE_MODULES, 'minisearch') },
      ],
    },
    ssr: {
      noExternal: ['vis-network', 'vis-data'],
    },
    build: {
      chunkSizeWarningLimit: 2000,
    },
  },

  rewrites: {
    '索引.md': 'index.md',
  },

  markdown: {
    breaks: true,
    config(md) {
      wikilinkPlugin(md, linkMap);
    },
  },

  themeConfig: {
    nav: [
      { text: '索引', link: '/' },
      { text: '人物', link: '/01_人物/00_主角与同伴/V' },
      { text: '公司', link: '/02_公司/荒坂' },
      { text: '事件', link: '/05_历史事件/第四次公司战争' },
      { text: '思想', link: '/07_思想主题/公司统治' },
      { text: '🕸 图谱', link: '/__网站/图谱' },
    ],
    sidebar,
    outline: { level: [2, 3], label: '本页目录' },
    search: {
      provider: 'local',
      options: {
        translations: {
          button: { buttonText: '搜索', buttonAriaLabel: '搜索' },
          modal: {
            displayDetails: '显示详情',
            resetButtonTitle: '清空',
            backButtonTitle: '返回',
            noResultsText: '未找到结果',
            footer: {
              selectText: '选择',
              navigateText: '切换',
              closeText: '关闭',
            },
          },
        },
      },
    },
    docFooter: { prev: '上一页', next: '下一页' },
    darkModeSwitchLabel: '深色模式',
    sidebarMenuLabel: '菜单',
    returnToTopLabel: '回到顶部',
    lastUpdatedText: '最后更新',
    notFound: {
      title: '页面走失在黑墙里',
      quote: '这个节点可能还没建立，或被网络监察清除了。',
      linkText: '回到索引',
    },
  },
});
