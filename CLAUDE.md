# wbw · Wait But Why 中译站

自用项目。把 Tim Urban 的长文抓下来翻成中文,VitePress 静态站,部署到 `wbw.fangs.cc`(GitHub Pages)。

## 用途边界

- **纯自用阅读**,不对外推广、不放广告、不接受投稿。
- 版权按"个人研究阅读"处理,每篇保留原文链接。任何面向公开传播的想法(SEO、社群、转发引流)都需要先跟我(imfangs)确认。

## 仓库身份 —— 关键

Git 提交 **必须** 用 `imfangs` / `mafangshuai@126.com`。绝不要用 sankuai(美团)邮箱或身份。

- 本仓库已 `git config user.email mafangshuai@126.com` / `user.name imfangs`(local scope,不动 global)
- 提交前如果不确定,`git config user.email` 检查一下
- commit message 里 **不要** 出现 `Co-Authored-By`、"Generated with Claude Code" 等 AI 标记(这条是全局规则,不止本仓库)

## 技术栈

- VitePress 1.6(参考同 monorepo 的 `novel/ai-novel`)
- TypeScript + tsx 跑脚本
- cheerio 解析 HTML,turndown 转 Markdown
- 翻译走本地 claude-code-router 配的美团 aigc 网关(OpenAI 兼容),模型 `aws.claude-opus-4.7`
  - Endpoint: `https://aigc.sankuai.com/v1/openai/native/chat/completions`
  - **Bedrock 上的 Opus 4.7 不接受 `temperature` 参数**,请求体里不能带

## 目录结构

```
wbw/
├── .vitepress/
│   ├── config.mts          # 站点配置,sidebar 从 sidebar.json 加载
│   ├── sidebar.json        # 由 build-sidebar.ts 生成,不要手编
│   └── theme/              # 深色阅读器风格,橙色 accent
├── posts/
│   ├── index.md            # "全部文章" 列表,由 build-sidebar.ts 生成
│   └── <slug>.md           # 每篇文章,含 frontmatter
├── public/
│   └── images/<slug>/      # 每篇文章的图片单独一目录
├── scripts/
│   ├── scrape.ts           # 抓 WBW 页面,下图,HTML→Markdown
│   ├── translate.ts        # 分块翻译 + translateTitle()
│   ├── build-post.ts       # 编排:scrape → translate → 写 md → rebuild sidebar
│   ├── build-sidebar.ts    # 扫 posts/ 生成 sidebar.json 和 index.md
│   └── .cache/             # 每篇的英文原文 md 和 meta,重翻不用重抓
├── deploy.sh               # 构建并推 gh-pages 分支
└── CNAME                   # 只在 gh-pages 分支上,由 deploy.sh 写入
```

## 常用命令

```bash
# 加一篇新文章(抓 + 翻 + 更新 sidebar,一条命令)
npm run build:post -- https://waitbutwhy.com/2015/05/elon-musk-the-worlds-raddest-man.html

# 只抓不翻(调试或想先看英文原文)
npm run build:post -- --en-only <url>

# 用缓存的英文重翻(改了 prompt 之后重跑,不用重抓图)
npm run build:post -- --skip-scrape <slug>

# 手动重建 sidebar(改了 frontmatter 后)
npm run rebuild:sidebar

# 本地预览
npm run docs:dev              # http://localhost:5173
npm run docs:build            # 构建到 .vitepress/dist

# 部署(会自动 build + push 到 gh-pages 分支,需要在 main 分支干净时执行)
./deploy.sh "deploy: 加马斯克系列"
```

## Frontmatter 约定

每篇 `posts/<slug>.md` 顶部:

```yaml
---
title: "The Fermi Paradox"          # 英文原标题(必填)
titleZh: "费米悖论"                  # 中文标题(可选,build-post.ts 会自动生成)
date: 2014-05-21
originalUrl: https://waitbutwhy.com/2014/05/fermi-paradox.html
slug: fermi-paradox
---
```

- 侧边栏和文章列表显示为 `${titleZh} · ${title}`(有 zh 时);无 zh 时只显示英文
- `build-sidebar.ts` 按 `date` 倒序排,没日期的排最后

## 翻译行为约束(prompt 层)

`SYSTEM_PROMPT` 里的关键规则,改的时候慎重(改动会影响所有后续文章):

1. Markdown 结构 1:1 保留(标题、列表、图片、链接、`---`)
2. 图片 `![...](...)` 原样保留,不要翻 alt
3. **保 Tim 的语气**:口语、自嘲、破折号、括号吐槽 —— 不要变学术翻译
4. 专有名词首次出现用「中文 (English)」,后续只用中文
5. 数字用阿拉伯,单位用中文(光年、亿、万亿)
6. 段落数对齐:输入几段,输出几段
7. 直出译文,不要 "以下是翻译" / 不要 markdown 代码块包整篇

## 部署 & 域名

- Repo: https://github.com/imfangs/wbw
- 站点: https://wbw.fangs.cc(gh-pages 分支)
- CNAME 由 `deploy.sh` 每次写入 gh-pages,不要手动删
- DNS: `wbw` CNAME → `imfangs.github.io`

## 常见坑

- **turndown 会把 `_____`(WBW 分隔符)转义成 `\_\_\_\_\_`**,scrape.ts 里已加正则替换成 `---`。改分隔符处理时记得留住这个 fix。
- **`--skip-scrape` 传 slug 时**,如果直接拼成 URL 会被再次 slug 化成错的名字。build-post.ts 的处理是:无 `://` 时从 `.cache/<slug>.meta.json` 读原始 URL。
- **Amazon 广告像素抓取失败**:非致命,scrape 里 try/catch 吞掉了,不用管。
- **Bedrock Opus 4.7 拒绝 `temperature`**:见上文,translate.ts 请求体里不能带这个字段。

## 待办 / 想到了再做

- 马斯克系列 4-5 篇(elon-musk-the-worlds-raddest-man / how-tesla-will-change-your-life / how-and-why-spacex-will-colonize-mars / hyperloop / neuralink)
- AI 系列 Part 2
- 拖延症 3 篇后续
- 未来某天:全文分段的中英对照阅读模式(目前是纯中文)
