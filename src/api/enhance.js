/**
 * Image Enhancement API | 图片增强 API
 */

import { authRequest } from '@/utils/request'

/**
 * Submit enhance task | 提交增强任务
 * @param {Object} data - { imageUrl, type, upscaleModel, upscaleStyle, upscaleScale, skinMode, skinIntensity }
 */
export const aiEnhanceImage = (data) => {
  return authRequest.post('/ai/enhance/process', data)
}

/**
 * Get enhance task result | 获取增强任务结果
 * @param {number} id - Task ID
 */
export const getAiEnhanceMy = (id) => {
  return authRequest.get('/ai/enhance/get-my', { params: { id } })
}

/**
 * Get enhance task list by IDs | 根据 ID 列表获取增强任务
 * @param {Array} ids - Array of task IDs
 */
export const getAiEnhanceListByIds = (ids) => {
  return authRequest.get('/ai/enhance/my-list-by-ids', {
    params: { ids: ids.join(',') }
  })
}
