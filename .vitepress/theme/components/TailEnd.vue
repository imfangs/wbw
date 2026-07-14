<script setup lang="ts">
import { ref, computed, reactive, onMounted, watch } from 'vue'

type EventCard = {
  id: string
  emoji: string
  name: string
  perYear: number
  anchor: 'self' | 'parent'
}

const STORAGE_KEY = 'wbw-tail-end-v1'

const age = ref<number>(30)
const lifespan = ref<number>(85)
const parentAge = ref<number>(60)
const parentLifespan = ref<number>(85)

const defaultCards = (): EventCard[] => [
  { id: 'parents', emoji: '👨‍👩‍👧', name: '和爸妈相聚', perYear: 6, anchor: 'parent' },
  { id: 'spring', emoji: '🧧', name: '过一个春节', perYear: 1, anchor: 'self' },
  { id: 'travel', emoji: '✈️', name: '出国旅行', perYear: 1, anchor: 'self' },
  { id: 'books', emoji: '📚', name: '读一本书', perYear: 12, anchor: 'self' },
  { id: 'movies', emoji: '🎬', name: '走进电影院', perYear: 6, anchor: 'self' },
  { id: 'sakura', emoji: '🌸', name: '看一次樱花', perYear: 1, anchor: 'self' },
  { id: 'seaswim', emoji: '🌊', name: '下海游泳', perYear: 1, anchor: 'self' },
  { id: 'gathering', emoji: '🍻', name: '和老友聚会', perYear: 4, anchor: 'self' },
]

const cards = reactive<EventCard[]>(defaultCards())
const editingId = ref<string | null>(null)
const settingsOpen = ref<boolean>(false)

// —— 持久化 ——
onMounted(() => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const saved = JSON.parse(raw)
      if (typeof saved.age === 'number') age.value = saved.age
      if (typeof saved.lifespan === 'number') lifespan.value = saved.lifespan
      if (typeof saved.parentAge === 'number') parentAge.value = saved.parentAge
      if (typeof saved.parentLifespan === 'number') parentLifespan.value = saved.parentLifespan
      if (Array.isArray(saved.cards) && saved.cards.length > 0) {
        cards.splice(0, cards.length, ...saved.cards)
      }
    }
  } catch {}
})

watch([age, lifespan, parentAge, parentLifespan, cards], () => {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        age: age.value,
        lifespan: lifespan.value,
        parentAge: parentAge.value,
        parentLifespan: parentLifespan.value,
        cards,
      }),
    )
  } catch {}
}, { deep: true })

// —— 计算 ——
const yearsLeft = computed(() => Math.max(0, lifespan.value - age.value))
const yearsPassed = computed(() => Math.max(0, age.value))
const lifePercent = computed(() =>
  Math.min(100, Math.round((yearsPassed.value / lifespan.value) * 100)),
)

const parentYearsLeft = computed(() =>
  Math.max(0, Math.min(parentLifespan.value - parentAge.value, yearsLeft.value)),
)

function remainingFor(card: EventCard): number {
  if (card.anchor === 'parent') {
    return Math.round(parentYearsLeft.value * card.perYear)
  }
  return Math.round(yearsLeft.value * card.perYear)
}

function passedFor(card: EventCard): number {
  if (card.anchor === 'parent') {
    return Math.round(Math.max(0, parentAge.value) * card.perYear)
  }
  return Math.round(yearsPassed.value * card.perYear)
}

function totalFor(card: EventCard): number {
  return remainingFor(card) + passedFor(card)
}

function percentRemaining(card: EventCard): number {
  const t = totalFor(card)
  if (t === 0) return 0
  return Math.round((remainingFor(card) / t) * 100)
}

// —— 卡片编辑 ——
function toggleEdit(id: string) {
  editingId.value = editingId.value === id ? null : id
}

function addCard() {
  const newCard: EventCard = {
    id: 'custom-' + Date.now(),
    emoji: '✨',
    name: '我的自定义事件',
    perYear: 1,
    anchor: 'self',
  }
  cards.push(newCard)
  editingId.value = newCard.id
}

function removeCard(id: string) {
  const idx = cards.findIndex((c) => c.id === id)
  if (idx >= 0) cards.splice(idx, 1)
  if (editingId.value === id) editingId.value = null
}

function resetAll() {
  if (!confirm('恢复到默认设置?你自定义的卡片会丢失。')) return
  age.value = 30
  lifespan.value = 85
  parentAge.value = 60
  parentLifespan.value = 85
  cards.splice(0, cards.length, ...defaultCards())
  editingId.value = null
  settingsOpen.value = false
}

// —— 视觉:为大数量事件做每格 N 次折叠 ——
function dotsFor(card: EventCard): { future: number; past: number; scale: number } {
  const future = remainingFor(card)
  const past = passedFor(card)
  const total = future + past
  const MAX_DOTS = 240
  let scale = 1
  if (total > MAX_DOTS) {
    scale = Math.ceil(total / MAX_DOTS)
  }
  return {
    future: Math.ceil(future / scale),
    past: Math.ceil(past / scale),
    scale,
  }
}

function unitFor(card: EventCard): string {
  if (card.anchor === 'parent') return '天'
  return '次'
}
</script>

<template>
  <div class="app">
    <!-- Header -->
    <header class="app-header">
      <div class="header-inner">
        <a href="/" class="brand">
          <span class="brand-dot"></span>
          <span class="brand-text">Wait But Why · 中译</span>
        </a>
        <button class="header-btn" @click="settingsOpen = !settingsOpen">
          <span class="gear">⚙</span>
          <span>{{ settingsOpen ? '收起' : '调整参数' }}</span>
        </button>
      </div>
    </header>

    <!-- Settings drawer -->
    <transition name="drawer">
      <div v-if="settingsOpen" class="settings">
        <div class="settings-inner">
          <div class="settings-group">
            <div class="settings-label">你</div>
            <div class="settings-fields">
              <div class="field">
                <span>年龄</span>
                <input type="number" min="0" max="120" v-model.number="age" aria-label="你的年龄" />
              </div>
              <div class="field">
                <span>预期寿命</span>
                <input type="number" min="30" max="120" v-model.number="lifespan" aria-label="你的预期寿命" />
              </div>
            </div>
          </div>
          <div class="settings-group">
            <div class="settings-label">爸妈(平均)</div>
            <div class="settings-fields">
              <div class="field">
                <span>年龄</span>
                <input type="number" min="0" max="120" v-model.number="parentAge" aria-label="爸妈平均年龄" />
              </div>
              <div class="field">
                <span>预期寿命</span>
                <input type="number" min="30" max="120" v-model.number="parentLifespan" aria-label="爸妈预期寿命" />
              </div>
            </div>
          </div>
          <button class="reset-link" @click="resetAll">恢复默认</button>
        </div>
      </div>
    </transition>

    <!-- Hero -->
    <section class="hero">
      <div class="hero-inner">
        <div class="hero-eyebrow">The Tail End · 中文互动版</div>
        <h1 class="hero-title">
          <span>你还剩</span>
          <span class="hero-num">{{ yearsLeft }}</span>
          <span>年</span>
        </h1>
        <p class="hero-sub">
          你今年 <strong>{{ age }}</strong> 岁,已经走过人生的 <strong>{{ lifePercent }}%</strong>。<br />
          剩下的时间不只是"多少年",而是——多少次。
        </p>
        <!-- Life bar -->
        <div class="lifebar">
          <div class="lifebar-track">
            <div class="lifebar-past" :style="{ width: lifePercent + '%' }"></div>
          </div>
          <div class="lifebar-legend">
            <span><span class="dot-legend past"></span> 已过去 {{ yearsPassed }} 年</span>
            <span><span class="dot-legend future"></span> 还剩 {{ yearsLeft }} 年</span>
          </div>
        </div>
      </div>
    </section>

    <!-- Cards -->
    <section class="cards-section">
      <div class="cards">
        <div v-for="card in cards" :key="card.id" class="card">
          <div class="card-top">
            <div class="card-emoji">{{ card.emoji }}</div>
            <div class="card-meta">
              <div class="card-name">{{ card.name }}</div>
              <div class="card-freq">
                {{ card.anchor === 'parent' ? '和爸妈' : '你' }} · 每年 {{ card.perYear }} {{ unitFor(card) }}
              </div>
            </div>
            <button class="edit-btn" @click="toggleEdit(card.id)" :aria-label="'编辑 ' + card.name">
              <span v-if="editingId === card.id">✓</span>
              <span v-else>✎</span>
            </button>
          </div>

          <!-- Edit panel -->
          <transition name="edit">
            <div v-if="editingId === card.id" class="edit-panel">
              <div class="edit-field">
                <label>Emoji</label>
                <input type="text" maxlength="4" v-model="card.emoji" />
              </div>
              <div class="edit-field wide">
                <label>名称</label>
                <input type="text" v-model="card.name" />
              </div>
              <div class="edit-field">
                <label>每年 {{ unitFor(card) }}数</label>
                <input type="number" min="0" step="0.5" v-model.number="card.perYear" />
              </div>
              <div class="edit-field">
                <label>受谁约束</label>
                <select v-model="card.anchor">
                  <option value="self">自己</option>
                  <option value="parent">爸妈</option>
                </select>
              </div>
              <button class="delete-btn" @click="removeCard(card.id)">删除卡片</button>
            </div>
          </transition>

          <!-- Headline -->
          <div class="card-headline">
            <div class="headline-num">{{ remainingFor(card) }}</div>
            <div class="headline-tail">
              <div class="headline-unit">{{ unitFor(card) }}</div>
              <div class="headline-pct">仅剩 {{ percentRemaining(card) }}%</div>
            </div>
          </div>

          <!-- Dots -->
          <div class="dots">
            <span
              v-for="n in dotsFor(card).past"
              :key="'p' + n"
              class="dot past"
              :style="{ animationDelay: (n * 4) + 'ms' }"
              :title="'已过去 · ' + card.name"
            ></span>
            <span
              v-for="n in dotsFor(card).future"
              :key="'f' + n"
              class="dot future"
              :style="{ animationDelay: ((dotsFor(card).past + n) * 4) + 'ms' }"
              :title="'还剩 · ' + card.name"
            ></span>
          </div>

          <div class="card-foot">
            <span>已过去 {{ passedFor(card) }} {{ unitFor(card) }}</span>
            <span v-if="dotsFor(card).scale > 1" class="scale-hint">每格 = {{ dotsFor(card).scale }} {{ unitFor(card) }}</span>
          </div>
        </div>

        <!-- Add card -->
        <button class="add-card" @click="addCard">
          <span class="plus">+</span>
          <span>添加你自己的事件</span>
        </button>
      </div>
    </section>

    <!-- Footer -->
    <footer class="app-footer">
      <blockquote class="footer-quote">
        "看清楚人生剩下的部分,不是关于'时间',而是关于'选择'——<br />
        你选择把剩下的次数,分给谁,给什么。"
      </blockquote>
      <div class="footer-links">
        <a href="/posts/the-tail-end.html">← 读原文</a>
        <span class="sep">·</span>
        <a href="/">回首页</a>
      </div>
      <p class="footer-note">数据只存在你自己的浏览器里。想分享?直接截图这一页。</p>
    </footer>
  </div>
</template>

<style scoped>
/* —— App shell —— */
.app {
  --app-bg: #fafaf7;
  --app-surface: #ffffff;
  --app-surface-2: #f4f3ee;
  --app-border: #e8e6df;
  --app-text-1: #1a1a1a;
  --app-text-2: #4a4a4a;
  --app-text-3: #9a9a9a;
  --app-accent: #d4541f;
  --app-accent-soft: rgba(212, 84, 31, 0.10);
  --app-accent-2: #ef7a4f;
  --shadow-sm: 0 1px 2px rgba(20, 20, 20, 0.04);
  --shadow-md: 0 4px 16px rgba(20, 20, 20, 0.06);
  --shadow-lg: 0 12px 40px rgba(20, 20, 20, 0.08);

  min-height: 100vh;
  background: var(--app-bg);
  color: var(--app-text-1);
  font-family: 'Inter', 'Noto Serif SC', -apple-system, BlinkMacSystemFont, 'PingFang SC', sans-serif;
  font-feature-settings: 'ss01', 'cv11';
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

:global(.dark) .app {
  --app-bg: #17171a;
  --app-surface: #212126;
  --app-surface-2: #2a2a30;
  --app-border: #33333a;
  --app-text-1: #ececec;
  --app-text-2: #c0c0c0;
  --app-text-3: #7f7f88;
  --app-accent: #ef7a4f;
  --app-accent-soft: rgba(239, 122, 79, 0.14);
  --app-accent-2: #f59168;
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.3);
  --shadow-md: 0 4px 16px rgba(0, 0, 0, 0.35);
  --shadow-lg: 0 12px 40px rgba(0, 0, 0, 0.4);
}

/* —— Header —— */
.app-header {
  position: sticky;
  top: 0;
  z-index: 20;
  background: color-mix(in srgb, var(--app-bg) 82%, transparent);
  backdrop-filter: saturate(180%) blur(14px);
  -webkit-backdrop-filter: saturate(180%) blur(14px);
  border-bottom: 1px solid var(--app-border);
}
.header-inner {
  max-width: 1080px;
  margin: 0 auto;
  padding: 14px 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}
.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--app-text-2);
  text-decoration: none;
  font-size: 0.9rem;
  font-weight: 500;
}
.brand-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--app-accent);
  box-shadow: 0 0 0 3px var(--app-accent-soft);
}
.brand:hover { color: var(--app-accent); }
.header-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  border: 1px solid var(--app-border);
  border-radius: 999px;
  background: var(--app-surface);
  color: var(--app-text-2);
  font-size: 0.85rem;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.18s;
}
.header-btn:hover {
  border-color: var(--app-accent);
  color: var(--app-accent);
}
.gear {
  font-size: 0.95rem;
  transition: transform 0.4s ease;
}
.header-btn:hover .gear { transform: rotate(60deg); }

/* —— Settings drawer —— */
.settings {
  background: var(--app-surface);
  border-bottom: 1px solid var(--app-border);
}
.settings-inner {
  max-width: 1080px;
  margin: 0 auto;
  padding: 20px 24px;
  display: flex;
  flex-wrap: wrap;
  gap: 32px;
  align-items: flex-end;
}
.settings-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.settings-label {
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--app-text-3);
  text-transform: uppercase;
  letter-spacing: 0.12em;
}
.settings-fields {
  display: flex;
  gap: 12px;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.field span {
  font-size: 0.75rem;
  color: var(--app-text-3);
}
.field input {
  width: 90px;
  padding: 8px 10px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: var(--app-bg);
  color: var(--app-text-1);
  font-family: inherit;
  font-size: 0.95rem;
  font-variant-numeric: tabular-nums;
  transition: border-color 0.15s;
}
.field input:focus {
  outline: none;
  border-color: var(--app-accent);
  box-shadow: 0 0 0 3px var(--app-accent-soft);
}
.reset-link {
  margin-left: auto;
  background: none;
  border: none;
  color: var(--app-text-3);
  font-family: inherit;
  font-size: 0.82rem;
  cursor: pointer;
  padding: 8px 0;
}
.reset-link:hover { color: var(--app-accent); }

.drawer-enter-active, .drawer-leave-active {
  transition: max-height 0.3s ease, opacity 0.25s ease;
  overflow: hidden;
}
.drawer-enter-from, .drawer-leave-to {
  max-height: 0;
  opacity: 0;
}
.drawer-enter-to, .drawer-leave-from {
  max-height: 300px;
  opacity: 1;
}

/* —— Hero —— */
.hero {
  padding: 72px 24px 40px;
  background: linear-gradient(180deg, transparent 0%, var(--app-accent-soft) 100%);
}
.hero-inner {
  max-width: 720px;
  margin: 0 auto;
  text-align: center;
}
.hero-eyebrow {
  display: inline-block;
  padding: 5px 14px;
  background: var(--app-surface);
  color: var(--app-accent);
  border: 1px solid var(--app-accent-soft);
  border-radius: 999px;
  font-size: 0.78rem;
  font-weight: 500;
  letter-spacing: 0.02em;
  margin-bottom: 24px;
}
.hero-title {
  display: flex;
  gap: 16px;
  justify-content: center;
  align-items: baseline;
  margin: 0 0 18px;
  font-size: clamp(2.2rem, 5vw, 3.4rem);
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--app-text-1);
}
.hero-num {
  color: var(--app-accent);
  font-size: 1.4em;
  font-variant-numeric: tabular-nums;
  line-height: 1;
}
.hero-sub {
  margin: 0 auto 32px;
  max-width: 480px;
  color: var(--app-text-2);
  font-size: 1.02rem;
  line-height: 1.7;
}
.hero-sub strong {
  color: var(--app-text-1);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
.lifebar {
  max-width: 520px;
  margin: 0 auto;
}
.lifebar-track {
  height: 8px;
  background: var(--app-surface);
  border: 1px solid var(--app-border);
  border-radius: 999px;
  overflow: hidden;
}
.lifebar-past {
  height: 100%;
  background: linear-gradient(90deg, var(--app-text-3), var(--app-accent));
  border-radius: 999px;
  transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}
.lifebar-legend {
  display: flex;
  justify-content: space-between;
  margin-top: 12px;
  font-size: 0.82rem;
  color: var(--app-text-3);
}
.dot-legend {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 2px;
  margin-right: 6px;
  vertical-align: -1px;
}
.dot-legend.past { background: var(--app-border); }
.dot-legend.future { background: var(--app-accent); }

/* —— Cards section —— */
.cards-section {
  padding: 40px 24px 60px;
}
.cards {
  max-width: 1080px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
}
.card {
  background: var(--app-surface);
  border: 1px solid var(--app-border);
  border-radius: 18px;
  padding: 22px 22px 20px;
  box-shadow: var(--shadow-sm);
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
}
.card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
  border-color: color-mix(in srgb, var(--app-accent) 30%, var(--app-border));
}

/* card top */
.card-top {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 16px;
}
.card-emoji {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--app-surface-2);
  border-radius: 14px;
  font-size: 1.6rem;
  flex-shrink: 0;
}
.card-meta {
  flex: 1;
  min-width: 0;
}
.card-name {
  font-size: 1.02rem;
  font-weight: 600;
  color: var(--app-text-1);
  line-height: 1.3;
  margin-bottom: 3px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.card-freq {
  font-size: 0.78rem;
  color: var(--app-text-3);
  font-variant-numeric: tabular-nums;
}
.edit-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--app-border);
  border-radius: 10px;
  background: transparent;
  color: var(--app-text-3);
  cursor: pointer;
  font-size: 0.85rem;
  transition: all 0.15s;
  flex-shrink: 0;
}
.edit-btn:hover {
  border-color: var(--app-accent);
  color: var(--app-accent);
}

/* Headline */
.card-headline {
  display: flex;
  align-items: flex-end;
  gap: 10px;
  margin-bottom: 14px;
}
.headline-num {
  font-size: 3.2rem;
  font-weight: 700;
  line-height: 0.95;
  color: var(--app-accent);
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.02em;
}
.headline-tail {
  display: flex;
  flex-direction: column;
  padding-bottom: 3px;
  gap: 2px;
}
.headline-unit {
  font-size: 0.9rem;
  color: var(--app-text-2);
  font-weight: 500;
}
.headline-pct {
  font-size: 0.72rem;
  color: var(--app-text-3);
  font-variant-numeric: tabular-nums;
}

/* Dots */
.dots {
  display: flex;
  flex-wrap: wrap;
  gap: 3px;
  padding: 4px 0 2px;
  min-height: 40px;
}
.dot {
  width: 8px;
  height: 8px;
  border-radius: 2px;
  display: inline-block;
  flex-shrink: 0;
  animation: dotIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}
.dot.past { background: var(--app-border); }
.dot.future {
  background: var(--app-accent);
  box-shadow: 0 0 0 0.5px color-mix(in srgb, var(--app-accent) 30%, transparent);
}
@keyframes dotIn {
  from { opacity: 0; transform: scale(0.3); }
  to { opacity: 1; transform: scale(1); }
}

.card-foot {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px dashed var(--app-border);
  font-size: 0.75rem;
  color: var(--app-text-3);
  font-variant-numeric: tabular-nums;
}
.scale-hint {
  padding: 2px 8px;
  background: var(--app-accent-soft);
  color: var(--app-accent);
  border-radius: 4px;
  font-weight: 500;
}

/* Edit panel */
.edit-panel {
  display: grid;
  grid-template-columns: 80px 1fr 100px 100px;
  gap: 10px;
  padding: 14px;
  margin-bottom: 16px;
  background: var(--app-surface-2);
  border-radius: 12px;
  align-items: end;
}
.edit-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}
.edit-field.wide { grid-column: span 1; }
.edit-field label {
  font-size: 0.7rem;
  color: var(--app-text-3);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.edit-field input,
.edit-field select {
  padding: 6px 8px;
  border: 1px solid var(--app-border);
  border-radius: 6px;
  background: var(--app-bg);
  color: var(--app-text-1);
  font-family: inherit;
  font-size: 0.88rem;
  min-width: 0;
  width: 100%;
  box-sizing: border-box;
}
.edit-field input:focus, .edit-field select:focus {
  outline: none;
  border-color: var(--app-accent);
}
.delete-btn {
  grid-column: 1 / -1;
  padding: 6px 10px;
  border: 1px solid var(--app-border);
  border-radius: 6px;
  background: transparent;
  color: var(--app-text-3);
  font-family: inherit;
  font-size: 0.78rem;
  cursor: pointer;
  justify-self: end;
  transition: all 0.15s;
}
.delete-btn:hover {
  border-color: #c0392b;
  color: #c0392b;
}
.edit-enter-active, .edit-leave-active {
  transition: opacity 0.2s ease;
}
.edit-enter-from, .edit-leave-to { opacity: 0; }

/* Add card */
.add-card {
  border: 1.5px dashed var(--app-border);
  border-radius: 18px;
  background: transparent;
  color: var(--app-text-3);
  font-family: inherit;
  font-size: 0.95rem;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 40px 20px;
  transition: all 0.2s;
  min-height: 220px;
}
.add-card:hover {
  border-color: var(--app-accent);
  color: var(--app-accent);
  background: var(--app-accent-soft);
}
.plus {
  font-size: 2rem;
  font-weight: 300;
  line-height: 1;
}

/* Footer */
.app-footer {
  padding: 48px 24px 80px;
  text-align: center;
  border-top: 1px solid var(--app-border);
  background: var(--app-surface);
}
.footer-quote {
  max-width: 560px;
  margin: 0 auto 28px;
  padding: 0;
  border: none;
  font-size: 1rem;
  color: var(--app-text-2);
  line-height: 1.8;
  font-style: italic;
  quotes: none;
}
.footer-links {
  display: flex;
  gap: 12px;
  justify-content: center;
  align-items: center;
  margin-bottom: 16px;
  font-size: 0.88rem;
}
.footer-links a {
  color: var(--app-accent);
  text-decoration: none;
  border-bottom: 1px solid var(--app-accent-soft);
  padding-bottom: 1px;
  transition: border-color 0.15s;
}
.footer-links a:hover { border-bottom-color: var(--app-accent); }
.footer-links .sep { color: var(--app-text-3); }
.footer-note {
  color: var(--app-text-3);
  font-size: 0.78rem;
  margin: 0;
}

/* Mobile */
@media (max-width: 640px) {
  .hero { padding: 48px 20px 32px; }
  .hero-title { gap: 10px; }
  .cards-section { padding: 28px 16px 40px; }
  .cards { grid-template-columns: 1fr; gap: 14px; }
  .card { padding: 18px; border-radius: 14px; }
  .card-emoji { width: 40px; height: 40px; font-size: 1.4rem; border-radius: 12px; }
  .headline-num { font-size: 2.6rem; }
  .edit-panel {
    grid-template-columns: 1fr 1fr;
  }
  .settings-inner { padding: 16px 20px; gap: 20px; }
  .settings-fields { flex-wrap: wrap; }
  .field input { width: 80px; }
  .header-inner { padding: 12px 16px; }
  .brand-text { font-size: 0.82rem; }
  .app-footer { padding: 36px 20px 56px; }
}
</style>
