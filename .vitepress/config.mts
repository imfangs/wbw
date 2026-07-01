import { defineConfig } from 'vitepress'
import sidebar from './sidebar.json' with { type: 'json' }

export default defineConfig({
  lang: 'zh-CN',
  title: 'Wait But Why · 中译',
  description: 'Tim Urban 长文中文翻译,自用',
  base: '/',
  ignoreDeadLinks: [
    // Cloudflare email 保护链接 (原文里的 mailto 被 CF 换成这个 URL)
    /^\/cdn-cgi\//,
  ],

  head: [
    ['link', { rel: 'preconnect', href: 'https://fonts.googleapis.com' }],
    ['link', { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' }],
    ['link', { href: 'https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;600;700&family=Inter:wght@400;600;700&display=swap', rel: 'stylesheet' }],
  ],

  themeConfig: {
    nav: [
      { text: '首页', link: '/' },
      { text: '全部文章', link: '/posts/' },
      { text: '归档', link: '/archive/' },
    ],

    sidebar: sidebar as any,

    search: {
      provider: 'local',
      options: {
        translations: {
          button: { buttonText: '搜索', buttonAriaLabel: '搜索' },
          modal: {
            noResultsText: '没有找到结果',
            resetButtonTitle: '清除查询条件',
            footer: { selectText: '选择', navigateText: '切换', closeText: '关闭' },
          },
        },
      },
    },

    outline: { label: '本页目录', level: [2, 3] },
    docFooter: { prev: '上一篇', next: '下一篇' },
    darkModeSwitchLabel: '主题',
    sidebarMenuLabel: '菜单',
    returnToTopLabel: '返回顶部',
    lastUpdated: { text: '最后翻译' },
  },
})
