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
