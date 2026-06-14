/**
 * AI Models Store | AI 模型状态管理
 */
import { getAiModelList } from '@/api/image'
import { ref } from 'vue'

// Backend AI model entry | 后端 AI 模型条目
export interface AiModel {
  id: number | string
  model?: string
  name?: string
  platform?: string
  imagePoint?: number
  point?: number
  videoPoint?: number
  [key: string]: unknown
}

// Cached models list keyed by type | 按类型缓存的模型列表
export const aiModels = ref<Record<number, AiModel[]>>({})

// Loading state | 加载状态
export const isLoading = ref(false)

// Initialized flags by type (use array for Vue reactivity) | 各类型的初始化标志（使用数组保证 Vue 响应式）
export const initializedTypes = ref<number[]>([])

// In-flight fetch promises by type, for concurrent-call dedup | 各类型进行中的请求，用于并发去重
const inFlight = new Map<number, Promise<void>>()

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
  // If already initialized for this type, skip | 已初始化则跳过
  if (initializedTypes.value.includes(type)) return

  // Dedup concurrent callers: reuse the in-flight promise | 并发去重：复用进行中的请求
  if (inFlight.has(type)) return inFlight.get(type)

  const promise = (async () => {
    try {
      const res = (await getAiModelList({ type, status: 1 })) as AiModel[]
      if (res) {
        // Store by type | 按类型存储
        aiModels.value = {
          ...aiModels.value,
          [type]: res
        }
        initializedTypes.value = [...initializedTypes.value, type]
      }
    } catch (error) {
      console.error(`Failed to fetch AI models (type ${type}):`, error)
    } finally {
      inFlight.delete(type)
    }
  })()

  inFlight.set(type, promise)
  return promise
}

/**
 * Get Model ID by Key/Model Identifier | 根据标识符获取模型 ID
 * @param {string} key - The model key string (e.g. 'doubao-seedream-...')
 */
export const getModelId = (key: string | null | undefined): string | number | null => {
  if (!key) return null
  // Search in all type lists
  for (const list of Object.values(aiModels.value)) {
    const target = list.find((m) => m.model === key || m.name === key)
    if (target) return target.id ?? null
  }
  return null
}
