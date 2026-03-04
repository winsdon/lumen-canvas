/**
 * Constants | 常量配置
 */

// API Base URL | API 基础 URL
export const DEFAULT_API_BASE_URL = import.meta.env.VITE_BASE_URL || 'https://api.chatfire.site/v1'

// Auth API Base URL | 认证 API 基础 URL
export const AUTH_BASE_URL = import.meta.env.VITE_BASE_URL || 'https://api.xmlumen.com/app-api'

// Tenant ID | 租户 ID（固定为 1）
export const TENANT_ID = 1

// API Endpoints | API 端点
export const API_ENDPOINTS = {
  // Model | 模型
  MODEL_PAGE: '/model/page',
  MODEL_FULL_NAME: '/model/fullName',
  MODEL_TYPES: '/model/types',
  
  // Image | 图片
  IMAGE_GENERATIONS: '/images/generations',
  
  // Video | 视频
  VIDEO_GENERATIONS: '/videos',
  VIDEO_TASK: '/videos',
  
  // Chat | 对话
  CHAT_COMPLETIONS: '/chat/completions'
}

// Error Codes | 错误码
export const ERROR_CODES = {
  INVALID_API_KEY: 'INVALID_API_KEY',
  RATE_LIMIT: 'RATE_LIMIT',
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT: 'TIMEOUT',
  UNKNOWN: 'UNKNOWN'
}

// Video Poll Config | 视频轮询配置
export const VIDEO_POLL_CONFIG = {
  MAX_ATTEMPTS: 120,
  POLL_INTERVAL: 5000
}

// Default Chat Config | 默认问答配置
export const DEFAULT_CHAT_CONFIG = {
  supportImage: false,
  supportFile: false,
  supportWeb: false,
  supportDeepThink: false
}

// Default Avatar URL | 默认头像地址
export const DEFAULT_AVATAR_URL = 'https://api.dicebear.com/7.x/avataaars/svg?seed=default'

// Auth Storage Keys | 认证存储键
export const AUTH_STORAGE_KEYS = {
  ACCESS_TOKEN: 'accessToken',
  REFRESH_TOKEN: 'refreshToken',
  EXPIRES_TIME: 'expiresTime',
  USER_INFO: 'userInfo',
  WECHAT_STATE: 'wechatState'
}

// Social Type Enum | 社交类型枚举
export const SOCIAL_TYPE = {
  WECHAT_OPEN: 30,
  WECHAT_MP: 31,
  WECHAT_MINI_APP: 34
}

// SMS Scene Enum | 短信场景枚举
export const SMS_SCENE = {
  LOGIN: 1,
  UPDATE_MOBILE: 2,
  UPDATE_PASSWORD: 3,
  RESET_PASSWORD: 4
}
