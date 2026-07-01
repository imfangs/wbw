/**
 * 扫 posts/*.md,根据 frontmatter 生成 .vitepress/sidebar.json
 * 按日期倒序
 */
import { readdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

interface Item { text: string; link: string; date?: string; titleEn?: string; titleZh?: string }

function displayText(fm: Record<string, string>, slug: string): string {
  const zh = fm.titleZh?.trim()
  const en = fm.title?.trim() || slug
  if (zh) return `${zh} · ${en}`
  return en
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

export async function rebuildSidebar(root: string) {
  const postsDir = join(root, 'posts')
  const files = (await readdir(postsDir)).filter(f => f.endsWith('.md') && f !== 'index.md')

  const items: Item[] = []
  for (const f of files) {
    const slug = f.replace(/\.md$/, '')
    const md = await readFile(join(postsDir, f), 'utf-8')
    const fm = parseFrontmatter(md)
    items.push({
      text: displayText(fm, slug),
      link: `/posts/${slug}`,
      date: fm.date,
      titleEn: fm.title,
      titleZh: fm.titleZh,
    })
  }

  items.sort((a, b) => (b.date || '').localeCompare(a.date || ''))

  const sidebar = {
    '/posts/': [
      {
        text: '文章',
        items: [
          { text: '全部', link: '/posts/' },
          ...items.map(i => ({ text: i.text, link: i.link })),
        ],
      },
    ],
  }

  await writeFile(join(root, '.vitepress', 'sidebar.json'), JSON.stringify(sidebar, null, 2) + '\n')

  // 同时更新 posts/index.md 的列表
  const listMd = [
    '# 全部文章',
    '',
    items.length ? items.map(i => `- [${i.text}](${i.link})${i.date ? ` · ${i.date}` : ''}`).join('\n') : '> 暂无文章',
    '',
  ].join('\n')
  await writeFile(join(postsDir, 'index.md'), listMd)
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const root = new URL('..', import.meta.url).pathname
  await rebuildSidebar(root)
  console.log('✓ sidebar 已更新')
}
