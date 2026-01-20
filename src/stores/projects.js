/**
 * Projects store | 项目状态管理
 * Manages projects with API integration
 */
import * as projectApi from '@/api/project'
import { computed, ref } from 'vue'

// Projects list | 项目列表
export const projects = ref([])

// Current project ID | 当前项目ID
export const currentProjectId = ref(null)

// Current project | 当前项目
export const currentProject = computed(() => {
  return projects.value.find(p => p.id === currentProjectId.value) || null
})

/**
 * Load projects from API | 从 API 加载项目
 */
export const loadProjects = async (params) => {
  try {
    const res = await projectApi.getProjectList(params)
    projects.value = res.list.map(p => ({
      ...p,
      createdAt: new Date(p.createdAt),
      updatedAt: new Date(p.updatedAt)
    }))
    return res
  } catch (err) {
    console.error('Failed to load projects:', err)
    window.$message?.error('加载项目列表失败')
    projects.value = []
  }
}

/**
 * Create a new project | 创建新项目
 * @param {string} name - Project name | 项目名称
 * @returns {string} - New project ID | 新项目ID
 */
export const createProject = async (name = '未命名项目') => {
  try {
    const newProject = await projectApi.createProject({ name })
    // Add to list immediately | 立即添加到列表
    projects.value.unshift({
      ...newProject,
      createdAt: new Date(newProject.createdAt),
      updatedAt: new Date(newProject.updatedAt)
    })
    return newProject.id
  } catch (err) {
    console.error('Failed to create project:', err)
    window.$message?.error('创建项目失败')
    throw err
  }
}

/**
 * Update project | 更新项目
 * @param {string} id - Project ID | 项目ID
 * @param {object} data - Update data | 更新数据
 */
export const updateProject = async (id, data) => {
  try {
    await projectApi.saveProject({ id, ...data })
    
    // Update local state | 更新本地状态
    const index = projects.value.findIndex(p => p.id === id)
    if (index !== -1) {
      projects.value[index] = {
        ...projects.value[index],
        ...data,
        updatedAt: new Date()
      }
      // Move to top | 移到顶部
      const [updated] = projects.value.splice(index, 1)
      projects.value = [updated, ...projects.value]
    }
    return true
  } catch (err) {
    console.error('Failed to update project:', err)
    return false
  }
}

/**
 * Update project canvas data | 更新项目画布数据
 * @param {string} id - Project ID | 项目ID
 * @param {object} canvasData - Canvas data (nodes, edges, viewport) | 画布数据
 */
export const updateProjectCanvas = async (id, canvasData) => {
  const project = projects.value.find(p => p.id === id)
  
  // Calculate thumbnail logic | 计算缩略图逻辑
  let thumbnail = project?.thumbnail
  if (canvasData.nodes) {
    const mediaNodes = canvasData.nodes
      .filter(node => (node.type === 'image' || node.type === 'video') && node.data?.url)
      .sort((a, b) => {
        const aTime = a.data?.updatedAt || a.data?.createdAt || 0
        const bTime = b.data?.updatedAt || b.data?.createdAt || 0
        return bTime - aTime
      })
    if (mediaNodes.length > 0) {
      const latestNode = mediaNodes[0]
      if (latestNode.type === 'video') {
        thumbnail = latestNode.data.thumbnail || latestNode.data.url
      } else {
        thumbnail = latestNode.data.url
      }
    }
  }

  try {
    await projectApi.saveProject({
      id,
      canvasData,
      thumbnail
    })
    
    if (project) {
        project.thumbnail = thumbnail
        project.updatedAt = new Date()
    }
    return true
  } catch (err) {
    console.error('Failed to save canvas:', err)
    return false
  }
}

/**
 * Get project canvas data | 获取项目画布数据
 * @param {string} id - Project ID | 项目ID
 * @returns {object|null} - Canvas data or null | 画布数据或空
 */
export const getProjectCanvas = async (id) => {
  try {
    const project = await projectApi.getProjectDetail(id)
    return project.canvasData
  } catch (err) {
    console.error('Failed to get project detail:', err)
    return null
  }
}

/**
 * Delete project | 删除项目
 * @param {string} id - Project ID | 项目ID
 */
export const deleteProject = async (id) => {
  try {
    await projectApi.deleteProject(id)
    projects.value = projects.value.filter(p => p.id !== id)
  } catch (err) {
    window.$message?.error('删除项目失败')
  }
}

/**
 * Duplicate project | 复制项目
 * @param {string} id - Source project ID | 源项目ID
 * @returns {string|null} - New project ID or null | 新项目ID或空
 */
export const duplicateProject = async (id) => {
  try {
    // Get full data first | 先获取完整数据
    const source = await projectApi.getProjectDetail(id)
    
    const newProject = await projectApi.createProject({
      name: `${source.name} (副本)`
    })
    
    // Update with source canvas data | 更新画布数据
    await projectApi.saveProject({
        id: newProject.id,
        canvasData: source.canvasData,
        thumbnail: source.thumbnail
    })
    
    // Refresh list | 刷新列表
    await loadProjects()
    
    return newProject.id
  } catch (err) {
    window.$message?.error('复制项目失败')
    return null
  }
}

/**
 * Rename project | 重命名项目
 * @param {string} id - Project ID | 项目ID
 * @param {string} name - New name | 新名称
 */
export const renameProject = async (id, name) => {
  return updateProject(id, { name })
}

/**
 * Update project thumbnail | 更新项目缩略图
 * @param {string} id - Project ID | 项目ID
 * @param {string} thumbnail - Thumbnail URL (base64 or URL) | 缩略图URL
 */
export const updateProjectThumbnail = async (id, thumbnail) => {
  return updateProject(id, { thumbnail })
}

/**
 * Get sorted projects | 获取排序后的项目列表
 * @param {string} sortBy - Sort field (updatedAt, createdAt, name) | 排序字段
 * @param {string} order - Sort order (asc, desc) | 排序顺序
 */
export const getSortedProjects = (sortBy = 'updatedAt', order = 'desc') => {
  return computed(() => {
    const sorted = [...projects.value]
    sorted.sort((a, b) => {
      let valueA = a[sortBy]
      let valueB = b[sortBy]
      
      if (valueA instanceof Date) {
        valueA = valueA.getTime()
        valueB = valueB.getTime()
      }
      
      if (typeof valueA === 'string') {
        valueA = valueA.toLowerCase()
        valueB = valueB.toLowerCase()
      }
      
      if (order === 'asc') {
        return valueA > valueB ? 1 : -1
      } else {
        return valueA < valueB ? 1 : -1
      }
    })
    return sorted
  })
}

/**
 * Initialize projects store | 初始化项目存储
 */
export const initProjectsStore = async () => {
  await loadProjects()
}


// Export for debugging | 导出用于调试
if (typeof window !== 'undefined') {
  window.__aiCanvasProjects = {
    projects,
    loadProjects,
    createProject,
    deleteProject
  }
}
