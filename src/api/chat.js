/**
 * Chat API | 对话 API
 */

import { AUTH_BASE_URL, TENANT_ID, getAccessToken, request } from '@/utils'

const joinUrl = (base, path) => {
  const normalizedBase = (base || '').replace(/\/+$/, '')
  const normalizedPath = (path || '').startsWith('/') ? path : `/${path}`
  return `${normalizedBase}${normalizedPath}`
}

// 对话补全
export const chatCompletions = (data) =>
  request({
    url: `/chat/completions`,
    method: 'post',
    data
  })

// 流式对话补全
export const streamChatCompletions = async function* (data, signal) {
  const accessToken = getAccessToken()
  
  const response = await fetch(joinUrl(AUTH_BASE_URL, '/chat/completions'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'tenant-id': TENANT_ID,
      ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {})
    },
    body: JSON.stringify({ ...data, stream: true }),
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
    window.$message?.error(msg)
    throw new Error(msg)
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || !trimmed.startsWith('data:')) continue

      const data = trimmed.slice(5).trim()
      if (data === '[DONE]') return

      try {
        const parsed = JSON.parse(data)
        const content = parsed.choices?.[0]?.delta?.content
        if (content) yield content
      } catch (e) {
        // Skip invalid JSON
      }
    }
  }
}
