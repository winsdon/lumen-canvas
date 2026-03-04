import { authRequest } from '@/utils/request'

/**
 * Get project list | 获取项目列表
 * @param {Object} params { page, size, keyword }
 */
export const getProjectList = async (params = {}) => {
  const queryParams = {
    pageNo: params.page || 1,
    pageSize: params.size || 20,
    name: params.keyword,
    ...params
  }

  return authRequest.get('/prompt/project/page', { params: queryParams })
}

/**
 * Create new project | 创建新项目
 * @param {Object} data { name }
 */
export const createProject = async (data) => {
  return authRequest.post('/prompt/project/create', data)
}

/**
 * Get project detail | 获取项目详情
 * @param {String} id Project ID
 */
export const getProjectDetail = async (id) => {
  return authRequest.get('/prompt/project/detail', { params: { id } })
}

/**
 * Save/Update project | 保存/更新项目
 * @param {Object} data { id, name, thumbnail, canvasData }
 */
export const saveProject = async (data) => {
  return authRequest.post('/prompt/project/update', data)
}

/**
 * Delete project | 删除项目
 * @param {String} id Project ID
 */
export const deleteProject = async (id) => {
  return authRequest.delete('/prompt/project/delete', { params: { id } })
}
