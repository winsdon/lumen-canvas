import { authRequest } from '@/utils/request'

// Generic query params for paged endpoints | 分页端点的通用查询参数
type QueryParams = Record<string, unknown>

export const promptFlowCreate = (data: Record<string, unknown>) => {
  return authRequest.post('/prompt/flow/create', data)
}

export const promptFlowUpdate = (data: Record<string, unknown>) => {
  return authRequest.post('/prompt/flow/update', data)
}

export const promptFlowGet = (id: string | number) => {
  return authRequest.get('/prompt/flow/get', { params: { id } })
}

export const promptFlowPage = (params: QueryParams = {}) => {
  return authRequest.get('/prompt/flow/page', { params })
}

export const promptFlowDelete = (id: string | number) => {
  return authRequest.delete('/prompt/flow/delete', { params: { id } })
}

export const promptFlowPublishSubmit = (data: Record<string, unknown>) => {
  return authRequest.post('/prompt/flow/publish/submit', data)
}

export const promptFlowPublishMy = (params: QueryParams = {}) => {
  return authRequest.get('/prompt/flow/publish/my', { params })
}

export const promptFlowPublicPage = (params: QueryParams = {}) => {
  return authRequest.get('/prompt/flow/public/page', { params })
}

export const promptFlowReviewGet = (id: string | number) => {
  return authRequest.get('/prompt/flow/publish/get', { params: { id } })
}
