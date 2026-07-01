/**
 * 扫 posts/*.md,join articles.ts 的分类,生成:
 * - .vitepress/sidebar.json    (按主题分组,同时挂 /archive/)
 * - posts/index.md             (扁平列表,按日期倒序)
 * - archive/index.md           (按年份 H2 分组,倒序)
 */
import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { ARTICLE_BY_SLUG, TOPIC_LABEL, TOPIC_ORDER, type Topic } from './articles.js'

interface Item {
  slug: string
  text: string           // 显示文本(中文 · English 或 English)
  link: string           // /posts/<slug>
  date: string           // YYYY-MM-DD
  titleEn: string
  titleZh?: string
  topic: Topic
}

function parseFrontmatter(md: string): Record<string, string> {
  const m = md.match(/^---\n([\s\S]*?)\n---/)
  if (!m) return {}
  const out: Record<string, string> = {}
  for (const line of m[1].split('\n')) {
    const km = line.match(/^(\w+):\s*(.*)$/)
    if (km) {
      let v = km[2].trim()
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1)
      }
      out[km[1]] = v
    }
  }
  return out
}

function displayText(titleZh: string | undefined, titleEn: string): string {
  return titleZh ? `${titleZh} · ${titleEn}` : titleEn
}

export async function rebuildSidebar(root: string) {
  const postsDir = join(root, 'posts')
  const files = (await readdir(postsDir)).filter(f => f.endsWith('.md') && f !== 'index.md')

  const items: Item[] = []
  for (const f of files) {
    const slug = f.replace(/\.md$/, '')
    const md = await readFile(join(postsDir, f), 'utf-8')
    const fm = parseFrontmatter(md)
    const registered = ARTICLE_BY_SLUG[slug]

    const titleEn = fm.title || registered?.title || slug
    const titleZh = fm.titleZh || undefined
    const date = fm.date || registered?.date || ''
    const topic: Topic = registered?.topic || 'misc'

    items.push({
      slug,
      text: displayText(titleZh, titleEn),
      link: `/posts/${slug}`,
      date,
      titleEn,
      titleZh,
      topic,
    })
  }

  // 按日期倒序
  const byDate = [...items].sort((a, b) => (b.date || '').localeCompare(a.date || ''))

  // 按主题分组,组内按日期倒序
  const groups: { topic: Topic; items: Item[] }[] = []
  for (const topic of TOPIC_ORDER) {
    const groupItems = byDate.filter(i => i.topic === topic)
    if (groupItems.length) groups.push({ topic, items: groupItems })
  }

  // 生成 sidebar JSON
  const topLinks = [
    { text: '全部', link: '/posts/' },
    { text: '归档', link: '/archive/' },
  ]
  const topicGroups = groups.map((g, idx) => ({
    text: TOPIC_LABEL[g.topic],
    collapsed: idx !== 0,   // 第一个组展开,其余折叠
    items: g.items.map(i => ({ text: i.text, link: i.link })),
  }))

  const sidebarShared = [...topLinks, ...topicGroups]
  const sidebar = {
    '/posts/': sidebarShared,
    '/archive/': sidebarShared,
  }

  await writeFile(
    join(root, '.vitepress', 'sidebar.json'),
    JSON.stringify(sidebar, null, 2) + '\n'
  )

  // posts/index.md — 扁平列表按日期倒序
  const listMd = [
    '# 全部文章',
    '',
    byDate.length
      ? byDate.map(i => `- [${i.text}](${i.link})${i.date ? ` · ${i.date}` : ''}`).join('\n')
      : '> 暂无文章',
    '',
  ].join('\n')
  await writeFile(join(postsDir, 'index.md'), listMd)

  // archive/index.md — 按年份 H2 分组,组内保持日期倒序
  await mkdir(join(root, 'archive'), { recursive: true })
  const byYear = new Map<string, Item[]>()
  for (const i of byDate) {
    const y = (i.date || '').slice(0, 4) || 'undated'
    if (!byYear.has(y)) byYear.set(y, [])
    byYear.get(y)!.push(i)
  }
  const years = [...byYear.keys()].sort((a, b) => b.localeCompare(a))
  const archiveLines: string[] = ['# 归档', '', `> 共 ${byDate.length} 篇`, '']
  for (const y of years) {
    archiveLines.push(`## ${y}`, '')
    for (const i of byYear.get(y)!) {
      archiveLines.push(`- [${i.text}](${i.link})${i.date ? ` · ${i.date}` : ''}`)
    }
    archiveLines.push('')
  }
  await writeFile(join(root, 'archive', 'index.md'), archiveLines.join('\n'))
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const root = new URL('..', import.meta.url).pathname
  await rebuildSidebar(root)
  console.log('✓ sidebar / posts/index.md / archive/index.md 已更新')
}
