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

