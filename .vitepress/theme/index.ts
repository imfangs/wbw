import DefaultTheme from 'vitepress/theme'
import type { Theme } from 'vitepress'
import TailEnd from './components/TailEnd.vue'
import './style.css'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('TailEnd', TailEnd)
  },
} satisfies Theme
