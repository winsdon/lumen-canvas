/**
 * Image API | 图片生成 API
 */

import { authRequest } from '@/utils/request'

/**
 * Get AI Model List | 获取 AI 模型列表
 * @param {Object} params - { type, platform }
 */
export const getAiModelList = (params = {}) => {
  return authRequest.get('/ai/model/simple-list', { params })
}

/**
 * Draw Image | 生成图片
 * @param {Object} data - { modelId, prompt, width, height, ... }
 */
export const aiImageDraw = (data) => {
  return authRequest.post('/ai/image/draw', data)
}

/**
 * Get Image List by IDs | 根据 ID 数组获取图片列表
 * @param {Array} ids - Array of image IDs
 */
export const getAiImageListByIds = (ids) => {
  return authRequest.get('/ai/image/my-list-by-ids', {
    params: { ids: ids.join(',') }
  })
}

// Deprecated or optional legacy functions can remain if needed, 
// but we focus on the new backend integration.


/**
 * Generate image using Gemini chat completions format | 使用 Gemini 聊天补全格式生成图片
 * @param {Object} data - { model, prompt, temperature, top_p }
 * @param {boolean} stream - Whether to use stream mode
 * @returns {Promise<Object>} - Image generation result
 */
export const generateImageViaChat = async (data, stream = true) => {
  const apiKey = localStorage.getItem('apiKey')
  const baseUrl = getBaseUrl()

  const requestBody = {
    model: data.model,
    temperature: data.temperature || 1,
    top_p: data.top_p || 1,
    messages: [
      {
        role: 'user',
        content: data.prompt
      }
    ],
    stream,
    stream_options: {
      include_usage: true
    }
  }

  if (stream) {
    // Stream mode - return async generator
    const response = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'Accept': '*/*',
        'Accept-Language': 'zh-CN',
        'Connection': 'keep-alive',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      const errorMsg = `HTTP error! status: ${response.status}`
      window.$message?.error(errorMsg)
      throw new Error(errorMsg)
    }

    return response
  } else {
    // Non-stream mode - use axios request
    return request({
      url: '/v1/chat/completions',
      method: 'post',
      data: requestBody
    })
  }
}
