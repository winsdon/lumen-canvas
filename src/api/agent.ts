/**
 * Agent API | 智能体 API
 * Communicates with the Python Agent backend via SSE | 通过 SSE 与 Python Agent 后端通信
 */

import { getAccessToken, TENANT_ID } from '@/utils'

// Agent API Base URL | 智能体 API 基础地址
const AGENT_BASE_URL = import.meta.env.VITE_AGENT_URL || 'http://localhost:8100'

/**
 * Stream agent chat via SSE | 通过 SSE 流式对话
 * @param {string} content - User message content | 用户消息内容
 * @param {AbortSignal} [signal] - Optional abort signal | 可选中断信号
 * @yields {{ event: string, data: object }} SSE events
 */
export const streamAgentChat = async function* (content, signal) {
  const accessToken = getAccessToken()

  const response = await fetch(`${AGENT_BASE_URL}/chat/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'text/event-stream',
      'Cache-Control': 'no-cache',
      ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {}),
      'tenant-id': String(TENANT_ID)
    },
    body: JSON.stringify({ content }),
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
    const msg = error?.detail || error?.message || 'Agent request failed'
    const streamError = new Error(msg)
    streamError.__handled = true
    window.$message?.error(msg)
    throw streamError
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  // Track SSE event type across chunk boundaries | 跨 chunk 边界保留事件类型
  // 必须在 while 外声明：一帧可能被拆分到多个 chunk，event 行与 data 行分属不同读取
  let currentEvent = 'message'

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      // Keep the last incomplete line in buffer | 保留最后一行不完整的数据
      buffer = lines.pop() || ''

      for (const line of lines) {
        const trimmed = line.trim()
        // 空行是 SSE 帧分隔符：一帧结束后重置事件类型 | Empty line ends an SSE frame
        if (!trimmed) {
          currentEvent = 'message'
          continue
        }

        // Parse SSE event type | 解析 SSE 事件类型
        if (trimmed.startsWith('event:')) {
          currentEvent = trimmed.slice(6).trim()
          continue
        }

        if (!trimmed.startsWith('data:')) continue

        const dataStr = trimmed.slice(5).trim()
        if (!dataStr) continue

        try {
          const parsed = JSON.parse(dataStr)
          yield { event: currentEvent, data: parsed }
        } catch {
          // Non-JSON data, yield as raw text | 非 JSON 数据，原样返回
          yield { event: currentEvent, data: { content: dataStr } }
        }
      }
    }
  } finally {
    // Release the reader / cancel the body on early exit | 提前退出时释放 reader、取消响应体
    try {
      await reader.cancel()
    } catch {
      // ignore | 忽略取消异常
    }
  }
}
