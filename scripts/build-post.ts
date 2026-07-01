/**
 * 一条命令:URL → 抓 → 翻 → 写 posts/<slug>.md → 更新 sidebar.json
 *
 * 用法:
 *   npm run build:post -- https://waitbutwhy.com/2014/05/fermi-paradox.html
 *   npm run build:post -- --en-only https://waitbutwhy.com/...   # 只抓英文,不翻译(调试用)
 *   npm run build:post -- --skip-scrape <slug>                   # 用缓存的英文重翻
 */
import { mkdir, writeFile, readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { scrape, urlToSlug, type Scraped } from './scrape.js'
import { translate, translateTitle } from './translate.js'
import { rebuildSidebar } from './build-sidebar.js'

const ROOT = new URL('..', import.meta.url).pathname

function frontmatter(meta: { title: string; titleZh?: string; date?: string; url: string; slug: string }) {
  const lines = [
    '---',
    `title: ${JSON.stringify(meta.title)}`,
    meta.titleZh ? `titleZh: ${JSON.stringify(meta.titleZh)}` : null,
    meta.date ? `date: ${meta.date}` : null,
    `originalUrl: ${meta.url}`,
    `slug: ${meta.slug}`,
    '---',
    '',
    '',
  ].filter(l => l !== null)
  return lines.join('\n')
}

async function buildOne(url: string, opts: { enOnly?: boolean; skipScrape?: boolean } = {}) {
  const cacheDir = join(ROOT, 'scripts', '.cache')
  await mkdir(cacheDir, { recursive: true })

  let scraped: Scraped
  const slug = urlToSlug(url)
  const enCachePath = join(cacheDir, `${slug}.en.md`)
  const metaCachePath = join(cacheDir, `${slug}.meta.json`)

  if (opts.skipScrape && existsSync(enCachePath) && existsSync(metaCachePath)) {
    console.log(`[build] 用缓存 ${slug}`)
    const meta = JSON.parse(await readFile(metaCachePath, 'utf-8'))
    const md = await readFile(enCachePath, 'utf-8')
    scraped = { ...meta, markdown: md.replace(/^# .+\n+/, '') }
  } else {
    scraped = await scrape(url, ROOT)
    await writeFile(enCachePath, `# ${scraped.title}\n\n${scraped.markdown}\n`)
    await writeFile(metaCachePath, JSON.stringify({
      slug: scraped.slug, title: scraped.title, date: scraped.date, url: scraped.url, imageCount: scraped.imageCount,
    }, null, 2))
  }

  if (opts.enOnly) {
    console.log(`[build] 仅抓取完成: ${enCachePath}`)
    return
  }

  console.log(`[build] 翻译标题...`)
  const titleZh = await translateTitle(scraped.title).catch(e => {
    console.warn(`[build] 标题翻译失败,跳过: ${e.message}`)
    return undefined
  })
  if (titleZh) console.log(`[build] 标题 zh: ${titleZh}`)

  console.log(`[build] 翻译正文...`)
  const zhBody = await translate(scraped.markdown)

  const displayTitle = titleZh ? `${titleZh} · ${scraped.title}` : scraped.title
  const finalMd =
    frontmatter({ title: scraped.title, titleZh, date: scraped.date, url: scraped.url, slug: scraped.slug }) +
    `# ${displayTitle}\n\n` +
    `> 原文:[${scraped.url}](${scraped.url})${scraped.date ? ` · ${scraped.date}` : ''}\n\n` +
    zhBody + '\n'

  const outPath = join(ROOT, 'posts', `${scraped.slug}.md`)
  await writeFile(outPath, finalMd)
  console.log(`[build] ✓ posts/${scraped.slug}.md`)

  await rebuildSidebar(ROOT)
  console.log(`[build] ✓ sidebar 已更新`)
}

const args = process.argv.slice(2)
const flags = new Set(args.filter(a => a.startsWith('--')))
const positional = args.filter(a => !a.startsWith('--'))

if (!positional.length) {
  console.error('用法: tsx scripts/build-post.ts [--en-only] [--skip-scrape] <url-or-slug> [<url> ...]')
  process.exit(1)
}

for (const arg of positional) {
  // --skip-scrape 时,arg 可以直接是 slug;否则要求是完整 URL
  let url = arg
  if (flags.has('--skip-scrape') && !arg.includes('://')) {
    // 直接从缓存读 meta 拿 url
    const metaPath = join(ROOT, 'scripts', '.cache', `${arg}.meta.json`)
    if (existsSync(metaPath)) {
      url = JSON.parse(await readFile(metaPath, 'utf-8')).url
    } else {
      console.error(`找不到缓存: ${metaPath}`)
      process.exit(1)
    }
  }
  await buildOne(url, { enOnly: flags.has('--en-only'), skipScrape: flags.has('--skip-scrape') })
}
