import { authRequest } from '@/utils/request'

export const promptFlowCreate = (data) => {
  return authRequest.post('/prompt/flow/create', data)
}

export const promptFlowUpdate = (data) => {
  return authRequest.post('/prompt/flow/update', data)
}

export const promptFlowGet = (id) => {
  return authRequest.get('/prompt/flow/get', { params: { id } })
}

export const promptFlowPage = (params = {}) => {
  return authRequest.get('/prompt/flow/page', { params })
}

export const promptFlowDelete = (id) => {
  return authRequest.delete('/prompt/flow/delete', { params: { id } })
}

export const promptFlowPublishSubmit = (data) => {
  return authRequest.post('/prompt/flow/publish/submit', data)
}

export const promptFlowPublishMy = (params = {}) => {
  return authRequest.get('/prompt/flow/publish/my', { params })
}

export const promptFlowPublicPage = (params = {}) => {
  return authRequest.get('/prompt/flow/public/page', { params })
}

// Review API (no auth required) | 审核详情接口（免登录）
export const promptFlowReviewGet = (id) => {
  return authRequest.get('/prompt/flow/review/get', { params: { id } })
}
