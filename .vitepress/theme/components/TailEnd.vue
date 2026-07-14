<script setup lang="ts">
import { ref, computed, reactive, onMounted, watch, nextTick } from 'vue'

// —— 人物锚点 ——
type Person = {
  id: 'self' | 'partner' | 'child' | 'parent' | 'sibling' | 'grandparent'
  label: string
  age: number
  lifespan: number
}

type EventCard = {
  id: string
  emoji: string
  name: string
  perYear: number
  anchor: Person['id']
  unit?: 'times' | 'days'
}

const STORAGE_KEY = 'wbw-tail-end-v2'

// —— 人物数据 ——
const people = reactive<Record<Person['id'], Person>>({
  self:        { id: 'self',        label: '你',       age: 30, lifespan: 85 },
  partner:     { id: 'partner',     label: '爱人',     age: 30, lifespan: 85 },
  child:       { id: 'child',       label: '孩子',     age: 0,  lifespan: 85 },
  parent:      { id: 'parent',      label: '爸妈',     age: 60, lifespan: 85 },
  sibling:     { id: 'sibling',     label: '兄弟姐妹', age: 30, lifespan: 85 },
  grandparent: { id: 'grandparent', label: '祖父母',   age: 85, lifespan: 90 },
})

// —— 事件卡片 ——
const defaultCards = (): EventCard[] => [
  { id: 'parents',     emoji: '👨‍👩‍👧',    name: '和爸妈相聚',    perYear: 10, anchor: 'parent',      unit: 'days' },
  { id: 'partner',     emoji: '💑',    name: '和爱人相处',    perYear: 300, anchor: 'partner',    unit: 'days' },
  { id: 'child',       emoji: '👶',   name: '陪孩子长大',    perYear: 300, anchor: 'child',      unit: 'days' },
  { id: 'grandparent', emoji: '👵',   name: '看望祖父母',    perYear: 5,  anchor: 'grandparent', unit: 'days' },
  { id: 'sibling',     emoji: '👫',   name: '和兄弟姐妹见面',perYear: 10, anchor: 'sibling',    unit: 'days' },
  { id: 'spring',      emoji: '🧧',   name: '过一个春节',    perYear: 1,  anchor: 'self',       unit: 'times' },
  { id: 'travel',      emoji: '✈️',   name: '出国旅行',      perYear: 1,  anchor: 'self',       unit: 'times' },
  { id: 'books',       emoji: '📚',   name: '读一本书',      perYear: 12, anchor: 'self',       unit: 'times' },
  { id: 'movies',      emoji: '🎬',   name: '走进电影院',    perYear: 6,  anchor: 'self',       unit: 'times' },
  { id: 'sakura',      emoji: '🌸',   name: '看一次樱花',    perYear: 1,  anchor: 'self',       unit: 'times' },
  { id: 'seaswim',     emoji: '🌊',   name: '下海游泳',      perYear: 1,  anchor: 'self',       unit: 'times' },
  { id: 'gathering',   emoji: '🍻',   name: '和老友聚会',    perYear: 4,  anchor: 'self',       unit: 'times' },
]

const cards = reactive<EventCard[]>(defaultCards())
const editingId = ref<string | null>(null)
const settingsOpen = ref(false)

// —— 引导流程 ——
type Stage = 'intro' | 'onboarding' | 'reveal' | 'app'
const stage = ref<Stage>('intro')
const introStep = ref(0)
const onboardingStep = ref(0)
const revealStep = ref(0)

// intro 屏:一段一段淡入的话
const introLines = [
  '你好。',
  '有一件事，Tim Urban 想让你算一算。',
  '不是关于时间。',
  '是关于——次数。',
]

// onboarding 问题
type Question = {
  key: string
  prompt: string
  sub?: string
  fields: { path: string; label?: string; suffix?: string; min?: number; max?: number }[]
  guard?: () => boolean
}

const questions = computed<Question[]>(() => [
  {
    key: 'age',
    prompt: '你今年几岁？',
    fields: [{ path: 'self.age', suffix: '岁', min: 0, max: 120 }],
  },
  {
    key: 'lifespan',
    prompt: '乐观点算。',
    sub: '你希望自己活到——',
    fields: [{ path: 'self.lifespan', suffix: '岁', min: 30, max: 120 }],
  },
  {
    key: 'parents',
    prompt: '爸妈现在多大？',
    sub: '(取平均)',
    fields: [
      { path: 'parent.age', suffix: '岁', min: 0, max: 120 },
    ],
  },
  {
    key: 'parentLife',
    prompt: '希望他们活到——',
    fields: [{ path: 'parent.lifespan', suffix: '岁', min: 30, max: 120 }],
  },
  {
    key: 'partner',
    prompt: '有爱人吗？',
    sub: '如果有，Ta 今年——',
    fields: [{ path: 'partner.age', suffix: '岁', min: 0, max: 120 }],
  },
  {
    key: 'child',
    prompt: '有孩子吗？',
    sub: '如果有，Ta 今年——(没有就填 0)',
    fields: [{ path: 'child.age', suffix: '岁', min: 0, max: 60 }],
  },
])

function getField(path: string): number {
  const [personId, key] = path.split('.') as [Person['id'], 'age' | 'lifespan']
  return people[personId][key]
}
function setField(path: string, value: number) {
  const [personId, key] = path.split('.') as [Person['id'], 'age' | 'lifespan']
  people[personId][key] = value
}

// —— 计算 ——
const yearsLeft = computed(() => Math.max(0, people.self.lifespan - people.self.age))
const lifePercent = computed(() =>
  Math.min(100, Math.round((people.self.age / people.self.lifespan) * 100)),
)

function yearsLeftForPerson(p: Person): number {
  return Math.max(0, Math.min(p.lifespan - p.age, yearsLeft.value))
}

function remainingFor(card: EventCard): number {
  const anchor = people[card.anchor]
  const years = yearsLeftForPerson(anchor)
  return Math.round(years * card.perYear)
}

function passedFor(card: EventCard): number {
  const anchor = people[card.anchor]
  const years = Math.max(0, anchor.age)
  return Math.round(years * card.perYear)
}

function unitFor(card: EventCard): string {
  return card.unit === 'days' ? '天' : '次'
}

function percentRemaining(card: EventCard): number {
  const t = remainingFor(card) + passedFor(card)
  return t === 0 ? 0 : Math.round((remainingFor(card) / t) * 100)
}

// —— 揭示阶段:选出最戳的几张 ——
const revealCards = computed(() => {
  return [...cards]
    .filter(c => remainingFor(c) > 0)
    .sort((a, b) => percentRemaining(a) - percentRemaining(b))
    .slice(0, 4)
})

// —— 视觉:密集事件折叠 ——
function dotsFor(card: EventCard): { future: number; past: number; scale: number } {
  const future = remainingFor(card)
  const past = passedFor(card)
  const total = future + past
  const MAX_DOTS = 240
  let scale = 1
  if (total > MAX_DOTS) scale = Math.ceil(total / MAX_DOTS)
  return {
    future: Math.ceil(future / scale),
    past: Math.ceil(past / scale),
    scale,
  }
}

// —— 引导控制 ——
function nextIntro() {
  if (introStep.value < introLines.length - 1) {
    introStep.value++
  } else {
    stage.value = 'onboarding'
  }
}

// intro 自动前进
onMounted(() => {
  loadFromStorage()
  if (stage.value === 'intro') {
    startIntroAutoplay()
  }
})

let introTimer: ReturnType<typeof setTimeout> | null = null
function startIntroAutoplay() {
  const advance = () => {
    if (stage.value !== 'intro') return
    if (introStep.value < introLines.length - 1) {
      introStep.value++
      introTimer = setTimeout(advance, 2200)
    } else {
      // 停在最后一句,等用户点击继续
    }
  }
  introTimer = setTimeout(advance, 2200)
}

function skipIntro() {
  if (introTimer) clearTimeout(introTimer)
  stage.value = 'onboarding'
}

function nextOnboarding() {
  if (onboardingStep.value < questions.value.length - 1) {
    onboardingStep.value++
  } else {
    // 进入 reveal
    stage.value = 'reveal'
    revealStep.value = 0
    startRevealAutoplay()
  }
}

function prevOnboarding() {
  if (onboardingStep.value > 0) {
    onboardingStep.value--
  } else {
    stage.value = 'intro'
    introStep.value = introLines.length - 1
  }
}

let revealTimer: ReturnType<typeof setTimeout> | null = null
function startRevealAutoplay() {
  const advance = () => {
    if (stage.value !== 'reveal') return
    if (revealStep.value < revealCards.value.length) {
      revealStep.value++
      revealTimer = setTimeout(advance, 2400)
    }
  }
  revealTimer = setTimeout(advance, 1400)
}

function skipReveal() {
  if (revealTimer) clearTimeout(revealTimer)
  stage.value = 'app'
  saveToStorage()
}

function enterApp() {
  if (revealTimer) clearTimeout(revealTimer)
  stage.value = 'app'
  saveToStorage()
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
    unit: 'times',
  }
  cards.push(newCard)
  editingId.value = newCard.id
}

function removeCard(id: string) {
  const idx = cards.findIndex(c => c.id === id)
  if (idx >= 0) cards.splice(idx, 1)
  if (editingId.value === id) editingId.value = null
}

function resetAll() {
  if (!confirm('恢复到默认？你自定义的卡片会丢失。')) return
  Object.assign(people, {
    self:        { id: 'self',        label: '你',       age: 30, lifespan: 85 },
    partner:     { id: 'partner',     label: '爱人',     age: 30, lifespan: 85 },
    child:       { id: 'child',       label: '孩子',     age: 0,  lifespan: 85 },
    parent:      { id: 'parent',      label: '爸妈',     age: 60, lifespan: 85 },
    sibling:     { id: 'sibling',     label: '兄弟姐妹', age: 30, lifespan: 85 },
    grandparent: { id: 'grandparent', label: '祖父母',   age: 85, lifespan: 90 },
  })
  cards.splice(0, cards.length, ...defaultCards())
  editingId.value = null
  settingsOpen.value = false
}

function replayIntro() {
  stage.value = 'intro'
  introStep.value = 0
  onboardingStep.value = 0
  revealStep.value = 0
  startIntroAutoplay()
}

// —— 持久化 ——
function saveToStorage() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      people,
      cards,
      stage: 'app', // 只有到 app 阶段才保存
    }))
  } catch {}
}

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const saved = JSON.parse(raw)
      if (saved.people) Object.assign(people, saved.people)
      if (Array.isArray(saved.cards) && saved.cards.length > 0) {
        cards.splice(0, cards.length, ...saved.cards)
      }
      if (saved.stage === 'app') {
        stage.value = 'app' // 已经完成过引导,直接进 app
      }
    }
  } catch {}
}

// app 阶段的改动实时保存
watch([people, cards], () => {
  if (stage.value === 'app') saveToStorage()
}, { deep: true })
</script>

<template>
  <div class="app">
    <!-- ===== INTRO 阶段 ===== -->
    <transition name="stage">
      <section v-if="stage === 'intro'" class="stage-full intro">
        <div class="intro-inner">
          <transition-group name="line" tag="div" class="intro-lines">
            <p
              v-for="(line, i) in introLines.slice(0, introStep + 1)"
              :key="i"
              class="intro-line"
              :class="{ 'is-latest': i === introStep }"
            >{{ line }}</p>
          </transition-group>

          <transition name="fade">
            <button
              v-if="introStep === introLines.length - 1"
              class="cta-button"
              @click="skipIntro"
            >
              开始 →
            </button>
          </transition>

          <button class="skip-link" @click="skipIntro">跳过</button>
        </div>
      </section>
    </transition>

    <!-- ===== ONBOARDING 阶段 ===== -->
    <transition name="stage">
      <section v-if="stage === 'onboarding'" class="stage-full onboarding">
        <div class="onboarding-progress">
          <div
            v-for="(q, i) in questions"
            :key="q.key"
            class="progress-dot"
            :class="{ active: i <= onboardingStep, current: i === onboardingStep }"
          ></div>
        </div>

        <div class="onboarding-inner">
          <transition name="question" mode="out-in">
            <div :key="onboardingStep" class="question-block">
              <p class="question-prompt">{{ questions[onboardingStep].prompt }}</p>
              <p v-if="questions[onboardingStep].sub" class="question-sub">
                {{ questions[onboardingStep].sub }}
              </p>

              <div class="question-fields">
                <div
                  v-for="field in questions[onboardingStep].fields"
                  :key="field.path"
                  class="field-inline"
                >
                  <input
                    type="number"
                    :min="field.min"
                    :max="field.max"
                    :value="getField(field.path)"
                    @input="setField(field.path, +($event.target as HTMLInputElement).value)"
                    class="big-input"
                    :aria-label="questions[onboardingStep].prompt"
                  />
                  <span class="field-suffix">{{ field.suffix }}</span>
                </div>
              </div>

              <div class="question-actions">
                <button v-if="onboardingStep > 0" class="btn-ghost" @click="prevOnboarding">
                  ← 上一步
                </button>
                <button class="cta-button" @click="nextOnboarding">
                  {{ onboardingStep === questions.length - 1 ? '看看结果 →' : '下一步 →' }}
                </button>
              </div>
            </div>
          </transition>
        </div>
      </section>
    </transition>

    <!-- ===== REVEAL 阶段 ===== -->
    <transition name="stage">
      <section v-if="stage === 'reveal'" class="stage-full reveal">
        <div class="reveal-inner">
          <p class="reveal-eyebrow">这就是你剩下的人生。</p>

          <transition-group name="reveal-item" tag="div" class="reveal-list">
            <div
              v-for="(card, i) in revealCards.slice(0, revealStep)"
              :key="card.id"
              class="reveal-item"
            >
              <div class="reveal-emoji">{{ card.emoji }}</div>
              <div class="reveal-body">
                <div class="reveal-name">{{ card.name }}</div>
                <div class="reveal-num-line">
                  <span class="reveal-remaining">还剩 {{ remainingFor(card) }}</span>
                  <span class="reveal-unit">{{ unitFor(card) }}</span>
                </div>
                <div class="reveal-pct">仅剩 {{ percentRemaining(card) }}%</div>
              </div>
            </div>
          </transition-group>

          <transition name="fade">
            <button
              v-if="revealStep >= revealCards.length"
              class="cta-button reveal-cta"
              @click="enterApp"
            >
              看看还有哪些 →
            </button>
          </transition>

          <button class="skip-link" @click="skipReveal">跳过</button>
        </div>
      </section>
    </transition>

    <!-- ===== APP 阶段 ===== -->
    <transition name="stage">
      <div v-if="stage === 'app'" class="app-main">
        <!-- Header -->
        <header class="app-header">
          <div class="header-inner">
            <a href="/" class="brand">
              <span class="brand-dot"></span>
              <span class="brand-text">Wait But Why · 中译</span>
            </a>
            <div class="header-actions">
              <button class="header-btn ghost" @click="replayIntro">重新开始</button>
              <button class="header-btn" @click="settingsOpen = !settingsOpen">
                <span class="gear">⚙</span>
                <span>{{ settingsOpen ? '收起' : '调整' }}</span>
              </button>
            </div>
          </div>
        </header>

        <!-- Settings drawer -->
        <transition name="drawer">
          <div v-if="settingsOpen" class="settings">
            <div class="settings-inner">
              <div v-for="p in Object.values(people)" :key="p.id" class="settings-group">
                <div class="settings-label">{{ p.label }}</div>
                <div class="settings-fields">
                  <div class="field">
                    <span>年龄</span>
                    <input type="number" min="0" max="120" v-model.number="p.age" :aria-label="p.label + '年龄'" />
                  </div>
                  <div class="field">
                    <span>预期寿命</span>
                    <input type="number" min="30" max="120" v-model.number="p.lifespan" :aria-label="p.label + '预期寿命'" />
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
              你今年 <strong>{{ people.self.age }}</strong> 岁，已经走过人生的 <strong>{{ lifePercent }}%</strong>。<br />
              剩下的时间不只是"多少年"，而是——多少次。
            </p>
            <div class="lifebar">
              <div class="lifebar-track">
                <div class="lifebar-past" :style="{ width: lifePercent + '%' }"></div>
              </div>
              <div class="lifebar-legend">
                <span><span class="dot-legend past"></span> 已过去 {{ people.self.age }} 年</span>
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
                    {{ people[card.anchor].label }} · 每年 {{ card.perYear }} {{ unitFor(card) }}
                  </div>
                </div>
                <button class="edit-btn" @click="toggleEdit(card.id)" :aria-label="'编辑 ' + card.name">
                  <span v-if="editingId === card.id">✓</span>
                  <span v-else>✎</span>
                </button>
              </div>

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
                    <label>每年 {{ unitFor(card) }}</label>
                    <input type="number" min="0" step="0.5" v-model.number="card.perYear" />
                  </div>
                  <div class="edit-field">
                    <label>受谁约束</label>
                    <select v-model="card.anchor">
                      <option v-for="p in Object.values(people)" :key="p.id" :value="p.id">
                        {{ p.label }}
                      </option>
                    </select>
                  </div>
                  <div class="edit-field">
                    <label>单位</label>
                    <select v-model="card.unit">
                      <option value="times">次</option>
                      <option value="days">天</option>
                    </select>
                  </div>
                  <button class="delete-btn" @click="removeCard(card.id)">删除卡片</button>
                </div>
              </transition>

              <div class="card-headline">
                <div class="headline-num">{{ remainingFor(card) }}</div>
                <div class="headline-tail">
                  <div class="headline-unit">{{ unitFor(card) }}</div>
                  <div class="headline-pct">仅剩 {{ percentRemaining(card) }}%</div>
                </div>
              </div>

              <div class="dots">
                <span
                  v-for="n in dotsFor(card).past"
                  :key="'p' + n"
                  class="dot past"
                  :style="{ animationDelay: (n * 4) + 'ms' }"
                ></span>
                <span
                  v-for="n in dotsFor(card).future"
                  :key="'f' + n"
                  class="dot future"
                  :style="{ animationDelay: ((dotsFor(card).past + n) * 4) + 'ms' }"
                ></span>
              </div>

              <div class="card-foot">
                <span>已过去 {{ passedFor(card) }} {{ unitFor(card) }}</span>
                <span v-if="dotsFor(card).scale > 1" class="scale-hint">每格 = {{ dotsFor(card).scale }} {{ unitFor(card) }}</span>
              </div>
            </div>

            <button class="add-card" @click="addCard">
              <span class="plus">+</span>
              <span>添加你自己的事件</span>
            </button>
          </div>
        </section>

        <footer class="app-footer">
          <blockquote class="footer-quote">
            "看清楚人生剩下的部分，不是关于'时间'，而是关于'选择'——<br />
            你选择把剩下的次数，分给谁，给什么。"
          </blockquote>
          <div class="footer-links">
            <a href="/posts/the-tail-end.html">← 读原文</a>
            <span class="sep">·</span>
            <a href="/">回首页</a>
          </div>
          <p class="footer-note">数据只存在你自己的浏览器里。想分享？直接截图这一页。</p>
        </footer>
      </div>
    </transition>
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
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  position: relative;
  overflow-x: hidden;
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

/* ============================
   STAGE TRANSITIONS
   ============================ */
.stage-enter-active, .stage-leave-active {
  transition: opacity 0.6s ease;
}
.stage-enter-from, .stage-leave-to { opacity: 0; }

.stage-full {
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 24px;
  position: relative;
}

/* ============================
   INTRO
   ============================ */
.intro {
  background: radial-gradient(ellipse at center, var(--app-accent-soft) 0%, transparent 70%);
}
.intro-inner {
  max-width: 560px;
  width: 100%;
  text-align: center;
}
.intro-lines {
  min-height: 60vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 12px;
}
.intro-line {
  font-size: clamp(1.4rem, 3.5vw, 2rem);
  font-weight: 500;
  color: var(--app-text-2);
  letter-spacing: 0.01em;
  line-height: 1.5;
  margin: 0;
}
.intro-line.is-latest {
  color: var(--app-text-1);
}

.line-enter-active {
  transition: opacity 1s ease, transform 1s ease;
}
.line-enter-from {
  opacity: 0;
  transform: translateY(10px);
}
.line-leave-active {
  transition: opacity 0.5s ease;
}
.line-leave-to { opacity: 0; }

/* ============================
   ONBOARDING
   ============================ */
.onboarding {
  background: var(--app-bg);
}
.onboarding-progress {
  position: absolute;
  top: 40px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 8px;
}
.progress-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--app-border);
  transition: background 0.3s, transform 0.3s;
}
.progress-dot.active {
  background: var(--app-accent);
}
.progress-dot.current {
  transform: scale(1.5);
}
.onboarding-inner {
  max-width: 480px;
  width: 100%;
  text-align: center;
}
.question-block {
  padding: 40px 0;
}
.question-prompt {
  font-size: clamp(1.6rem, 4vw, 2.2rem);
  font-weight: 600;
  color: var(--app-text-1);
  line-height: 1.4;
  margin: 0 0 12px;
  letter-spacing: -0.01em;
}
.question-sub {
  color: var(--app-text-3);
  font-size: 0.98rem;
  margin: 0 0 40px;
  line-height: 1.6;
}
.question-fields {
  display: flex;
  justify-content: center;
  gap: 24px;
  margin-bottom: 48px;
  flex-wrap: wrap;
}
.field-inline {
  display: flex;
  align-items: baseline;
  gap: 10px;
}
.big-input {
  width: 120px;
  padding: 12px 16px;
  border: none;
  border-bottom: 2px solid var(--app-border);
  background: transparent;
  color: var(--app-accent);
  font-size: 2.8rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  text-align: center;
  font-family: inherit;
  transition: border-color 0.2s;
  outline: none;
  -moz-appearance: textfield;
}
.big-input::-webkit-outer-spin-button,
.big-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
.big-input:focus {
  border-bottom-color: var(--app-accent);
}
.field-suffix {
  color: var(--app-text-2);
  font-size: 1.2rem;
  font-weight: 500;
}
.question-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  align-items: center;
  flex-wrap: wrap;
}

.question-enter-active, .question-leave-active {
  transition: opacity 0.4s ease, transform 0.4s ease;
}
.question-enter-from {
  opacity: 0;
  transform: translateY(20px);
}
.question-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}

/* ============================
   REVEAL
   ============================ */
.reveal {
  background: linear-gradient(180deg, var(--app-bg) 0%, var(--app-accent-soft) 100%);
  justify-content: flex-start;
  padding-top: 15vh;
}
.reveal-inner {
  max-width: 560px;
  width: 100%;
  text-align: center;
}
.reveal-eyebrow {
  color: var(--app-text-2);
  font-size: 1rem;
  margin: 0 0 40px;
  font-weight: 500;
  letter-spacing: 0.02em;
}
.reveal-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 40px;
}
.reveal-item {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 24px 20px;
  background: var(--app-surface);
  border-radius: 16px;
  box-shadow: var(--shadow-md);
  text-align: left;
}
.reveal-emoji {
  font-size: 2.5rem;
  flex-shrink: 0;
}
.reveal-body { flex: 1; }
.reveal-name {
  font-size: 0.9rem;
  color: var(--app-text-3);
  margin-bottom: 4px;
}
.reveal-num-line {
  display: flex;
  align-items: baseline;
  gap: 6px;
}
.reveal-remaining {
  font-size: 2.4rem;
  font-weight: 700;
  color: var(--app-accent);
  font-variant-numeric: tabular-nums;
  line-height: 1;
}
.reveal-unit {
  color: var(--app-text-2);
  font-size: 1rem;
}
.reveal-pct {
  margin-top: 6px;
  font-size: 0.78rem;
  color: var(--app-text-3);
}
.reveal-cta { margin-top: 8px; }

.reveal-item-enter-active {
  transition: opacity 0.8s ease, transform 0.8s cubic-bezier(0.34, 1.4, 0.64, 1);
}
.reveal-item-enter-from {
  opacity: 0;
  transform: translateY(30px) scale(0.96);
}

/* ============================
   COMMON BUTTONS / LINKS
   ============================ */
.cta-button {
  display: inline-block;
  padding: 12px 32px;
  background: var(--app-accent);
  color: white;
  border: none;
  border-radius: 999px;
  font-family: inherit;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 12px color-mix(in srgb, var(--app-accent) 30%, transparent);
}
.cta-button:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px color-mix(in srgb, var(--app-accent) 40%, transparent);
}
.cta-button:active {
  transform: translateY(0);
}
.btn-ghost {
  padding: 10px 20px;
  background: transparent;
  border: none;
  color: var(--app-text-3);
  font-family: inherit;
  font-size: 0.9rem;
  cursor: pointer;
  transition: color 0.15s;
}
.btn-ghost:hover { color: var(--app-text-1); }
.skip-link {
  position: absolute;
  bottom: 30px;
  right: 30px;
  background: none;
  border: none;
  color: var(--app-text-3);
  font-family: inherit;
  font-size: 0.82rem;
  cursor: pointer;
  padding: 8px;
  transition: color 0.15s;
}
.skip-link:hover { color: var(--app-text-1); }

.fade-enter-active, .fade-leave-active {
  transition: opacity 0.6s ease;
}
.fade-enter-from, .fade-leave-to { opacity: 0; }

/* ============================
   APP MAIN (unchanged from prev)
   ============================ */
.app-main {
  min-height: 100vh;
}
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
.header-actions {
  display: flex;
  gap: 8px;
}
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
.header-btn.ghost {
  background: transparent;
}
.gear {
  font-size: 0.95rem;
  transition: transform 0.4s ease;
}
.header-btn:hover .gear { transform: rotate(60deg); }

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
  gap: 24px;
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
  width: 80px;
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
  max-height: 500px;
  opacity: 1;
}

/* Hero */
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

/* Cards section */
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

.edit-panel {
  display: grid;
  grid-template-columns: 80px 1fr 90px 90px 70px;
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
  .big-input { font-size: 2.2rem; width: 100px; }
  .reveal { padding-top: 12vh; }
  .reveal-remaining { font-size: 2rem; }
  .reveal-emoji { font-size: 2rem; }
}
</style>
