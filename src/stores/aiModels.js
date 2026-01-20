/**
 * AI Models Store | AI 模型状态管理
 */
import { getAiModelList } from '@/api/image'
import { ref } from 'vue'

// Cached models list (Keyed by type) | 缓存的模型列表（按类型存储）
export const aiModels = ref({})

// Loading state | 加载状态
export const isLoading = ref(false)

// Initialized flags by type | 各类型的初始化标志
export const initializedTypes = ref(new Set())

/**
 * Fetch and cache models | 获取并缓存模型
 * type: 2 (Image Generation) based on convention
 * 
 * Model Types:
 * 1: CHAT (对话)
 * 2: IMAGE (图片)
 * 3: VOICE (语音)
 * 4: VIDEO (视频)
 * 5: EMBEDDING (向量)
 * 6: RERANK (重排序)
 */
export const fetchModels = async (type = 2) => {
  // If already initialized for this type, skip
  if (initializedTypes.value.has(type)) return
  
  // We don't block by global isLoading because we might want parallel fetches for different types.
  // Ideally we should have per-type loading state, but for simplicity:
  
  try {
    const res = await getAiModelList({ type, status: 1 })
    if (res) {
      // Store by type
      aiModels.value = {
        ...aiModels.value,
        [type]: res
      }
      initializedTypes.value.add(type)
    }
  } catch (error) {
    console.error(`Failed to fetch AI models (type ${type}):`, error)
  }
}

/**
 * Get Model ID by Key/Model Identifier | 根据标识符获取模型 ID
 * @param {string} key - The model key string (e.g. 'doubao-seedream-...')
 */
export const getModelId = (key) => {
  if (!key) return null
  // Search in all type lists
  for (const list of Object.values(aiModels.value)) {
    const target = list.find(m => m.model === key || m.name === key)
    if (target) return target.id
  }
  return null
}
