/**
 * HTTP Request Utility | HTTP 请求工具
 * Axios-based request with interceptors
 */

import axios from 'axios'
import type { AxiosError, AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios'
import { getAccessToken, getRefreshToken, setTokens } from './auth'
import { AUTH_BASE_URL, DEFAULT_API_BASE_URL, TENANT_ID } from './constants'

// Queued subscriber waiting for token refresh | 等待 token 刷新的排队订阅者
interface RefreshSubscriber {
  resolve: (token: string) => void
  reject: (error: unknown) => void
}

// Extend axios config with internal retry flag | 扩展 axios 配置，加入内部重试标志
type RetryableConfig = AxiosRequestConfig & { _retry?: boolean }

// Both instances run a response interceptor that unwraps the backend envelope and
// resolves with the inner `data` (not the AxiosResponse). This interface models that
// real runtime behavior so callers get the unwrapped payload type directly.
// 两个实例的响应拦截器都会解包后端信封、以内层 data（而非 AxiosResponse）resolve。
// 该接口如实描述运行时行为，使调用方直接拿到解包后的负载类型。
export interface UnwrappedClient {
  <T = unknown>(config: AxiosRequestConfig): Promise<T>
  get<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<T>
  delete<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<T>
  post<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T>
  put<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T>
}

const instance = axios.create({
  baseURL: DEFAULT_API_BASE_URL,
  timeout: 30000,
  headers: {
    'tenant-id': TENANT_ID
  }
})

instance.interceptors.request.use(
  (config) => {
    const token = getAccessToken()
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`
    }
    
    return config
  },
  (error) => {
    console.error('Request error:', error)
    return Promise.reject(error)
  }
)

instance.interceptors.response.use(
  (res) => {
    // Attempt to parse standard backend response format: { code, data, msg } | 尝试解析标准后端响应格式
    const { data, code, msg, message } = res.data || {}
    
    if (res.config.responseType === 'stream') {
      return res.data
    }
    
    if (res.data instanceof Blob) {
      return res.data
    }
    
    // Check for success code 0 (backend standard) | 检查成功状态码 0（后端标准）
    if (code === 0) {
      // Return inner data if present, similar to authInstance | 如果存在内部数据则返回，类似 authInstance
      return data !== undefined ? data : res.data
    }

    // Check for loose success (e.g. 3rd party APIs might not have 'code') | 检查宽松成功（例如第三方 API 可能没有 'code'）
    if (code === undefined && res.status === 200) {
      return res.data
    }
    
    // Handle error with msg/message | 处理错误
    const errorMsg = msg || message || 'Request failed'
    window.$message?.error(errorMsg)
    return Promise.reject(new Error(errorMsg))
  },
  (error) => {
    const { response } = error
    
    if (response) {
      const { status, data } = response
      // Prioritize msg from backend error response | 优先使用后端错误响应中的 msg
      const message = data?.msg || data?.message || data?.error?.message || error.message
      
      if (status === 401) {
        window.$handleSessionExpire?.()
      } else if (status === 429) {
        window.$message?.error('请求过于频繁，请稍后再试')
      } else {
        window.$message?.error(message || '请求失败')
      }
    } else {
      window.$message?.error(error.message || '网络错误')
    }
    
    return Promise.reject(error)
  }
)

const authInstance = axios.create({
  baseURL: AUTH_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'tenant-id': TENANT_ID
  }
})

interface RefreshSubscriber {
  resolve: (token: string) => void
  reject: (error: unknown) => void
}

let isRefreshing = false
let refreshSubscribers: RefreshSubscriber[] = []

const onRefreshed = (token: string) => {
  refreshSubscribers.forEach(({ resolve }) => resolve(token))
  refreshSubscribers = []
}

// Reject all queued requests when refresh fails | 刷新失败时拒绝所有排队请求
const onRefreshFailed = (error: unknown) => {
  refreshSubscribers.forEach(({ reject }) => reject(error))
  refreshSubscribers = []
}

const addRefreshSubscriber = (
  resolve: (token: string) => void,
  reject: (error: unknown) => void
) => {
  refreshSubscribers.push({ resolve, reject })
}

const handle401Error = async (config: RetryableConfig) => {
  if (!config._retry) {
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        addRefreshSubscriber(
          (token) => {
            config._retry = true
            config.headers = { ...config.headers, Authorization: `Bearer ${token}` }
            resolve(authInstance(config))
          },
          reject
        )
      })
    }

    config._retry = true
    isRefreshing = true

    try {
      const refreshTokenValue = getRefreshToken()
      if (!refreshTokenValue) {
        throw new Error('No refresh token')
      }

      const res = await axios.post(
        `${AUTH_BASE_URL}/member/auth/refresh-token`,
        { refreshToken: refreshTokenValue },
        {
          headers: {
            'tenant-id': TENANT_ID,
            'Content-Type': 'application/json'
          }
        }
      )

      if (res.data?.code === 0) {
        const { accessToken, refreshToken, expiresTime } = res.data.data
        setTokens({ accessToken, refreshToken, expiresTime })
        onRefreshed(accessToken)
        config.headers = { ...config.headers, Authorization: `Bearer ${accessToken}` }
        return authInstance(config)
      }

      throw new Error('Refresh token failed')
    } catch (refreshError) {
      // Reject all queued requests so callers stop hanging | 拒绝所有排队请求，避免调用方无限挂起
      onRefreshFailed(refreshError)
      window.$handleSessionExpire?.()
      return Promise.reject(refreshError)
    } finally {
      isRefreshing = false
    }
  } else {
    window.$handleSessionExpire?.()
    return Promise.reject(new Error('Session expired'))
  }
}

authInstance.interceptors.request.use(
  (config) => {
    const token = getAccessToken()
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

authInstance.interceptors.response.use(
  (res) => {
    const { code, data, msg } = res.data || {}
    
    if (code === 0) {
      return data
    }
    
    if (code === 401) {
      return handle401Error(res.config)
    }
    
    window.$message?.error(msg || '请求失败')
    return Promise.reject(new Error(msg || '请求失败'))
  },
  async (error) => {
    const { response, config } = error
    
    if (response?.status === 401) {
      return handle401Error(config)
    }
    
    if (response) {
      const { data } = response
      const message = data?.msg || data?.message || error.message
      window.$message?.error(message || '请求失败')
    } else {
      window.$message?.error(error.message || '网络错误')
    }
    
    return Promise.reject(error)
  }
)

// Cast to UnwrappedClient: the response interceptors resolve with the inner data
// rather than the AxiosResponse, so callers receive the unwrapped payload.
// 转型为 UnwrappedClient：响应拦截器以内层 data resolve，调用方拿到解包后的负载。
export const authRequest = authInstance as unknown as UnwrappedClient

export default instance as unknown as UnwrappedClient
