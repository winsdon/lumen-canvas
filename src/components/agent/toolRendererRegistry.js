/**
 * Tool renderer registry | 工具渲染器注册表
 * Maps tool names to their renderer components and metadata.
 * Uses a frozen object — all registrations are static, no runtime mutations.
 */

import ImageCardsRenderer from './tool-renderers/ImageCardsRenderer.vue'
import GenerateImageRenderer from './tool-renderers/GenerateImageRenderer.vue'
import DraftCreatedRenderer from './tool-renderers/DraftCreatedRenderer.vue'
import ListTemplatesRenderer from './tool-renderers/ListTemplatesRenderer.vue'
import DefaultRenderer from './tool-renderers/DefaultRenderer.vue'

// Tool renderer configurations | 工具渲染器配置
const REGISTRY = Object.freeze({
  search_images: {
    component: ImageCardsRenderer,
    label: '搜索图片',
    icon: '🔍',
    summarize: (data) => `找到 ${data.images?.length || 0} 张图片`
  },
  generate_image: {
    component: GenerateImageRenderer,
    label: '生成图片',
    icon: '🎨',
    summarize: () => '图片生成完成'
  },
  create_workflow_draft: {
    component: DraftCreatedRenderer,
    label: '创建工作流草稿',
    icon: '📋',
    summarize: () => '草稿已创建',
  },
  update_draft: {
    component: DefaultRenderer,
    label: '更新草稿',
    icon: '✏️',
    summarize: () => '草稿已更新',
  },
  list_templates: {
    component: ListTemplatesRenderer,
    label: '工作流模板',
    icon: '📑',
    summarize: (data) => {
      try {
        const list = typeof data === 'string' ? JSON.parse(data) : data
        return `${Array.isArray(list) ? list.length : '?'} 个模板`
      } catch { return '模板列表' }
    },
  },
  __default__: {
    component: DefaultRenderer,
    label: '工具调用',
    icon: '🔧',
    summarize: () => '执行完成'
  }
})

/**
 * Get renderer config for a tool | 获取工具的渲染器配置
 * @param {string} toolName - Backend tool name (e.g., 'search_images')
 * @returns {{ component, label, icon, summarize }}
 */
export const getToolRenderer = (toolName) => {
  return REGISTRY[toolName] || REGISTRY.__default__
}

/**
 * Get display label for a tool | 获取工具的显示名称
 * @param {string} toolName
 * @returns {string}
 */
export const getToolLabel = (toolName) => {
  return REGISTRY[toolName]?.label || toolName
}
