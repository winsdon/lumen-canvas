/**
 * Chat API | 对话 API
 */

import { AUTH_BASE_URL, TENANT_ID, getAccessToken, request } from '@/utils'

// Error carrying a flag marking it as already surfaced to the user | 标记已向用户提示过的错误
type HandledError = Error & { __handled?: boolean }

const joinUrl = (base: string, path: string): string => {
  const normalizedBase = (base || '').replace(/\/+$/, '')
  const normalizedPath = (path || '').startsWith('/') ? path : `/${path}`
  return `${normalizedBase}${normalizedPath}`
}

// 对话补全
export const chatCompletions = (data: Record<string, unknown>) =>
  request({
    url: `/chat/completions`,
    method: 'post',
    data
  })

// 流式对话补全
export const streamChatCompletions = async function* (
  data: Record<string, unknown>,
  signal?: AbortSignal
) {
  const accessToken = getAccessToken()
  
  const response = await fetch(joinUrl(AUTH_BASE_URL, '/ai/generate/stream'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'tenant-id': String(TENANT_ID),
      ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {})
    },
    body: JSON.stringify(data),
    signal
  })

  if (!response.ok) {
    if (response.status === 401) {
      window.$handleSessionExpire?.()
    }
    let error = null
    try {
      error = await response.json()
    } catch {
      // ignore
    }
    const msg = error?.msg || error?.error?.message || error?.message || 'Stream request failed'
    const streamError: HandledError = new Error(msg)
    streamError.__handled = true
    window.$message?.error(msg)
    throw streamError
  }

  if (!response.body) throw new Error('No response body')
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      // Keep the last incomplete line in buffer
      buffer = lines.pop() || ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed || !trimmed.startsWith('data:')) continue

        const dataStr = trimmed.slice(5).trim()
        if (!dataStr) continue

        try {
          const parsed = JSON.parse(dataStr)
          if (parsed.code === 0 && parsed.data) {
            yield parsed.data
          } else if (parsed.code && parsed.code !== 0) {
            const msg = parsed?.msg || parsed?.error?.message || parsed?.message || '文本生成异常'
            const streamError: HandledError = new Error(msg)
            streamError.__handled = true
            window.$message?.error(msg)
            throw streamError
          }
        } catch (e) {
          // Only re-throw deliberate stream errors; ignore non-JSON keep-alive/comment lines
          // 仅重抛主动构造的流错误；忽略非 JSON 的心跳/注释行
          if ((e as HandledError)?.__handled) {
            throw e
          }
        }
      }
    }
  } finally {
    // Release the reader so the HTTP body connection is freed on early exit
    // 释放 reader，避免消费方提前退出时连接泄漏
    try {
      await reader.cancel()
    } catch {
      // ignore
    }
  }
}
