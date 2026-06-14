/**
 * API contract type definitions | API 契约类型定义
 *
 * 对应 utils/request.js 的响应信封与各 api/*.js 模块的数据结构。
 * Mirrors the response envelope in utils/request.js and the data shapes
 * returned by the api/*.js modules.
 */
import type { CanvasData } from './node'

// Standard backend envelope: { code, data, msg } | 后端标准响应信封
export interface ApiEnvelope<T = unknown> {
  code: number
  data: T
  msg?: string
  message?: string
}

// Paginated list result | 分页列表结果
export interface PageResult<T> {
  list: T[]
  total: number
  /** Current page number (mock/legacy responses) | 当前页码（mock/旧响应） */
  page?: number
  /** Page size (mock/legacy responses) | 每页大小（mock/旧响应） */
  size?: number
}

// Token bundle from auth endpoints | 认证端点返回的令牌组
export interface TokenBundle {
  accessToken: string
  refreshToken: string
  expiresTime: number | string
}

// User info | 用户信息
export interface UserInfo {
  id?: string | number
  nickname?: string
  avatar?: string
  mobile?: string
  point?: number
  [key: string]: unknown
}

// Project entity | 项目实体
export interface Project {
  id: string
  name: string
  thumbnail?: string
  canvasData?: CanvasData
  createdAt: string | number | Date
  updatedAt: string | number | Date
  [key: string]: unknown
}
