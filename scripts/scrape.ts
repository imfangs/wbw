/**
 * 抓 WBW 单篇文章,提取标题 + 正文 markdown + 图片清单
 * 图片下载到 public/images/<slug>/
 */
import * as cheerio from 'cheerio'
import TurndownService from 'turndown'
import { mkdir, writeFile } from 'node:fs/promises'
import { createWriteStream } from 'node:fs'
import { pipeline } from 'node:stream/promises'
import { join, extname } from 'node:path'

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36'

export interface Scraped {
  slug: string
  title: string
  date?: string
  url: string
  markdown: string  // 英文原文 markdown
  imageCount: number
}

export function urlToSlug(url: string): string {
  // https://waitbutwhy.com/2014/05/fermi-paradox.html → fermi-paradox
  const m = url.match(/\/(\d{4})\/(\d{2})\/([^/]+?)(?:\.html)?(?:\/)?$/)
  if (m) return m[3]
  return url.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase()
}

async function downloadImage(imgUrl: string, destDir: string): Promise<string> {
  const res = await fetch(imgUrl, { headers: { 'User-Agent': UA, Referer: 'https://waitbutwhy.com/' } })
  if (!res.ok || !res.body) throw new Error(`下载图片失败 ${res.status}: ${imgUrl}`)
  const urlObj = new URL(imgUrl)
  let filename = urlObj.pathname.split('/').pop() || 'img'
  // 去掉查询串、保留扩展名
  if (!extname(filename)) {
    const ct = res.headers.get('content-type') || ''
    if (ct.includes('png')) filename += '.png'
    else if (ct.includes('webp')) filename += '.webp'
    else filename += '.jpg'
  }
  const dest = join(destDir, filename)
  await pipeline(res.body as any, createWriteStream(dest))
  return filename
}

export async function scrape(url: string, projectRoot: string): Promise<Scraped> {
  console.log(`[scrape] fetching ${url}`)
  const res = await fetch(url, { headers: { 'User-Agent': UA } })
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`)
  const html = await res.text()

  const $ = cheerio.load(html)
  const title = $('h1').first().text().trim() || $('meta[property="og:title"]').attr('content') || 'Untitled'
  const date = $('meta[property="article:published_time"]').attr('content')?.slice(0, 10)
  const slug = urlToSlug(url)

  const $content = $('.entry-content').first()
  if (!$content.length) throw new Error('找不到 .entry-content,WBW 页面结构可能变了')

  // 清理无关元素
  $content.find('script, style, .sharedaddy, .jp-relatedposts, #respond, .comments-area, .post-navigation, .entry-meta, .entry-author').remove()

  // 下载图片并替换 src 为本地路径
  const imageDir = join(projectRoot, 'public', 'images', slug)
  await mkdir(imageDir, { recursive: true })

  const imgs = $content.find('img').toArray()
  let downloaded = 0
  for (let i = 0; i < imgs.length; i++) {
    const $img = $(imgs[i])
    const src = $img.attr('data-src') || $img.attr('src')
    if (!src || src.startsWith('data:')) continue
    const absSrc = new URL(src, url).toString()
    try {
      const filename = await downloadImage(absSrc, imageDir)
      $img.attr('src', `/images/${slug}/${filename}`)
      $img.removeAttr('srcset')
      $img.removeAttr('data-src')
      $img.removeAttr('sizes')
      downloaded++
      process.stdout.write(`\r[scrape] images ${downloaded}/${imgs.length}`)
    } catch (e: any) {
      console.warn(`\n[scrape] 图片失败 ${absSrc}: ${e.message}`)
    }
  }
  if (imgs.length) process.stdout.write('\n')

  // HTML → Markdown
  const td = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
    bulletListMarker: '-',
    emDelimiter: '*',
  })
  // 保留换行段落语义,空段落跳过
  td.addRule('emptyP', {
    filter: (node) => node.nodeName === 'P' && !node.textContent?.trim() && !(node as any).querySelector?.('img'),
    replacement: () => '',
  })

  let markdown = td.turndown($content.html() || '')
  // WBW 用 _____ 长串下划线作分隔线,turndown 会转义成 \_\_\_,统一改成 markdown hr
  markdown = markdown.replace(/^\s*(\\_){3,}\s*$/gm, '---')
  markdown = markdown.replace(/^\s*_{3,}\s*$/gm, '---')
  markdown = markdown.replace(/\n{3,}/g, '\n\n').trim()

  if (markdown.length < 400) {
    const err = new Error(`content too short (${markdown.length} chars) — likely a meta/link page`) as Error & { code?: string }
    err.code = 'EMPTY_CONTENT'
    throw err
  }

  return { slug, title, date, url, markdown, imageCount: downloaded }
}

// CLI: tsx scripts/scrape.ts <url>
if (import.meta.url === `file://${process.argv[1]}`) {
  const url = process.argv[2]
  if (!url) { console.error('用法: tsx scripts/scrape.ts <wbw-url>'); process.exit(1) }
  const root = new URL('..', import.meta.url).pathname
  scrape(url, root).then(async (r) => {
    const out = join(root, 'scripts', '.cache', `${r.slug}.en.md`)
    await mkdir(join(root, 'scripts', '.cache'), { recursive: true })
    await writeFile(out, `# ${r.title}\n\n${r.markdown}\n`)
    console.log(`\n[scrape] ✓ ${r.title}`)
    console.log(`  slug: ${r.slug}`)
    console.log(`  date: ${r.date || '?'}`)
    console.log(`  images: ${r.imageCount}`)
    console.log(`  → ${out}`)
  }).catch((e) => { console.error(e); process.exit(1) })
}
