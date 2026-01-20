/**
 * AI Models Store | AI 模型状态管理
 */
import { ref } from 'vue'
import { getAiModelList } from '@/api/image'

// Cached models list | 缓存的模型列表
export const aiModels = ref([])

// Loading state | 加载状态
export const isLoading = ref(false)

// Initialized flag | 初始化标志
export const isInitialized = ref(false)

/**
 * Fetch and cache models | 获取并缓存模型
 * type: 2 (Image Generation) based on convention
 */
export const fetchModels = async () => {
  if (isLoading.value || isInitialized.value) return
  
  isLoading.value = true
  try {
    // Fetch Image Models (Type 2)
    const res = await getAiModelList({ type: 2, status: 1 })
    if (res) {
      aiModels.value = res
      isInitialized.value = true
    }
  } catch (error) {
    console.error('Failed to fetch AI models:', error)
  } finally {
    isLoading.value = false
  }
}

/**
 * Get Model ID by Key/Model Identifier | 根据标识符获取模型 ID
 * @param {string} key - The model key string (e.g. 'doubao-seedream-...')
 */
export const getModelId = (key) => {
  if (!key) return null
  // Match by 'model' field (e.g. 'gpt-4') or 'name'
  const target = aiModels.value.find(m => m.model === key || m.name === key)
  return target ? target.id : null
}
