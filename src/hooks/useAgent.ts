/**
 * useAgent composable | 智能体组合式函数
 * Manages agent conversation state and SSE streaming | 管理智能体对话状态和 SSE 流式通信
 */

import { ref, onScopeDispose } from 'vue'
import { streamAgentChat } from '@/api/agent'
import { addNode, canvasViewport, nodes, addDraft, updateDraft } from '@/stores/canvas'
import { getToolRenderer } from '@/components/agent/toolRendererRegistry'
import { getAccessToken } from '@/utils'

// Conversation message displayed in the agent panel | 智能体面板展示的对话消息
interface AgentMessage {
  id: number
  role: string
  content?: string
  toolName?: string
  toolLabel?: string
  icon?: string
  status?: string
  args?: Record<string, unknown>
  result?: Record<string, unknown> | null
  resultSummary?: string
  hidden?: boolean
}

// SSE payload shapes per event type | 各事件类型的 SSE 数据结构
interface TextEventData {
  content?: string
}
interface ToolCallEventData {
  name?: string
  args?: Record<string, unknown>
}
interface ToolResultEventData {
  name?: string
  result?: { status?: string; error?: string; [key: string]: unknown }
}
interface DraftCreatedEventData {
  draft_id: string
  label: string
  nodes: Parameters<typeof addDraft>[2]
  edges: Parameters<typeof addDraft>[3]
}
interface DraftUpdatedEventData {
  draft_id: string
  changes: Parameters<typeof updateDraft>[1]
}
interface ErrorEventData {
  message?: string
}

// Image payload added to the canvas via addImageToCanvas | 添加到画布的图片数据
interface AgentImageData {
  pic_url?: string
  picUrl?: string
  prompt?: string
}

// Auto-increment message ID counter | 消息自增 ID 计数器
let msgId = 0

/**
 * Create a message object with auto-increment id | 创建带自增 ID 的消息对象
 * @param {object} fields - Message fields
 * @returns {object} Message with id
 */
const createMessage = (fields: Omit<AgentMessage, 'id'>): AgentMessage => ({ id: msgId++, ...fields })

export function useAgent() {
  const messages = ref<AgentMessage[]>([])
  const loading = ref(false)
  const currentResponse = ref('')

  // AbortController for cancelling requests | 用于取消请求的 AbortController
  let abortController: AbortController | null = null

  /**
   * Calculate position for new node | 计算新节点的位置
   */
  const calculatePosition = () => {
    const vp = canvasViewport.value || { x: 0, y: 0, zoom: 1 }
    const baseX = (-vp.x + window.innerWidth / 2) / vp.zoom
    const baseY = (-vp.y + window.innerHeight / 2) / vp.zoom
    const offset = (nodes.value.length % 5) * 40
    return { x: baseX + offset + 100, y: baseY + offset }
  }

  /**
   * Send a message to the agent | 发送消息给智能体
   * @param {string} content - User message text | 用户消息文本
   */
  const send = async (content: string) => {
    if (!content.trim() || loading.value) return

    // Add user message | 添加用户消息
    messages.value = [...messages.value, createMessage({ role: 'user', content })]
    loading.value = true
    currentResponse.value = ''

    // Cancel previous request if any | 取消之前的请求
    if (abortController) {
      abortController.abort()
    }
    // Capture controller locally so a later send/abort can't corrupt this run's cleanup
    // 捕获局部 controller，避免后续 send/abort 干扰本次请求的状态清理
    const localController = new AbortController()
    abortController = localController

    try {
      let textBuffer = ''

      for await (const { event, data } of streamAgentChat(content, localController.signal)) {
        switch (event) {
          case 'text': {
            // Accumulate text deltas | 累积文本增量
            const textData = data as TextEventData
            textBuffer += textData.content || ''
            currentResponse.value = textBuffer
            break
          }

          case 'tool_call': {
            // Flush accumulated text before tool call | 工具调用前先刷新文本
            if (textBuffer.trim()) {
              messages.value = [...messages.value, createMessage({ role: 'assistant', content: textBuffer })]
              textBuffer = ''
              currentResponse.value = ''
            }
            const toolData = data as ToolCallEventData
            const toolName = toolData.name
            const toolConfig = getToolRenderer(toolName as string)
            messages.value = [
              ...messages.value,
              createMessage({
                role: 'tool_call',
                toolName,
                toolLabel: toolConfig.label,
                icon: toolConfig.icon,
                status: 'running',
                args: toolData.args || {},
                result: null,
                resultSummary: ''
              })
            ]
            break
          }

          case 'tool_result': {
            // Flush accumulated text | 刷新累积文本
            if (textBuffer.trim()) {
              messages.value = [...messages.value, createMessage({ role: 'assistant', content: textBuffer })]
              textBuffer = ''
              currentResponse.value = ''
            }
            const resultData = data as ToolResultEventData
            const resultToolName = resultData.name
            const resultConfig = getToolRenderer(resultToolName as string)
            const summary = resultConfig.summarize(resultData.result || {})
            const isError = resultData.result?.status === 'fail' || resultData.result?.error

            // Update existing tool_call message (immutable) | 不可变更新现有工具调用消息
            const statusIdx = messages.value.findIndex(
              msg => msg.role === 'tool_call' && msg.toolName === resultToolName && msg.status === 'running'
            )
            if (statusIdx !== -1) {
              messages.value = messages.value.map((msg, i) =>
                i === statusIdx
                  ? {
                      ...msg,
                      status: isError ? 'error' : 'completed',
                      result: resultData.result || {},
                      resultSummary: isError ? (resultData.result?.error || '执行失败') : summary
                    }
                  : msg
              )
            }
            break
          }

          case 'draft_created': {
            const { draft_id, label, nodes: draftNodes, edges: draftEdges } = data as DraftCreatedEventData
            addDraft(draft_id, label, draftNodes, draftEdges)
            break
          }

          case 'draft_updated': {
            const { draft_id, changes } = data as DraftUpdatedEventData
            updateDraft(draft_id, changes)
            break
          }

          case 'thinking': {
            const thinkingData = data as TextEventData
            const lastMsg = messages.value[messages.value.length - 1]
            if (lastMsg && lastMsg.role === 'thinking') {
              // Accumulate into existing thinking block | 追加到现有 thinking 块
              messages.value = messages.value.map((msg, i) =>
                i === messages.value.length - 1
                  ? { ...msg, content: msg.content + '\n' + (thinkingData.content || '') }
                  : msg
              )
            } else {
              // Flush text buffer first, then create new thinking block
              // 先刷新文本缓冲，再创建新 thinking 块
              if (textBuffer.trim()) {
                messages.value = [...messages.value, createMessage({ role: 'assistant', content: textBuffer })]
                textBuffer = ''
                currentResponse.value = ''
              }
              // Create new thinking block | 创建新 thinking 块
              messages.value = [
                ...messages.value,
                createMessage({ role: 'thinking', content: thinkingData.content || '' })
              ]
            }
            break
          }

          case 'done':
            // Flush remaining text | 刷新剩余文本
            if (textBuffer.trim()) {
              messages.value = [...messages.value, createMessage({ role: 'assistant', content: textBuffer })]
              textBuffer = ''
              currentResponse.value = ''
            }
            break

          case 'error':
            window.$message?.error((data as ErrorEventData).message || '处理失败')
            break
        }
      }

      // Final flush if stream ended without 'done' event | 流结束但无 done 事件时最终刷新
      if (textBuffer.trim()) {
        messages.value = [...messages.value, createMessage({ role: 'assistant', content: textBuffer })]
        currentResponse.value = ''
      }
    } catch (err) {
      const e = err as { name?: string; __handled?: boolean; message?: string }
      if (e.name === 'AbortError') return
      if (!e.__handled) {
        window.$message?.error(e.message || '请求失败')
      }
    } finally {
      // Only clear shared state if this run still owns the controller
      // 仅当本次请求仍持有 controller 时才清理共享状态，避免覆盖新请求
      if (abortController === localController) {
        loading.value = false
        currentResponse.value = ''
        abortController = null
      }
    }
  }

  // Listen for draft cancellation | 监听草稿取消事件
  const handleDraftCancelled = (e: Event) => {
    const { draftId } = (e as CustomEvent<{ draftId?: string }>).detail
    if (draftId) {
      // Send hidden notification to agent backend | 发送隐藏通知到 Agent 后端
      const cancelMsg = `[system] 用户已取消草稿 ${draftId}，请勿继续修改该草稿。`
      messages.value = [...messages.value, createMessage({
        role: 'user',
        content: cancelMsg,
        hidden: true,
      })]
      // Actually send to backend so Agent knows | 实际发送到后端让 Agent 知晓
      const accessToken = getAccessToken()
      const agentUrl = import.meta.env.VITE_AGENT_URL || 'http://localhost:8100'
      fetch(`${agentUrl}/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({ content: cancelMsg }),
      }).catch(() => {}) // Fire-and-forget | 发完即忘
    }
  }

  window.addEventListener('draft-cancelled', handleDraftCancelled)
  onScopeDispose(() => {
    window.removeEventListener('draft-cancelled', handleDraftCancelled)
  })

  /**
   * Regenerate the response for a given assistant message | 重新生成指定消息的回复
   * Finds the nearest user message above, removes all messages after it, and re-sends.
   * @param {number} assistantMsgId - The id of the assistant message to regenerate
   */
  const regenerate = (assistantMsgId: number) => {
    // Guard: don't destroy messages while a stream is active — send() would no-op
    // 守卫：流式进行中不要销毁消息，否则 send() 会被 loading 守卫静默跳过导致消息丢失
    if (loading.value) return
    const msgIndex = messages.value.findIndex(m => m.id === assistantMsgId)
    if (msgIndex === -1) return

    // Find nearest user message above | 向上查找最近的用户消息
    let userMsgIndex = -1
    for (let i = msgIndex - 1; i >= 0; i--) {
      if (messages.value[i].role === 'user') {
        userMsgIndex = i
        break
      }
    }
    if (userMsgIndex === -1) return

    const userContent = messages.value[userMsgIndex].content
    // Remove user message and everything after it — send() will re-add the user message
    // 删除用户消息及之后的所有消息，send() 会重新添加用户消息
    messages.value = messages.value.slice(0, userMsgIndex)
    send(userContent as string)
  }

  /**
   * Add an image to the canvas | 将图片添加到画布
   * @param {object} imageData - Image data with pic_url/picUrl and prompt
   */
  const addImageToCanvas = (imageData: AgentImageData) => {
    const position = calculatePosition()
    const url = imageData.pic_url || imageData.picUrl
    addNode('textToImage', position, {
      content: imageData.prompt || '',
      url,
      label: imageData.prompt ? imageData.prompt.slice(0, 20) : '搜索图片'
    })
    window.$message?.success('已添加到画布')
  }

  /**
   * Cancel the current request | 取消当前请求
   */
  const cancel = () => {
    if (abortController) {
      abortController.abort()
      abortController = null
      loading.value = false
      currentResponse.value = ''
    }
  }

  /**
   * Clear conversation history | 清除对话历史
   */
  const clearMessages = () => {
    messages.value = []
    currentResponse.value = ''
  }

  return {
    messages,
    loading,
    currentResponse,
    send,
    regenerate,
    addImageToCanvas,
    cancel,
    clearMessages
  }
}
