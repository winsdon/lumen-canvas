import { authRequest } from '@/utils/request'

// 切换此开关以启用/禁用 Mock 模式
// Set to false when backend is ready | 后端准备好后设置为 false
const USE_MOCK = true

// Mock 辅助函数
const MOCK_STORAGE_KEY = 'ai-canvas-projects'
const getMockData = () => {
  try {
    return JSON.parse(localStorage.getItem(MOCK_STORAGE_KEY) || '[]')
  } catch {
    return []
  }
}
const setMockData = (data) => {
  localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(data))
}
const mockDelay = (ms = 300) => new Promise(resolve => setTimeout(resolve, ms))

/**
 * Get project list | 获取项目列表
 * @param {Object} params { page, size, keyword }
 */
export const getProjectList = async (params = {}) => {
  if (USE_MOCK) {
    await mockDelay()
    const projects = getMockData()
    // 模拟分页和搜索
    let list = projects
    if (params.keyword) {
      list = list.filter(p => p.name.includes(params.keyword))
    }
    // 返回列表时不包含庞大的 canvasData
    const simpleList = list.map(({ canvasData, ...rest }) => rest)
    
    return {
      list: simpleList,
      total: simpleList.length,
      page: params.page || 1,
      size: params.size || 20
    }
  }
  return authRequest.get('/member/project/list', { params })
}

/**
 * Create new project | 创建新项目
 * @param {Object} data { name }
 */
export const createProject = async (data) => {
  if (USE_MOCK) {
    await mockDelay()
    const projects = getMockData()
    const newProject = {
      id: Date.now().toString(),
      name: data.name || '未命名项目',
      thumbnail: '',
      canvasData: { nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    projects.unshift(newProject)
    setMockData(projects)
    return newProject
  }
  return authRequest.post('/member/project/create', data)
}

/**
 * Get project detail | 获取项目详情
 * @param {String} id Project ID
 */
export const getProjectDetail = async (id) => {
  if (USE_MOCK) {
    await mockDelay()
    const projects = getMockData()
    const project = projects.find(p => p.id === id)
    if (!project) throw new Error('Project not found')
    return project
  }
  return authRequest.get('/member/project/detail', { params: { id } })
}

/**
 * Save/Update project | 保存/更新项目
 * @param {Object} data { id, name, thumbnail, canvasData }
 */
export const saveProject = async (data) => {
  if (USE_MOCK) {
    await mockDelay()
    const projects = getMockData()
    const index = projects.findIndex(p => p.id === data.id)
    if (index === -1) throw new Error('Project not found')
    
    projects[index] = {
      ...projects[index],
      ...data,
      updatedAt: new Date().toISOString()
    }
    setMockData(projects)
    return { updatedAt: projects[index].updatedAt }
  }
  return authRequest.post('/member/project/save', data)
}

/**
 * Delete project | 删除项目
 * @param {String} id Project ID
 */
export const deleteProject = async (id) => {
  if (USE_MOCK) {
    await mockDelay()
    const projects = getMockData()
    const filtered = projects.filter(p => p.id !== id)
    setMockData(filtered)
    return null
  }
  return authRequest.post('/member/project/delete', { id })
}
