import { defineConfig } from 'vitepress';
import { buildSidebar } from './sidebar.mjs';
import { buildWikilinkMap, wikilinkPlugin } from './wikilinks.mjs';

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
    server: {
      host: true,
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
