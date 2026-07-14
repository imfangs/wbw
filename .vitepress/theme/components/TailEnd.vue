<script setup lang="ts">
import { ref, computed, reactive, onMounted, watch, onUnmounted } from 'vue'

// —— 人物锚点 ——
type Person = {
  id: 'self' | 'partner' | 'child' | 'parent' | 'sibling' | 'grandparent'
  label: string
  age: number
  lifespan: number
  enabled: boolean
}

type EventCard = {
  id: string
  emoji?: string
  icon?: string
  name: string
  perYear: number
  anchor: Person['id']
  unit?: 'times' | 'days'
  kind: 'relation' | 'life'
}

const STORAGE_KEY = 'wbw-tail-end-v3'

// —— 人物数据 ——
const defaultPeople = (): Record<Person['id'], Person> => ({
  self:        { id: 'self',        label: '你',       age: 30, lifespan: 85, enabled: true  },
  partner:     { id: 'partner',     label: '爱人',     age: 30, lifespan: 85, enabled: true  },
  child:       { id: 'child',       label: '孩子',     age: 0,  lifespan: 85, enabled: false },
  parent:      { id: 'parent',      label: '爸妈',     age: 60, lifespan: 85, enabled: true  },
  sibling:     { id: 'sibling',     label: '兄弟姐妹', age: 30, lifespan: 85, enabled: true  },
  grandparent: { id: 'grandparent', label: '祖父母',   age: 85, lifespan: 90, enabled: true  },
})

const people = reactive<Record<Person['id'], Person>>(defaultPeople())

// —— 事件卡片 ——
const defaultCards = (): EventCard[] => [
  // 关系卡(带 emoji,情感重)
  { id: 'parents',     emoji: '👨‍👩‍👧', name: '和爸妈相聚',      perYear: 10,  anchor: 'parent',      unit: 'days',  kind: 'relation' },
  { id: 'partner',     emoji: '💑',    name: '和爱人相处',      perYear: 300, anchor: 'partner',     unit: 'days',  kind: 'relation' },
  { id: 'child',       emoji: '👶',    name: '陪孩子长大',      perYear: 300, anchor: 'child',       unit: 'days',  kind: 'relation' },
  { id: 'grandparent', emoji: '👵',    name: '看望祖父母',      perYear: 5,   anchor: 'grandparent', unit: 'days',  kind: 'relation' },
  { id: 'sibling',     emoji: '👫',    name: '和兄弟姐妹见面',  perYear: 10,  anchor: 'sibling',     unit: 'days',  kind: 'relation' },
  // 生活事件卡(线条图标)
  { id: 'spring',      icon: 'moon',   name: '过一个春节',      perYear: 1,   anchor: 'self',        unit: 'times', kind: 'life' },
  { id: 'travel',      icon: 'plane',  name: '出国旅行',        perYear: 1,   anchor: 'self',        unit: 'times', kind: 'life' },
  { id: 'books',       icon: 'book',   name: '读一本书',        perYear: 12,  anchor: 'self',        unit: 'times', kind: 'life' },
  { id: 'movies',      icon: 'film',   name: '走进电影院',      perYear: 6,   anchor: 'self',        unit: 'times', kind: 'life' },
  { id: 'sakura',      icon: 'petal',  name: '看一次樱花',      perYear: 1,   anchor: 'self',        unit: 'times', kind: 'life' },
  { id: 'seaswim',     icon: 'wave',   name: '下海游泳',        perYear: 1,   anchor: 'self',        unit: 'times', kind: 'life' },
  { id: 'gathering',   icon: 'cup',    name: '和老友聚会',      perYear: 4,   anchor: 'self',        unit: 'times', kind: 'life' },
]

const cards = reactive<EventCard[]>(defaultCards())
const editingId = ref<string | null>(null)
const settingsOpen = ref(false)
const overflowOpen = ref(false)

// —— 引导流程 ——
type Stage = 'intro' | 'onboarding' | 'reveal' | 'quote' | 'app'
const stage = ref<Stage>('intro')
const introStep = ref(0)
const onboardingStep = ref(0)
const revealStep = ref(0)

// intro 屏
const introLines = [
  '你好。',
  '有一件事，Tim Urban 想让你算一算。',
  '不是关于时间。',
  '是关于——次数。',
]
// 打字机进度(每句显示到第几字)
const typedChars = ref<number[]>([0, 0, 0, 0])
const typingDone = ref<boolean[]>([false, false, false, false])
// 最后一句"是关于——次数。"是标题式高亮,不打字,直接淡入
const isFinaleLine = (i: number) => i === introLines.length - 1

// —— Onboarding 问题(动态,基于 enabled) ——
type Question = {
  key: string
  prompt: string
  sub?: string
  fields: { path: string; suffix?: string; min?: number; max?: number }[]
  toggle?: {
    prompt: string
    person: Person['id']
  }
}

const questions = computed<Question[]>(() => {
  const list: Question[] = [
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
      sub: '(取一个平均值)',
      fields: [{ path: 'parent.age', suffix: '岁', min: 0, max: 120 }],
    },
    {
      key: 'parentLife',
      prompt: '你希望他们活到——',
      fields: [{ path: 'parent.lifespan', suffix: '岁', min: 30, max: 120 }],
    },
    {
      key: 'partnerToggle',
      prompt: '有爱人吗？',
      sub: '如果有，我们把 Ta 加进来一起算。',
      fields: [],
      toggle: { prompt: '', person: 'partner' },
    },
  ]
  if (people.partner.enabled) {
    list.push({
      key: 'partnerAge',
      prompt: 'Ta 今年——',
      fields: [{ path: 'partner.age', suffix: '岁', min: 0, max: 120 }],
    })
  }
  list.push({
    key: 'childToggle',
    prompt: '有孩子吗？',
    fields: [],
    toggle: { prompt: '', person: 'child' },
  })
  if (people.child.enabled) {
    list.push({
      key: 'childAge',
      prompt: '孩子今年——',
      sub: '如果还没出生，就填 0。',
      fields: [{ path: 'child.age', suffix: '岁', min: 0, max: 60 }],
    })
  }
  return list
})

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
const weeksLeft = computed(() => Math.round(yearsLeft.value * 52))
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

// 爸妈剩余天数(hero 副行用)
const parentDaysLeft = computed(() => {
  const parentCard = cards.find(c => c.id === 'parents')
  if (!parentCard) return 0
  return remainingFor(parentCard)
})

// 卡片是否应该显示(未启用的关系卡隐藏)
function cardVisible(card: EventCard): boolean {
  if (card.kind === 'life') return true
  if (card.anchor === 'self') return true
  return people[card.anchor]?.enabled ?? false
}

const visibleCards = computed(() => cards.filter(cardVisible))
const relationCards = computed(() => visibleCards.value.filter(c => c.kind === 'relation'))
const lifeCards = computed(() => visibleCards.value.filter(c => c.kind === 'life'))

// —— 揭示:爸妈第一张硬置顶,其余按 % 排序 ——
const revealCards = computed(() => {
  const eligible = visibleCards.value.filter(c => remainingFor(c) > 0)
  const parents = eligible.find(c => c.id === 'parents')
  const rest = eligible
    .filter(c => c.id !== 'parents')
    .sort((a, b) => percentRemaining(a) - percentRemaining(b))
  const combined = parents ? [parents, ...rest] : rest
  return combined.slice(0, 4)
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

// 大数字卡用进度条(> 300 次/天)
function useBar(card: EventCard): boolean {
  return remainingFor(card) + passedFor(card) > 300
}

// —— 音效(极轻的"叮",Web Audio API,用户点击后 unlock) ——
let audioCtx: AudioContext | null = null
let audioUnlocked = false
function playDing(freq = 880, duration = 0.15, volume = 0.06) {
  if (!audioUnlocked) return
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const ctx = audioCtx
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = freq
    gain.gain.setValueAtTime(0, ctx.currentTime)
    gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)
    osc.connect(gain).connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + duration)
  } catch {}
}
function unlockAudio() {
  audioUnlocked = true
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
  } catch {}
}

// —— Intro 打字机 ——
let introTimer: ReturnType<typeof setTimeout> | null = null
let typingTimer: ReturnType<typeof setTimeout> | null = null

function typeLine(idx: number, onDone: () => void) {
  if (isFinaleLine(idx)) {
    // 最后一句直接淡入,不打字
    typedChars.value[idx] = introLines[idx].length
    typingDone.value[idx] = true
    setTimeout(onDone, 1400)
    return
  }
  const text = introLines[idx]
  let i = 0
  const step = () => {
    if (stage.value !== 'intro') return
    if (i > text.length) {
      typingDone.value[idx] = true
      // 打完停留 1.4s 让用户念完
      typingTimer = setTimeout(onDone, 1400)
      return
    }
    typedChars.value[idx] = i
    i++
    typingTimer = setTimeout(step, 60)
  }
  step()
}

function startIntroFlow() {
  const advance = () => {
    if (stage.value !== 'intro') return
    if (introStep.value >= introLines.length - 1) return
    introStep.value++
    typeLine(introStep.value, advance)
  }
  typeLine(0, advance)
}

function skipIntro() {
  if (introTimer) clearTimeout(introTimer)
  if (typingTimer) clearTimeout(typingTimer)
  // 全部填满
  typedChars.value = introLines.map(l => l.length)
  typingDone.value = introLines.map(() => true)
  introStep.value = introLines.length - 1
}

function startOnboarding() {
  unlockAudio()
  if (introTimer) clearTimeout(introTimer)
  if (typingTimer) clearTimeout(typingTimer)
  stage.value = 'onboarding'
  playDing(660, 0.12, 0.04)
}

function nextOnboarding() {
  const q = questions.value[onboardingStep.value]
  if (onboardingStep.value < questions.value.length - 1) {
    onboardingStep.value++
    playDing(880, 0.08, 0.03)
  } else {
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

function toggleRelation(personId: Person['id']) {
  people[personId].enabled = !people[personId].enabled
  playDing(660, 0.08, 0.03)
}

let revealTimer: ReturnType<typeof setTimeout> | null = null
function startRevealAutoplay() {
  const advance = () => {
    if (stage.value !== 'reveal') return
    if (revealStep.value < revealCards.value.length) {
      revealStep.value++
      playDing(1046, 0.18, 0.05)
      revealTimer = setTimeout(advance, 3600)
    }
  }
  revealTimer = setTimeout(advance, 1400)
}

function skipReveal() {
  if (revealTimer) clearTimeout(revealTimer)
  stage.value = 'quote'
}

function enterQuote() {
  if (revealTimer) clearTimeout(revealTimer)
  stage.value = 'quote'
  playDing(660, 0.2, 0.05)
}

function enterApp() {
  stage.value = 'app'
  saveToStorage()
  playDing(880, 0.15, 0.04)
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
    kind: 'life',
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
  Object.assign(people, defaultPeople())
  cards.splice(0, cards.length, ...defaultCards())
  editingId.value = null
  settingsOpen.value = false
  overflowOpen.value = false
}

function replayIntro() {
  stage.value = 'intro'
  introStep.value = 0
  onboardingStep.value = 0
  revealStep.value = 0
  typedChars.value = [0, 0, 0, 0]
  typingDone.value = [false, false, false, false]
  overflowOpen.value = false
  startIntroFlow()
}

// —— 深色模式(独立于站点) ——
const darkMode = ref(false)
function toggleDark() {
  darkMode.value = !darkMode.value
  try {
    localStorage.setItem('wbw-tail-end-dark', darkMode.value ? '1' : '0')
  } catch {}
}

// —— 持久化 ——
function saveToStorage() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      people,
      cards,
      stage: 'app',
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
        stage.value = 'app'
      }
    }
    const d = localStorage.getItem('wbw-tail-end-dark')
    if (d === '1') darkMode.value = true
    else if (d === '0') darkMode.value = false
    else {
      // 首次访问跟随系统
      darkMode.value = window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false
    }
  } catch {}
}

onMounted(() => {
  loadFromStorage()
  if (stage.value === 'intro') {
    startIntroFlow()
  }
})

onUnmounted(() => {
  if (introTimer) clearTimeout(introTimer)
  if (typingTimer) clearTimeout(typingTimer)
  if (revealTimer) clearTimeout(revealTimer)
})

watch([people, cards], () => {
  if (stage.value === 'app') saveToStorage()
}, { deep: true })

// Lucide-style 内联 SVG 图标(单色线条)
const ICONS: Record<string, string> = {
  moon:  '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>',
  plane: '<path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/>',
  book:  '<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/>',
  film:  '<rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="2" y1="7" x2="7" y2="7"/><line x1="2" y1="17" x2="7" y2="17"/><line x1="17" y1="17" x2="22" y2="17"/><line x1="17" y1="7" x2="22" y2="7"/>',
  petal: '<path d="M12 2s4 4 4 8-4 8-4 8-4-4-4-8 4-8 4-8z"/><path d="M12 22c-4 0-8-4-8-8 0 0 4 0 8 4 4-4 8-4 8-4 0 4-4 8-8 8z"/>',
  wave:  '<path d="M2 6c3 0 3 2 6 2s3-2 6-2 3 2 6 2"/><path d="M2 12c3 0 3 2 6 2s3-2 6-2 3 2 6 2"/><path d="M2 18c3 0 3 2 6 2s3-2 6-2 3 2 6 2"/>',
  cup:   '<path d="M17 8h1a4 4 0 1 1 0 8h-1"/><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V8z"/><line x1="6" y1="2" x2="6" y2="4"/><line x1="10" y1="2" x2="10" y2="4"/><line x1="14" y1="2" x2="14" y2="4"/>',
}
function iconSvg(name?: string): string {
  const inner = ICONS[name || ''] || ''
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`
}
</script>

<template>
  <div class="app" :class="{ 'is-dark': darkMode }">
    <!-- ===== INTRO ===== -->
    <transition name="stage">
      <section v-if="stage === 'intro'" class="stage-full intro">
        <div class="intro-inner">
          <div class="intro-lines">
            <p
              v-for="(line, i) in introLines"
              v-show="i <= introStep"
              :key="i"
              class="intro-line"
              :class="{
                'is-current': i === introStep,
                'is-past': i < introStep,
                'is-finale': isFinaleLine(i),
                'is-typing': !typingDone[i],
              }"
            >
              <span class="typed">{{ line.slice(0, typedChars[i]) }}</span>
              <span
                v-if="!isFinaleLine(i) && !typingDone[i] && i === introStep"
                class="caret"
              ></span>
            </p>
          </div>

          <transition name="fade">
            <div v-if="introStep === introLines.length - 1 && typingDone[introLines.length - 1]" class="intro-cta">
              <button class="cta-button cta-hero" @click="startOnboarding">
                <span>开始</span>
                <span class="arrow">→</span>
              </button>
              <p class="intro-hint">数据只留在你自己的浏览器里。</p>
            </div>
          </transition>

          <button class="skip-link intro-skip" @click="skipIntro" v-if="introStep < introLines.length - 1 || !typingDone[introLines.length - 1]">跳过 →</button>
        </div>
      </section>
    </transition>

    <!-- ===== ONBOARDING ===== -->
    <transition name="stage">
      <section v-if="stage === 'onboarding'" class="stage-full onboarding">
        <div class="onboarding-progress">
          <div
            v-for="(q, i) in questions"
            :key="q.key"
            class="progress-dot"
            :class="{
              done: i < onboardingStep,
              current: i === onboardingStep,
            }"
          ></div>
        </div>

        <div class="onboarding-inner">
          <transition name="question" mode="out-in">
            <div :key="onboardingStep" class="question-block">
              <p class="question-prompt">{{ questions[onboardingStep].prompt }}</p>
              <p v-if="questions[onboardingStep].sub" class="question-sub">
                {{ questions[onboardingStep].sub }}
              </p>

              <!-- 开关式问题 -->
              <div
                v-if="questions[onboardingStep].toggle"
                class="toggle-choices"
              >
                <button
                  class="toggle-btn"
                  :class="{ active: people[questions[onboardingStep].toggle!.person].enabled }"
                  @click="people[questions[onboardingStep].toggle!.person].enabled = true; nextOnboarding()"
                >有</button>
                <button
                  class="toggle-btn"
                  :class="{ active: !people[questions[onboardingStep].toggle!.person].enabled }"
                  @click="people[questions[onboardingStep].toggle!.person].enabled = false; nextOnboarding()"
                >没有</button>
              </div>

              <!-- 数值型问题 -->
              <div v-else class="question-fields">
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
                    @keydown.enter="nextOnboarding"
                    class="big-input"
                    :aria-label="questions[onboardingStep].prompt"
                  />
                  <span class="field-suffix">{{ field.suffix }}</span>
                </div>
              </div>

              <div class="question-actions" v-if="!questions[onboardingStep].toggle">
                <button v-if="onboardingStep > 0" class="btn-ghost" @click="prevOnboarding">
                  ← 上一步
                </button>
                <button class="cta-button" @click="nextOnboarding">
                  {{ onboardingStep === questions.length - 1 ? '看看结果 →' : '下一步 →' }}
                </button>
              </div>
              <div class="question-actions minor" v-else>
                <button v-if="onboardingStep > 0" class="btn-ghost" @click="prevOnboarding">
                  ← 上一步
                </button>
              </div>
            </div>
          </transition>
        </div>
      </section>
    </transition>

    <!-- ===== REVEAL ===== -->
    <transition name="stage">
      <section v-if="stage === 'reveal'" class="stage-full reveal">
        <div class="reveal-inner">
          <p class="reveal-eyebrow">这就是你剩下的人生。</p>

          <div class="reveal-stage">
            <transition-group name="reveal-item" tag="div" class="reveal-list">
              <div
                v-for="card in revealCards.slice(0, revealStep)"
                :key="card.id"
                class="reveal-item"
                :class="{ 'is-parent': card.id === 'parents' }"
              >
                <div class="reveal-icon">
                  <span v-if="card.emoji">{{ card.emoji }}</span>
                  <span v-else v-html="iconSvg(card.icon)"></span>
                </div>
                <div class="reveal-body">
                  <div class="reveal-name">{{ card.name }}</div>
                  <div class="reveal-num-line">
                    <span class="reveal-remaining">{{ remainingFor(card) }}</span>
                    <span class="reveal-unit">{{ unitFor(card) }}</span>
                  </div>
                  <div class="reveal-pct">仅剩 {{ percentRemaining(card) }}%</div>
                </div>
              </div>
            </transition-group>
          </div>

          <transition name="fade">
            <button
              v-if="revealStep >= revealCards.length"
              class="cta-button reveal-cta"
              @click="enterQuote"
            >
              继续 →
            </button>
          </transition>

          <button class="skip-link reveal-skip" @click="skipReveal">跳过 →</button>
        </div>
      </section>
    </transition>

    <!-- ===== QUOTE ===== -->
    <transition name="stage">
      <section v-if="stage === 'quote'" class="stage-full quote-stage">
        <div class="quote-inner">
          <p class="quote-body">
            看清楚人生剩下的部分，<br />
            不是关于"时间"，<br />
            而是关于"选择"——<br /><br />
            你选择把剩下的次数，<br />
            分给谁，给什么。
          </p>
          <p class="quote-attr">—— 改写自 Tim Urban 的原意</p>
          <button class="cta-button quote-cta" @click="enterApp">
            开始你的清单 →
          </button>
        </div>
      </section>
    </transition>

    <!-- ===== APP ===== -->
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
              <button
                class="header-btn"
                @click="settingsOpen = !settingsOpen; overflowOpen = false"
                :aria-label="settingsOpen ? '收起调整' : '调整'"
              >
                <span class="gear">⚙</span>
                <span>{{ settingsOpen ? '收起' : '调整' }}</span>
              </button>
              <div class="overflow-wrap">
                <button
                  class="header-btn icon-only"
                  @click="overflowOpen = !overflowOpen"
                  aria-label="更多"
                >⋯</button>
                <transition name="fade">
                  <div v-if="overflowOpen" class="overflow-menu" @click.self="overflowOpen = false">
                    <button @click="toggleDark(); overflowOpen = false">
                      {{ darkMode ? '☀️ 浅色' : '🌙 深色' }}
                    </button>
                    <button @click="replayIntro">↺ 重新开始</button>
                    <button @click="resetAll">↻ 恢复默认数据</button>
                  </div>
                </transition>
              </div>
            </div>
          </div>
        </header>

        <!-- Settings drawer -->
        <transition name="drawer">
          <div v-if="settingsOpen" class="settings">
            <div class="settings-inner">
              <div v-for="p in Object.values(people)" :key="p.id" class="settings-group">
                <div class="settings-label">
                  <span>{{ p.label }}</span>
                  <label v-if="p.id !== 'self'" class="switch-mini">
                    <input type="checkbox" v-model="p.enabled" />
                    <span class="switch-slider"></span>
                  </label>
                </div>
                <div class="settings-fields" v-if="p.enabled || p.id === 'self'">
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
            <p class="hero-anchor">
              约 <strong>{{ weeksLeft.toLocaleString() }}</strong> 周<span v-if="parentDaysLeft > 0"> · 和爸妈还剩约 <strong>{{ parentDaysLeft }}</strong> 天</span>
            </p>
            <p class="hero-sub">
              你今年 {{ people.self.age }} 岁，已经走过人生的 {{ lifePercent }}%。<br />
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

        <!-- Relation zone -->
        <section v-if="relationCards.length" class="cards-section">
          <div class="section-title">
            <span class="section-line"></span>
            <span class="section-label">和你在乎的人</span>
            <span class="section-line"></span>
          </div>
          <div class="cards relations">
            <div v-for="card in relationCards" :key="card.id" class="card card-relation">
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

              <!-- 大数字 → 进度条,小数字 → 点阵 -->
              <div v-if="useBar(card)" class="progress-bar-wrap">
                <div class="progress-bar-track">
                  <div class="progress-bar-past" :style="{ width: (passedFor(card) / (passedFor(card) + remainingFor(card)) * 100) + '%' }"></div>
                </div>
                <div class="progress-bar-legend">
                  <span>{{ passedFor(card) }} 已过</span>
                  <span>{{ remainingFor(card) }} 还剩</span>
                </div>
              </div>
              <div v-else class="dots">
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
                <span v-if="!useBar(card) && dotsFor(card).scale > 1" class="scale-hint">每格 = {{ dotsFor(card).scale }} {{ unitFor(card) }}</span>
              </div>
            </div>
          </div>
        </section>

        <!-- Life events zone -->
        <section v-if="lifeCards.length" class="cards-section life-section">
          <div class="section-title">
            <span class="section-line"></span>
            <span class="section-label">和你自己的时光</span>
            <span class="section-line"></span>
          </div>
          <div class="cards lifes">
            <div v-for="card in lifeCards" :key="card.id" class="card card-life">
              <div class="card-top">
                <div class="card-icon" v-html="iconSvg(card.icon)"></div>
                <div class="card-meta">
                  <div class="card-name">{{ card.name }}</div>
                  <div class="card-freq">每年 {{ card.perYear }} {{ unitFor(card) }}</div>
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

              <div v-if="useBar(card)" class="progress-bar-wrap">
                <div class="progress-bar-track">
                  <div class="progress-bar-past" :style="{ width: (passedFor(card) / (passedFor(card) + remainingFor(card)) * 100) + '%' }"></div>
                </div>
                <div class="progress-bar-legend">
                  <span>{{ passedFor(card) }} 已过</span>
                  <span>{{ remainingFor(card) }} 还剩</span>
                </div>
              </div>
              <div v-else class="dots">
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
                <span v-if="!useBar(card) && dotsFor(card).scale > 1" class="scale-hint">每格 = {{ dotsFor(card).scale }} {{ unitFor(card) }}</span>
              </div>
            </div>

            <button class="add-card" @click="addCard">
              <span class="plus">+</span>
              <span>添加你自己的事件</span>
            </button>
          </div>
        </section>

        <footer class="app-footer">
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
/* —— 字体导入 —— */
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=Newsreader:opsz,wght@6..72,400;6..72,500;6..72,600&family=Inter:wght@400;500;600;700&display=swap');
@import url('https://cdn.jsdelivr.net/npm/lxgw-wenkai-webfont@1.7.0/style.css');

/* —— App shell —— */
.app {
  --app-bg: #f7f3ec;
  --app-surface: #ffffff;
  --app-surface-2: #efe9df;
  --app-border: #dbd4c4;
  --app-text-1: #1c1a17;
  --app-text-2: #4a4640;
  --app-text-3: #948d80;
  --app-accent: #d4541f;
  --app-accent-soft: rgba(212, 84, 31, 0.10);
  --app-accent-2: #ef7a4f;
  --app-deep: #2a2320;
  --shadow-sm: 0 1px 2px rgba(20, 20, 20, 0.04);
  --shadow-md: 0 4px 16px rgba(20, 20, 20, 0.06);
  --shadow-lg: 0 12px 40px rgba(20, 20, 20, 0.10);
  --font-serif: 'Fraunces', 'Newsreader', 'LXGW WenKai', 'Noto Serif SC', Georgia, serif;
  --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Helvetica Neue', sans-serif;
  --font-cn: 'LXGW WenKai', 'Noto Serif SC', 'PingFang SC', serif;

  min-height: 100vh;
  background: var(--app-bg);
  color: var(--app-text-1);
  font-family: var(--font-sans);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  position: relative;
  overflow-x: hidden;
  transition: background 0.4s ease, color 0.4s ease;
}

/* 独立深色模式(不依赖站点全局) */
.app.is-dark {
  --app-bg: #14110e;
  --app-surface: #1e1a15;
  --app-surface-2: #26221c;
  --app-border: #3a332a;
  --app-text-1: #ede8de;
  --app-text-2: #b8b0a1;
  --app-text-3: #7a7264;
  --app-accent: #ef7a4f;
  --app-accent-soft: rgba(239, 122, 79, 0.16);
  --app-accent-2: #f59168;
  --app-deep: #efe9df;
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.4);
  --shadow-md: 0 4px 16px rgba(0, 0, 0, 0.5);
  --shadow-lg: 0 12px 40px rgba(0, 0, 0, 0.6);
}

/* 全屏台阶 */
.stage-enter-active, .stage-leave-active {
  transition: opacity 0.7s ease;
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
  background:
    radial-gradient(ellipse at 50% 40%, var(--app-accent-soft) 0%, transparent 60%),
    var(--app-bg);
}
.intro-inner {
  max-width: 720px;
  width: 100%;
  text-align: center;
}
.intro-lines {
  min-height: 52vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 20px;
}
.intro-line {
  font-family: var(--font-cn);
  font-size: clamp(1.6rem, 3.8vw, 2.4rem);
  font-weight: 400;
  color: var(--app-text-2);
  letter-spacing: 0.02em;
  line-height: 1.6;
  margin: 0;
  opacity: 0.55;
  transition: opacity 0.5s ease, color 0.5s ease;
}
.intro-line.is-past { opacity: 0.4; }
.intro-line.is-current {
  color: var(--app-text-1);
  opacity: 1;
}
.intro-line.is-finale {
  font-family: var(--font-serif);
  font-size: clamp(2.4rem, 6vw, 3.6rem);
  font-weight: 500;
  font-style: italic;
  color: var(--app-accent);
  letter-spacing: -0.01em;
  line-height: 1.3;
  margin-top: 20px;
  animation: finaleIn 1.4s cubic-bezier(0.2, 0.8, 0.2, 1);
}
@keyframes finaleIn {
  from { opacity: 0; transform: translateY(16px); filter: blur(4px); }
  to { opacity: 1; transform: translateY(0); filter: blur(0); }
}
.caret {
  display: inline-block;
  width: 2px;
  height: 1em;
  background: var(--app-accent);
  margin-left: 4px;
  vertical-align: -0.14em;
  animation: caretBlink 1s step-end infinite;
}
@keyframes caretBlink {
  50% { opacity: 0; }
}
.intro-cta {
  margin-top: 40px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}
.intro-hint {
  font-size: 0.78rem;
  color: var(--app-text-3);
  margin: 0;
}
.intro-skip {
  position: absolute;
  top: 24px;
  right: 24px;
  bottom: auto;
}

/* ============================
   ONBOARDING
   ============================ */
.onboarding { background: var(--app-bg); }
.onboarding-progress {
  position: absolute;
  top: 40px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 8px;
}
.progress-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: transparent;
  border: 1.5px solid var(--app-border);
  transition: background 0.3s, border-color 0.3s, transform 0.3s;
}
.progress-dot.done {
  background: var(--app-accent);
  border-color: var(--app-accent);
}
.progress-dot.current {
  transform: scale(1.6);
  border-color: var(--app-accent);
  background: transparent;
  box-shadow: 0 0 0 3px var(--app-accent-soft);
}
.onboarding-inner {
  max-width: 560px;
  width: 100%;
  text-align: center;
}
.question-block {
  padding: 40px 0;
}
.question-prompt {
  font-family: var(--font-serif);
  font-size: clamp(2rem, 4.6vw, 2.8rem);
  font-weight: 500;
  color: var(--app-text-1);
  line-height: 1.35;
  margin: 0 0 14px;
  letter-spacing: -0.015em;
}
.question-sub {
  color: var(--app-text-3);
  font-size: 1rem;
  margin: 0 0 40px;
  line-height: 1.6;
  font-family: var(--font-cn);
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
  width: 160px;
  padding: 14px 20px;
  border: none;
  border-bottom: 3px solid var(--app-accent-soft);
  background: transparent;
  color: var(--app-accent);
  font-size: clamp(3rem, 8vw, 4.4rem);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  text-align: center;
  font-family: var(--font-serif);
  transition: border-color 0.2s, box-shadow 0.2s;
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
  box-shadow: 0 4px 0 -1px var(--app-accent-soft);
}
.field-suffix {
  color: var(--app-text-2);
  font-size: 1.4rem;
  font-weight: 500;
  font-family: var(--font-cn);
}
.question-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  align-items: center;
  flex-wrap: wrap;
}
.question-actions.minor { min-height: 40px; }

.toggle-choices {
  display: flex;
  gap: 20px;
  justify-content: center;
  margin-bottom: 40px;
}
.toggle-btn {
  padding: 18px 40px;
  border: 2px solid var(--app-border);
  border-radius: 999px;
  background: var(--app-surface);
  color: var(--app-text-1);
  font-family: var(--font-cn);
  font-size: 1.3rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  min-width: 120px;
}
.toggle-btn:hover {
  border-color: var(--app-accent);
  color: var(--app-accent);
  transform: translateY(-2px);
  box-shadow: 0 8px 20px color-mix(in srgb, var(--app-accent) 20%, transparent);
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
   REVEAL(深色情绪)
   ============================ */
.reveal {
  background: linear-gradient(180deg, var(--app-deep) 0%, #1a1410 100%);
  color: #f5eee0;
  justify-content: flex-start;
  padding-top: 12vh;
}
.app.is-dark .reveal {
  background: linear-gradient(180deg, #0a0806 0%, #1a1410 100%);
}
.reveal-inner {
  max-width: 640px;
  width: 100%;
  text-align: center;
}
.reveal-eyebrow {
  color: rgba(245, 238, 224, 0.55);
  font-size: 1.05rem;
  margin: 0 0 48px;
  font-weight: 400;
  letter-spacing: 0.08em;
  font-family: var(--font-cn);
}
.reveal-stage { min-height: 60vh; }
.reveal-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 40px;
}
.reveal-item {
  display: flex;
  align-items: center;
  gap: 22px;
  padding: 26px 24px;
  background: rgba(255, 250, 240, 0.05);
  border: 1px solid rgba(255, 250, 240, 0.08);
  border-radius: 18px;
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  text-align: left;
}
.reveal-item.is-parent {
  background: rgba(239, 122, 79, 0.12);
  border-color: rgba(239, 122, 79, 0.28);
  box-shadow: 0 8px 40px rgba(239, 122, 79, 0.18);
}
.reveal-icon {
  font-size: 2.6rem;
  flex-shrink: 0;
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(245, 238, 224, 0.75);
}
.reveal-icon svg {
  width: 40px;
  height: 40px;
}
.reveal-body { flex: 1; }
.reveal-name {
  font-size: 0.95rem;
  color: rgba(245, 238, 224, 0.65);
  margin-bottom: 4px;
  font-family: var(--font-cn);
}
.reveal-num-line {
  display: flex;
  align-items: baseline;
  gap: 8px;
}
.reveal-remaining {
  font-family: var(--font-serif);
  font-size: clamp(2.8rem, 6vw, 3.8rem);
  font-weight: 600;
  color: #ef7a4f;
  font-variant-numeric: tabular-nums;
  line-height: 1;
  letter-spacing: -0.02em;
}
.reveal-item.is-parent .reveal-remaining { color: #ffb894; }
.reveal-unit {
  color: rgba(245, 238, 224, 0.7);
  font-size: 1.1rem;
  font-family: var(--font-cn);
}
.reveal-pct {
  margin-top: 8px;
  font-size: 0.9rem;
  color: rgba(239, 122, 79, 0.75);
  font-weight: 500;
  letter-spacing: 0.04em;
}
.reveal-cta {
  margin-top: 8px;
  background: rgba(255, 250, 240, 0.1);
  color: #f5eee0;
  border: 1px solid rgba(255, 250, 240, 0.2);
  backdrop-filter: blur(20px);
}
.reveal-cta:hover {
  background: var(--app-accent);
  color: white;
  border-color: var(--app-accent);
}
.reveal-skip {
  color: rgba(245, 238, 224, 0.4);
}
.reveal-skip:hover { color: rgba(245, 238, 224, 0.9); }

.reveal-item-enter-active {
  transition: opacity 1s ease, transform 1s cubic-bezier(0.2, 0.8, 0.2, 1), filter 1s ease;
}
.reveal-item-enter-from {
  opacity: 0;
  transform: translateY(24px) scale(0.98);
  filter: blur(6px);
}

/* ============================
   QUOTE 屏
   ============================ */
.quote-stage {
  background: linear-gradient(180deg, #1a1410 0%, var(--app-bg) 100%);
}
.app.is-dark .quote-stage {
  background: linear-gradient(180deg, #1a1410 0%, var(--app-bg) 100%);
}
.quote-inner {
  max-width: 620px;
  width: 100%;
  text-align: center;
  padding: 40px 24px;
}
.quote-body {
  font-family: var(--font-serif);
  font-size: clamp(1.5rem, 3.6vw, 2.2rem);
  font-style: italic;
  font-weight: 400;
  line-height: 1.7;
  color: var(--app-text-1);
  margin: 0 0 32px;
  letter-spacing: -0.005em;
  animation: quoteIn 1.6s cubic-bezier(0.2, 0.8, 0.2, 1);
}
@keyframes quoteIn {
  from { opacity: 0; transform: translateY(20px); filter: blur(6px); }
  to { opacity: 1; transform: translateY(0); filter: blur(0); }
}
.quote-attr {
  font-size: 0.9rem;
  color: var(--app-text-3);
  margin: 0 0 48px;
  animation: quoteIn 1.6s 0.6s both cubic-bezier(0.2, 0.8, 0.2, 1);
}
.quote-cta {
  animation: quoteIn 1.6s 1.2s both cubic-bezier(0.2, 0.8, 0.2, 1);
}

/* ============================
   COMMON BUTTONS
   ============================ */
.cta-button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 14px 34px;
  background: var(--app-accent);
  color: white;
  border: none;
  border-radius: 999px;
  font-family: var(--font-cn);
  font-size: 1.05rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 16px color-mix(in srgb, var(--app-accent) 30%, transparent);
  letter-spacing: 0.02em;
}
.cta-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px color-mix(in srgb, var(--app-accent) 45%, transparent);
}
.cta-button:hover .arrow { transform: translateX(3px); }
.cta-button:active { transform: translateY(0); }
.cta-button.cta-hero {
  padding: 18px 44px;
  font-size: 1.15rem;
}
.arrow { transition: transform 0.2s; }
.btn-ghost {
  padding: 10px 20px;
  background: transparent;
  border: none;
  color: var(--app-text-3);
  font-family: var(--font-cn);
  font-size: 0.95rem;
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
  font-family: var(--font-cn);
  font-size: 0.88rem;
  cursor: pointer;
  padding: 8px 12px;
  transition: color 0.15s;
  opacity: 0.7;
}
.skip-link:hover { color: var(--app-accent); opacity: 1; }

.fade-enter-active, .fade-leave-active {
  transition: opacity 0.6s ease;
}
.fade-enter-from, .fade-leave-to { opacity: 0; }

/* ============================
   APP MAIN
   ============================ */
.app-main { min-height: 100vh; }
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
  font-family: var(--font-cn);
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
  position: relative;
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
  font-family: var(--font-cn);
  cursor: pointer;
  transition: all 0.18s;
}
.header-btn:hover {
  border-color: var(--app-accent);
  color: var(--app-accent);
}
.header-btn.icon-only {
  padding: 7px 12px;
  font-size: 1.1rem;
  line-height: 0.8;
  letter-spacing: 0;
}
.gear {
  font-size: 0.95rem;
  transition: transform 0.4s ease;
}
.header-btn:hover .gear { transform: rotate(60deg); }

.overflow-wrap { position: relative; }
.overflow-menu {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  background: var(--app-surface);
  border: 1px solid var(--app-border);
  border-radius: 12px;
  box-shadow: var(--shadow-lg);
  padding: 6px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 160px;
  z-index: 30;
}
.overflow-menu button {
  padding: 9px 14px;
  border: none;
  background: transparent;
  color: var(--app-text-1);
  font-family: var(--font-cn);
  font-size: 0.9rem;
  cursor: pointer;
  border-radius: 8px;
  text-align: left;
  transition: background 0.15s;
}
.overflow-menu button:hover {
  background: var(--app-surface-2);
  color: var(--app-accent);
}

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
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--app-text-3);
  text-transform: uppercase;
  letter-spacing: 0.12em;
}
.switch-mini {
  position: relative;
  display: inline-block;
  width: 30px;
  height: 16px;
}
.switch-mini input { opacity: 0; width: 0; height: 0; }
.switch-slider {
  position: absolute;
  cursor: pointer;
  inset: 0;
  background: var(--app-border);
  border-radius: 999px;
  transition: 0.2s;
}
.switch-slider::before {
  content: '';
  position: absolute;
  width: 12px;
  height: 12px;
  left: 2px;
  top: 2px;
  background: white;
  border-radius: 50%;
  transition: 0.2s;
}
.switch-mini input:checked + .switch-slider {
  background: var(--app-accent);
}
.switch-mini input:checked + .switch-slider::before {
  transform: translateX(14px);
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

.drawer-enter-active, .drawer-leave-active {
  transition: max-height 0.3s ease, opacity 0.25s ease;
  overflow: hidden;
}
.drawer-enter-from, .drawer-leave-to {
  max-height: 0;
  opacity: 0;
}
.drawer-enter-to, .drawer-leave-from {
  max-height: 600px;
  opacity: 1;
}

/* Hero */
.hero {
  padding: 80px 24px 48px;
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
  margin-bottom: 28px;
  font-family: var(--font-cn);
}
.hero-title {
  display: flex;
  gap: 16px;
  justify-content: center;
  align-items: baseline;
  margin: 0 0 18px;
  font-family: var(--font-serif);
  font-size: clamp(2.4rem, 5.5vw, 3.8rem);
  font-weight: 500;
  letter-spacing: -0.02em;
  color: var(--app-text-1);
}
.hero-num {
  color: var(--app-accent);
  font-size: 1.5em;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  line-height: 1;
  letter-spacing: -0.03em;
}
.hero-anchor {
  margin: 0 auto 20px;
  color: var(--app-text-2);
  font-size: 1.02rem;
  font-family: var(--font-cn);
  letter-spacing: 0.02em;
}
.hero-anchor strong {
  color: var(--app-accent);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  font-family: var(--font-serif);
}
.hero-sub {
  margin: 0 auto 32px;
  max-width: 480px;
  color: var(--app-text-3);
  font-size: 0.95rem;
  line-height: 1.7;
  font-family: var(--font-cn);
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
  background: linear-gradient(90deg, color-mix(in srgb, var(--app-accent) 30%, var(--app-bg)), var(--app-accent));
  border-radius: 999px;
  transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}
.lifebar-legend {
  display: flex;
  justify-content: space-between;
  margin-top: 12px;
  font-size: 0.82rem;
  color: var(--app-text-3);
  font-family: var(--font-cn);
}
.dot-legend {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 2px;
  margin-right: 6px;
  vertical-align: -1px;
}
.dot-legend.past { background: color-mix(in srgb, var(--app-accent) 25%, var(--app-bg)); }
.dot-legend.future { background: var(--app-accent); }

/* Section title */
.section-title {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-bottom: 24px;
  max-width: 1080px;
  margin-left: auto;
  margin-right: auto;
}
.section-line {
  flex: 1;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--app-border), transparent);
  max-width: 140px;
}
.section-label {
  font-family: var(--font-serif);
  font-size: 1.05rem;
  font-weight: 500;
  color: var(--app-text-2);
  letter-spacing: 0.06em;
  white-space: nowrap;
}

/* Cards section */
.cards-section {
  padding: 24px 24px 40px;
}
.life-section { padding-top: 8px; padding-bottom: 60px; }
.cards {
  max-width: 1080px;
  margin: 0 auto;
  display: grid;
  gap: 20px;
}
.cards.relations {
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
}
.cards.lifes {
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
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
.card-relation {
  background: linear-gradient(180deg, var(--app-surface) 0%, color-mix(in srgb, var(--app-accent) 3%, var(--app-surface)) 100%);
}
.card-life { padding: 18px 18px 16px; }
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
.card-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--app-accent);
  flex-shrink: 0;
}
.card-icon svg {
  width: 22px;
  height: 22px;
}
.card-meta {
  flex: 1;
  min-width: 0;
}
.card-name {
  font-family: var(--font-cn);
  font-size: 1.02rem;
  font-weight: 500;
  color: var(--app-text-1);
  line-height: 1.3;
  margin-bottom: 3px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.card-life .card-name { font-size: 0.95rem; }
.card-freq {
  font-size: 0.78rem;
  color: var(--app-text-3);
  font-variant-numeric: tabular-nums;
  font-family: var(--font-cn);
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
  font-family: var(--font-serif);
  font-size: 3.4rem;
  font-weight: 600;
  line-height: 0.95;
  color: var(--app-accent);
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.03em;
}
.card-life .headline-num { font-size: 2.6rem; }
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
  font-family: var(--font-cn);
}
.headline-pct {
  font-size: 0.72rem;
  color: var(--app-text-3);
  font-variant-numeric: tabular-nums;
  font-family: var(--font-cn);
}

/* Progress bar (大数字卡) */
.progress-bar-wrap {
  padding: 8px 0 6px;
}
.progress-bar-track {
  height: 6px;
  background: var(--app-surface-2);
  border-radius: 999px;
  overflow: hidden;
  position: relative;
}
.progress-bar-past {
  height: 100%;
  background: color-mix(in srgb, var(--app-accent) 30%, var(--app-bg));
  border-radius: 999px;
  position: relative;
}
.progress-bar-past::after {
  content: '';
  position: absolute;
  right: 0;
  top: -2px;
  bottom: -2px;
  width: 2px;
  background: var(--app-accent);
  border-radius: 2px;
  box-shadow: 0 0 0 2px var(--app-accent-soft);
}
.progress-bar-legend {
  display: flex;
  justify-content: space-between;
  margin-top: 8px;
  font-size: 0.72rem;
  color: var(--app-text-3);
  font-variant-numeric: tabular-nums;
  font-family: var(--font-cn);
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
.dot.past {
  background: color-mix(in srgb, var(--app-accent) 22%, var(--app-bg));
  border: 1px solid color-mix(in srgb, var(--app-accent) 15%, var(--app-border));
  box-sizing: border-box;
}
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
  font-family: var(--font-cn);
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
  font-family: var(--font-cn);
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
  padding: 40px 24px 80px;
  text-align: center;
  border-top: 1px solid var(--app-border);
  background: var(--app-surface);
}
.footer-links {
  display: flex;
  gap: 12px;
  justify-content: center;
  align-items: center;
  margin-bottom: 16px;
  font-size: 0.88rem;
  font-family: var(--font-cn);
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
  font-family: var(--font-cn);
}

/* Mobile */
@media (max-width: 640px) {
  .hero { padding: 48px 20px 32px; }
  .hero-title { gap: 10px; }
  .cards-section { padding: 20px 16px 32px; }
  .cards.relations, .cards.lifes { grid-template-columns: 1fr; gap: 14px; }
  .card { padding: 18px; border-radius: 14px; }
  .card-emoji { width: 40px; height: 40px; font-size: 1.4rem; border-radius: 12px; }
  .headline-num { font-size: 2.6rem; }
  .card-life .headline-num { font-size: 2.2rem; }
  .edit-panel { grid-template-columns: 1fr 1fr; }
  .settings-inner { padding: 16px 20px; gap: 20px; }
  .settings-fields { flex-wrap: wrap; }
  .field input { width: 80px; }
  .header-inner { padding: 12px 16px; }
  .brand-text { font-size: 0.82rem; }
  .app-footer { padding: 36px 20px 56px; }
  .big-input { font-size: clamp(2.6rem, 12vw, 3.4rem); width: 130px; padding: 10px 14px; }
  .reveal { padding-top: 8vh; }
  .reveal-remaining { font-size: 2.4rem; }
  .reveal-icon { font-size: 2rem; width: 44px; height: 44px; }
  .reveal-icon svg { width: 32px; height: 32px; }
  .toggle-btn { padding: 14px 32px; font-size: 1.15rem; }
  .section-label { font-size: 0.95rem; }
  .section-line { max-width: 60px; }
  .quote-body { font-size: clamp(1.3rem, 5vw, 1.7rem); line-height: 1.75; }
  .intro-skip { top: 16px; right: 16px; }
  .overflow-menu { min-width: 140px; }
}
</style>
