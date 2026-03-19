/**
 * useAgent composable | 智能体组合式函数
 * Manages agent conversation state and SSE streaming | 管理智能体对话状态和 SSE 流式通信
 */

import { ref } from 'vue'
import { streamAgentChat } from '@/api/agent'
import { addNode, canvasViewport, nodes } from '@/stores/canvas'

export function useAgent() {
  // Message list: { role: 'user'|'assistant'|'image_cards', content?: string, cards?: Array }
  const messages = ref([])
  const loading = ref(false)
  const currentResponse = ref('')

  // AbortController for cancelling requests | 用于取消请求的 AbortController
  let abortController = null

  /**
   * Calculate position for new node | 计算新节点的位置
   * Places nodes staggered from the center of the viewport | 在视口中心交错放置节点
   */
  const calculatePosition = () => {
    const vp = canvasViewport.value || { x: 0, y: 0, zoom: 1 }
    const baseX = (-vp.x + window.innerWidth / 2) / vp.zoom
    const baseY = (-vp.y + window.innerHeight / 2) / vp.zoom
    const offset = (nodes.value.length % 5) * 40
    return { x: baseX + offset + 100, y: baseY + offset }
  }

  /**
   * Send a message to the agent | 发��消息给智能体
   * @param {string} content - User message text | 用户消息文本
   */
  const send = async (content) => {
    if (!content.trim() || loading.value) return

    // Add user message | 添加用户消息
    messages.value = [...messages.value, { role: 'user', content }]
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
            // Accumulate text deltas | 累���文本增量
            textBuffer += data.content || ''
            currentResponse.value = textBuffer
            break

          case 'tool_result':
            // If there's accumulated text, flush it as a message | 有累积文本则先刷新为消息
            if (textBuffer.trim()) {
              messages.value = [...messages.value, { role: 'assistant', content: textBuffer }]
              textBuffer = ''
              currentResponse.value = ''
            }
            // Add image cards if the tool is searchImages | 搜索图片工具结果添加为图片卡片
            if (data.tool === 'search_images' && Array.isArray(data.result)) {
              messages.value = [
                ...messages.value,
                { role: 'image_cards', cards: data.result }
              ]
            }
            break

          case 'tool_call':
            // Tool call event — no UI action needed | 工具调用事件，无需 UI 操作
            break

          case 'done':
            // Flush remaining text | 刷新剩余文本
            if (textBuffer.trim()) {
              messages.value = [...messages.value, { role: 'assistant', content: textBuffer }]
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
        messages.value = [...messages.value, { role: 'assistant', content: textBuffer }]
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
   * Add an image from search results to the canvas | 将搜索结果中的图片添加到画布
   * @param {{ id: number, picUrl: string, prompt: string, model?: string, width?: number, height?: number }} imageData
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
    addImageToCanvas,
    cancel,
    clearMessages
  }
}
