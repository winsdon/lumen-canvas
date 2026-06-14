/**
 * Projects store | 项目状态管理
 * Manages projects with API integration
 */
import * as projectApi from '@/api/project'
import { computed, ref } from 'vue'
import type { Ref } from 'vue'
import type { Project } from '@/types/api'
import type { PageResult } from '@/types/api'
import type { CanvasData } from '@/types/node'

// Project entry held in the store: dates normalized to Date objects | 存储中的项目条目：日期已归一化为 Date
// Named props are re-declared explicitly: Omit over a type with an index signature
// collapses keyof to string|number, erasing specific props into the `unknown` index.
// 显式重声明具名属性：Omit 作用于带索引签名的类型时会把 keyof 坍缩为 string|number，
// 导致具名属性退化为索引签名的 unknown，故此处显式恢复。
export interface ProjectEntry extends Omit<Project, 'createdAt' | 'updatedAt'> {
  id: string
  name: string
  thumbnail?: string
  canvasData?: CanvasData
  createdAt: Date
  updatedAt: Date
}

// Raw project shape returned by the API (dates as string/number) | API 返回的原始项目结构
type RawProject = Project & { id: string; createdAt: string | number | Date; updatedAt: string | number | Date }

// Params accepted by the project list endpoint | 项目列表接口参数
interface LoadProjectsParams {
  page?: number
  size?: number
  keyword?: string
  [key: string]: unknown
}

// Normalize a raw API project into a store entry | 将原始项目归一化为存储条目
const toEntry = (p: RawProject): ProjectEntry => ({
  ...p,
  createdAt: new Date(p.createdAt),
  updatedAt: new Date(p.updatedAt)
})

// Projects list | 项目列表
export const projects: Ref<ProjectEntry[]> = ref([])

// Current project ID | 当前项目ID
export const currentProjectId = ref<string | null>(null)

// Current project | 当前项目
export const currentProject = computed<ProjectEntry | null>(() => {
  return projects.value.find(p => p.id === currentProjectId.value) || null
})

/**
 * Load projects from API | 从 API 加载项目
 */
export const loadProjects = async (params?: LoadProjectsParams) => {
  try {
    const res = await projectApi.getProjectList(params) as PageResult<RawProject>
    projects.value = res.list.map(toEntry)
    return res
  } catch (err) {
    console.error('Failed to load projects:', err)
    // Global error handler will show the message | 全局错误处理会显示消息
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
    // Global error handler will show the message | 全局错误处理会显示消息
    throw err
  }
}

/**
 * Update project | 更新项目
 * @param {string} id - Project ID | 项目ID
 * @param {object} data - Update data | 更新数据
 */
export const updateProject = async (id: string, data: Partial<Omit<Project, 'createdAt' | 'updatedAt'>>) => {
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
export const updateProjectCanvas = async (id: string, canvasData: CanvasData) => {
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
      // Immutable update: rebuild the array element instead of mutating in place
      // 不可变更新：重建数组元素而非原地修改
      const index = projects.value.findIndex(p => p.id === id)
      if (index !== -1) {
        const updated = {
          ...projects.value[index],
          thumbnail,
          updatedAt: new Date()
        }
        projects.value = projects.value.map((p, i) => (i === index ? updated : p))
      }
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
export const getProjectCanvas = async (id: string): Promise<CanvasData | null> => {
  try {
    const project = await projectApi.getProjectDetail(id)
    return project.canvasData ?? null
  } catch (err) {
    console.error('Failed to get project detail:', err)
    return null
  }
}

/**
 * Delete project | 删除项目
 * @param {string} id - Project ID | 项目ID
 */
export const deleteProject = async (id: string) => {
  try {
    await projectApi.deleteProject(id)
    projects.value = projects.value.filter(p => p.id !== id)
  } catch (err) {
    // Global error handler will show the message | 全局错误处理会显示消息
    console.error('Failed to delete project:', err)
  }
}

/**
 * Duplicate project | 复制项目
 * @param {string} id - Source project ID | 源项目ID
 * @returns {string|null} - New project ID or null | 新项目ID或空
 */
export const duplicateProject = async (id: string) => {
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
    // Global error handler will show the message | 全局错误处理会显示消息
    console.error('Failed to duplicate project:', err)
    return null
  }
}

/**
 * Rename project | 重命名项目
 * @param {string} id - Project ID | 项目ID
 * @param {string} name - New name | 新名称
 */
export const renameProject = async (id: string, name: string) => {
  return updateProject(id, { name })
}

/**
 * Update project thumbnail | 更新项目缩略图
 * @param {string} id - Project ID | 项目ID
 * @param {string} thumbnail - Thumbnail URL (base64 or URL) | 缩略图URL
 */
export const updateProjectThumbnail = async (id: string, thumbnail: string) => {
  return updateProject(id, { thumbnail })
}

/**
 * Get sorted projects | 获取排序后的项目列表
 * @param {string} sortBy - Sort field (updatedAt, createdAt, name) | 排序字段
 * @param {string} order - Sort order (asc, desc) | 排序顺序
 */
type SortableKey = 'updatedAt' | 'createdAt' | 'name'
type SortOrder = 'asc' | 'desc'

// Normalize a field into a comparable primitive | 将字段归一化为可比较的原始值
const toComparable = (value: unknown): string | number => {
  if (value instanceof Date) return value.getTime()
  if (typeof value === 'string') return value.toLowerCase()
  if (typeof value === 'number') return value
  return ''
}

export const getSortedProjects = (sortBy: SortableKey = 'updatedAt', order: SortOrder = 'desc') => {
  return computed(() => {
    const sorted = [...projects.value]
    sorted.sort((a, b) => {
      const valueA = toComparable(a[sortBy])
      const valueB = toComparable(b[sortBy])

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


// Export for debugging (DEV only) | 导出用于调试（仅开发环境）
if (typeof window !== 'undefined' && import.meta.env.DEV) {
  window.__aiCanvasProjects = {
    projects,
    loadProjects,
    createProject,
    deleteProject
  }
}
