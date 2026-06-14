/// <reference types="vite/client" />

// Vue SFC module declaration | Vue 单文件组件模块声明
declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
  export default component
}

// Environment variables | 环境变量
interface ImportMetaEnv {
  readonly VITE_BASE_URL?: string
  readonly VITE_APP_API_BASE_URL?: string
  readonly VITE_EXTERNAL_API_BASE_URL?: string
  readonly VITE_UPLOAD_TYPE?: string
  readonly DEV: boolean
  readonly PROD: boolean
  readonly MODE: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

// Globals mounted on window | 挂载在 window 上的全局对象
interface Window {
  $message?: import('naive-ui').MessageApi
  $dialog?: import('naive-ui').DialogApi
  $showLoginModal?: () => void
  $handleSessionExpire?: () => void
  __aiCanvasProjects?: Record<string, unknown>
}
