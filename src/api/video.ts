/**
 * Video API | 视频生成 API
 */

import { authRequest } from '@/utils/request'

export const aiVideoGenerate = (data: Record<string, unknown>) => {
  return authRequest.post('/ai/video/generate', data)
}

export const getAiVideoMy = (id: string | number) => {
  return authRequest.get('/ai/video/get-my', { params: { id } })
}

export const getAiVideoListMyByIds = (ids: Array<string | number> = []) => {
  return authRequest.get('/ai/video/my-list-by-ids', {
    params: { ids: ids.join(',') }
  })
}

export const getAiVideoPageMy = (params = {}) => {
  return authRequest.get('/ai/video/my-page', { params })
}

export const getAiVideoPagePublic = (params = {}) => {
  return authRequest.get('/ai/video/public-page', { params })
}

export const deleteAiVideoMy = (id: string | number) => {
  return authRequest.delete('/ai/video/delete-my', { params: { id } })
}
