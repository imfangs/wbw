/**
 * 分块翻译 Markdown,调本地 claude code router 配的 opus-4.7
 * 通过美团 aigc 网关,OpenAI 兼容格式
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'

const API_URL = 'https://aigc.sankuai.com/v1/openai/native/chat/completions'
const API_KEY = '1871380426032713734'
const MODEL = 'aws.claude-opus-4.7'

const SYSTEM_PROMPT = `你是把英文长文翻译成中文的专业译者。原文是 Wait But Why 网站的 Tim Urban 写的长文,以下是必须遵守的规则:

1. **保留 Markdown 结构**:标题层级、列表、引用、图片 \`![](...)\`、链接 \`[](url)\`、加粗斜体、分隔线 \`---\` 都必须 1:1 保留。
2. **图片占位**:遇到 \`![...](...)\` 直接原样保留,不要翻译 alt 文本(WBW 的 alt 经常是空的或文件名)。
3. **保留 Tim 的语气**:口语化、自嘲、夸张、破折号插入语 ——、括号吐槽 (像这样)。不要变成学术翻译。
4. **专有名词**:首次出现用「中文 (English)」格式,如「费米悖论 (Fermi Paradox)」、「卡尔达肖夫等级 (Kardashev Scale)」。后续只用中文。
5. **数字、单位、年份**:阿拉伯数字保留,单位用中文(光年、亿、万亿)。
6. **代码、引用块**:代码不翻译;引用块里的英文要翻译。
7. **直接输出译文**,不要加任何解释、前言、后记。不要 "以下是翻译"。不要 markdown 代码块包裹整篇。
8. **段落数对齐**:输入有多少段,输出就有多少段。`

interface ChatMsg { role: 'system' | 'user' | 'assistant'; content: string }

async function callModel(messages: ChatMsg[]): Promise<string> {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      max_tokens: 8000,
    }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`API ${res.status}: ${text.slice(0, 500)}`)
  }
  const data = await res.json() as any
  const content = data?.choices?.[0]?.message?.content
  if (!content) throw new Error(`API 响应没有 content: ${JSON.stringify(data).slice(0, 300)}`)
  return content.trim()
}

/**
 * 按段落分块,每块尽量 ~3000 字符(避免单次输出截断)
 * 边界一定要切在段落空行处,不破坏 markdown 结构
 */
function chunkMarkdown(md: string, maxChars = 3000): string[] {
  const paras = md.split(/\n\n+/)
  const chunks: string[] = []
  let cur = ''
  for (const p of paras) {
    if (cur && cur.length + p.length + 2 > maxChars) {
      chunks.push(cur)
      cur = p
    } else {
      cur = cur ? `${cur}\n\n${p}` : p
    }
  }
  if (cur) chunks.push(cur)
  return chunks
}

/** 翻译单行标题,返回简洁中文标题(不带解释、引号) */
export async function translateTitle(en: string): Promise<string> {
  const sys = `你是把英文文章标题翻译成简洁中文标题的译者。规则:
1. 只输出译文,不要引号、不要解释、不要"以下是"、不要标点结尾。
2. 保留常见专有名词的英文(如 AI, SpaceX, Tesla)或用「中文 (English)」格式。
3. 简洁,不超过 20 个中文字符,能反映原文精神。
4. 如果是系列文章,保留 "Part 1" / "Part 2" 这样的标识。`
  return callModel([
    { role: 'system', content: sys },
    { role: 'user', content: `翻译标题:${en}` },
  ]).then(s => s.replace(/^["「『]|["」』]$/g, '').trim())
}

export async function translate(markdown: string, opts?: { onProgress?: (i: number, total: number) => void }): Promise<string> {
  const chunks = chunkMarkdown(markdown)
  console.log(`[translate] ${chunks.length} 块`)
  const out: string[] = []
  for (let i = 0; i < chunks.length; i++) {
    opts?.onProgress?.(i, chunks.length)
    const zh = await callModel([
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: `请翻译以下内容:\n\n${chunks[i]}` },
    ])
    out.push(zh)
    process.stdout.write(`\r[translate] ${i + 1}/${chunks.length}`)
  }
  process.stdout.write('\n')
  return out.join('\n\n')
}

// CLI: tsx scripts/translate.ts <input.md> <output.md>
if (import.meta.url === `file://${process.argv[1]}`) {
  const [inFile, outFile] = process.argv.slice(2)
  if (!inFile || !outFile) { console.error('用法: tsx scripts/translate.ts <in.md> <out.md>'); process.exit(1) }
  const md = await readFile(inFile, 'utf-8')
  const zh = await translate(md)
  await mkdir(join(outFile, '..'), { recursive: true }).catch(() => {})
  await writeFile(outFile, zh)
  console.log(`✓ ${outFile}`)
}
