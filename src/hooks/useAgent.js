/**
 * useAgent composable | 智能体组合式函数
 * Manages agent conversation state and SSE streaming | 管理智能体对话状态和 SSE 流式通信
 */

import { ref } from 'vue'
import { streamAgentChat } from '@/api/agent'
import { addNode, canvasViewport, nodes } from '@/stores/canvas'
import { getToolRenderer, getToolLabel } from '@/components/agent/toolRendererRegistry'

// Auto-increment message ID counter | 消息自增 ID 计数器
let msgId = 0

/**
 * Create a message object with auto-increment id | 创建带自增 ID 的消息对象
 * @param {object} fields - Message fields
 * @returns {object} Message with id
 */
const createMessage = (fields) => ({ id: msgId++, ...fields })

export function useAgent() {
  const messages = ref([])
  const loading = ref(false)
  const currentResponse = ref('')

  // AbortController for cancelling requests | 用于取消请求的 AbortController
  let abortController = null

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
  const send = async (content) => {
    if (!content.trim() || loading.value) return

    // Add user message | 添加用户消息
    messages.value = [...messages.value, createMessage({ role: 'user', content })]
    loading.value = true
    currentResponse.value = ''

    // Cancel previous request if any | 取消之前的请求
    if (abortController) {
      abortController.abort()
    }
    abortController = new AbortController()

    try {
      let textBuffer = ''

      for await (const { event, data } of streamAgentChat(content, abortController.signal)) {
        switch (event) {
          case 'text':
            // Accumulate text deltas | 累积文本增量
            textBuffer += data.content || ''
            currentResponse.value = textBuffer
            break

          case 'tool_call': {
            // Flush accumulated text before tool status | 工具调用前先刷新文本
            if (textBuffer.trim()) {
              messages.value = [...messages.value, createMessage({ role: 'assistant', content: textBuffer })]
              textBuffer = ''
              currentResponse.value = ''
            }
            // Insert tool_status message | 插入工具状态消息
            const toolName = data.name
            const toolConfig = getToolRenderer(toolName)
            messages.value = [
              ...messages.value,
              createMessage({
                role: 'tool_status',
                toolName,
                toolLabel: toolConfig.label,
                icon: toolConfig.icon,
                status: 'running',
                args: data.args || {},
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
            // Immutably update FIRST matching tool_status → completed | 不可变更新第一个匹配的工具状态
            // Uses findIndex to avoid race condition with concurrent same-name tools
            const resultToolName = data.name
            const resultConfig = getToolRenderer(resultToolName)
            const summary = resultConfig.summarize(data.result || {})
            const statusIdx = messages.value.findIndex(
              msg => msg.role === 'tool_status' && msg.toolName === resultToolName && msg.status === 'running'
            )
            if (statusIdx !== -1) {
              messages.value = messages.value.map((msg, i) =>
                i === statusIdx ? { ...msg, status: 'completed', resultSummary: summary } : msg
              )
            }
            // Append tool result message | 追加工具结果消息
            messages.value = [
              ...messages.value,
              createMessage({
                role: 'tool_result',
                toolName: resultToolName,
                data: data.result || {}
              })
            ]
            break
          }

          case 'thinking':
            // Ignored in this iteration | 本次迭代忽略
            break

          case 'done':
            // Flush remaining text | 刷新剩余文本
            if (textBuffer.trim()) {
              messages.value = [...messages.value, createMessage({ role: 'assistant', content: textBuffer })]
              textBuffer = ''
              currentResponse.value = ''
            }
            break

          case 'error':
            window.$message?.error(data.message || '处理失败')
            break
        }
      }

      // Final flush if stream ended without 'done' event | 流结束但无 done 事件时最终刷新
      if (textBuffer.trim()) {
        messages.value = [...messages.value, createMessage({ role: 'assistant', content: textBuffer })]
        currentResponse.value = ''
      }
    } catch (err) {
      if (err.name === 'AbortError') return
      if (!err.__handled) {
        window.$message?.error(err.message || '请求失败')
      }
    } finally {
      loading.value = false
      currentResponse.value = ''
      abortController = null
    }
  }

  /**
   * Regenerate the response for a given assistant message | 重新生成指定消息的回复
   * Finds the nearest user message above, removes all messages after it, and re-sends.
   * @param {number} assistantMsgId - The id of the assistant message to regenerate
   */
  const regenerate = (assistantMsgId) => {
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
    send(userContent)
  }

  /**
   * Add an image to the canvas | 将图片添加到画布
   * @param {object} imageData - Image data with pic_url/picUrl and prompt
   */
  const addImageToCanvas = (imageData) => {
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
