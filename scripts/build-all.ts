/**
 * 批处理:遍历 articles.ts,并发翻译缺失的文章
 *
 * 用法:
 *   tsx scripts/build-all.ts                     # 翻所有缺失,并发 4
 *   tsx scripts/build-all.ts --concurrency 2
 *   tsx scripts/build-all.ts --resume            # 只重跑 .cache/failed.json
 *   tsx scripts/build-all.ts --topic ai-tech     # 子集(冒烟测试)
 *   tsx scripts/build-all.ts --dry-run
 */
import { existsSync } from 'node:fs'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { ARTICLES, type Article, type Topic } from './articles.js'
import { buildOne } from './build-post.js'
import { rebuildSidebar } from './build-sidebar.js'

const ROOT = new URL('..', import.meta.url).pathname
const CACHE_DIR = join(ROOT, 'scripts', '.cache')
const FAIL_PATH = join(CACHE_DIR, 'failed.json')
const MAX_ATTEMPTS = 3

interface Failure { slug: string; url: string; attempts: number; lastError: string; at: string }

async function loadFailed(): Promise<Record<string, Failure>> {
  if (!existsSync(FAIL_PATH)) return {}
  try { return JSON.parse(await readFile(FAIL_PATH, 'utf-8')) } catch { return {} }
}

async function saveFailed(f: Record<string, Failure>) {
  await mkdir(CACHE_DIR, { recursive: true })
  const tmp = FAIL_PATH + '.tmp'
  await writeFile(tmp, JSON.stringify(f, null, 2))
  await writeFile(FAIL_PATH, JSON.stringify(f, null, 2))
}

const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms))

function isTransient(msg: string): boolean {
  return /(ECONNRESET|ETIMEDOUT|EAI_AGAIN|fetch failed|429|5\d\d|socket hang up|timeout)/i.test(msg)
}

interface RunResult {
  slug: string
  status: 'built' | 'exists' | 'skipped' | 'failed'
  reason?: string
  error?: string
  seconds?: number
}

async function runOne(a: Article, failed: Record<string, Failure>): Promise<RunResult> {
  const outPath = join(ROOT, 'posts', `${a.slug}.md`)
  if (existsSync(outPath)) return { slug: a.slug, status: 'exists' }
  if (a.skip) return { slug: a.slug, status: 'skipped', reason: a.skip }

  const t0 = Date.now()
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      await buildOne(a.url, { skipRebuildSidebar: true })
      delete failed[a.slug]
      await saveFailed(failed)
      return { slug: a.slug, status: 'built', seconds: Math.round((Date.now() - t0) / 1000) }
    } catch (e: any) {
      const msg = String(e?.message || e)
      const code = e?.code
      const nonRetriable = code === 'EMPTY_CONTENT' || /HTTP 404/i.test(msg) || /找不到.*entry-content/i.test(msg)
      if (attempt < MAX_ATTEMPTS && !nonRetriable && isTransient(msg)) {
        await sleep(2000 * Math.pow(2, attempt - 1)) // 2s, 4s
        continue
      }
      failed[a.slug] = {
        slug: a.slug, url: a.url, attempts: attempt,
        lastError: msg.slice(0, 500), at: new Date().toISOString(),
      }
      await saveFailed(failed)
      return { slug: a.slug, status: 'failed', error: msg.slice(0, 200), seconds: Math.round((Date.now() - t0) / 1000) }
    }
  }
  // unreachable
  return { slug: a.slug, status: 'failed', error: 'exceeded attempts' }
}

function pickFlag(args: string[], name: string): string | undefined {
  const i = args.indexOf(name)
  return i >= 0 ? args[i + 1] : undefined
}

async function main() {
  const args = process.argv.slice(2)
  const concurrency = Number(pickFlag(args, '--concurrency') ?? 4)
  const topicArg = pickFlag(args, '--topic') as Topic | undefined
  const resume = args.includes('--resume')
  const dryRun = args.includes('--dry-run')

  const failed = await loadFailed()

  let queue: Article[] = ARTICLES.filter(a => !a.skip)
  if (topicArg) queue = queue.filter(a => a.topic === topicArg)
  if (resume) queue = queue.filter(a => failed[a.slug])
  queue = queue.filter(a => !existsSync(join(ROOT, 'posts', `${a.slug}.md`)))

  const total = queue.length
  console.log(`[batch] queue=${total} concurrency=${concurrency}${topicArg ? ` topic=${topicArg}` : ''}${resume ? ' (resume)' : ''}`)
  if (dryRun) {
    for (const a of queue) console.log(`  ${a.date}  ${a.slug}`)
    return
  }
  if (total === 0) {
    console.log('[batch] 无待翻译文章')
    return
  }

  let doneCount = 0
  let succCount = 0
  let failCount = 0

  const shared = [...queue] // 共享队列
  const workers = Array.from({ length: concurrency }, async (_, wid) => {
    while (shared.length) {
      const a = shared.shift()
      if (!a) break
      const r = await runOne(a, failed)
      doneCount++
      if (r.status === 'built') succCount++
      else if (r.status === 'failed') failCount++
      const dt = r.seconds != null ? `${r.seconds}s` : '-'
      const line = `[${String(doneCount).padStart(2)}/${total}] ${r.status.padEnd(7)} ${a.slug.padEnd(48)} (${dt})${r.error ? `  ✗ ${r.error}` : ''}`
      console.log(line)
    }
  })
  await Promise.all(workers)

  console.log(`\n[batch] 完成:built=${succCount} failed=${failCount} total=${total}`)
  if (failCount > 0) console.log(`[batch] 失败详情:${FAIL_PATH}`)

  console.log('[batch] 重建 sidebar...')
  await rebuildSidebar(ROOT)
  console.log('[batch] ✓ 全部完成')
}

main().catch(e => { console.error('[batch] fatal:', e); process.exit(1) })
