/**
 * 给 posts/*.md 里没有 titleZh 的文章补上中文标题
 * 只改 frontmatter 和文档一级标题,不动正文
 *
 * 用法: tsx scripts/backfill-title-zh.ts
 */
import { readdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { translateTitle } from './translate.js'
import { rebuildSidebar } from './build-sidebar.js'

const ROOT = new URL('..', import.meta.url).pathname

function parseFm(md: string): { fm: Record<string, string>; body: string; fmRaw: string } {
  const m = md.match(/^(---\n([\s\S]*?)\n---\n)([\s\S]*)$/)
  if (!m) return { fm: {}, body: md, fmRaw: '' }
  const fm: Record<string, string> = {}
  for (const line of m[2].split('\n')) {
    const km = line.match(/^(\w+):\s*(.*)$/)
    if (km) {
      let v = km[2].trim()
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1)
      }
      fm[km[1]] = v
    }
  }
  return { fm, body: m[3], fmRaw: m[1] }
}

function stringifyFm(fm: Record<string, string>): string {
  const order = ['title', 'titleZh', 'date', 'originalUrl', 'slug']
  const lines = ['---']
  for (const k of order) {
    if (fm[k] === undefined) continue
    if (k === 'title' || k === 'titleZh' || k === 'originalUrl') {
      lines.push(`${k}: ${JSON.stringify(fm[k])}`)
    } else {
      lines.push(`${k}: ${fm[k]}`)
    }
  }
  // 保留任何未在 order 里出现的 key(以防以后加了新字段)
  for (const k of Object.keys(fm)) {
    if (!order.includes(k)) lines.push(`${k}: ${JSON.stringify(fm[k])}`)
  }
  lines.push('---', '')
  return lines.join('\n')
}

async function run() {
  const postsDir = join(ROOT, 'posts')
  const files = (await readdir(postsDir)).filter(f => f.endsWith('.md') && f !== 'index.md')

  for (const f of files) {
    const p = join(postsDir, f)
    const md = await readFile(p, 'utf-8')
    const { fm, body } = parseFm(md)

    if (fm.titleZh) {
      console.log(`[skip] ${f} (已有 titleZh: ${fm.titleZh})`)
      continue
    }
    if (!fm.title) {
      console.log(`[skip] ${f} (无 title)`)
      continue
    }

    console.log(`[translate] ${f} <- "${fm.title}"`)
    const zh = await translateTitle(fm.title)
    console.log(`  -> ${zh}`)
    fm.titleZh = zh

    // 替换 body 里的一级标题:# xxx  或已有 # 中文 · English
    const displayTitle = `${zh} · ${fm.title}`
    const newBody = body.replace(/^# .+$/m, `# ${displayTitle}`)

    const newMd = stringifyFm(fm) + '\n' + newBody
    await writeFile(p, newMd)
  }

  await rebuildSidebar(ROOT)
  console.log('[done] sidebar 已重建')
}

run().catch(e => { console.error(e); process.exit(1) })
