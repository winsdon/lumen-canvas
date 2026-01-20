/**
 * Model Store | 模型状态管理
 * Built-in models for open source version | 开源版内置模型
 */

import {
  DEFAULT_CHAT_MODEL,
  DEFAULT_IMAGE_MODEL,
  DEFAULT_IMAGE_SIZE,
  DEFAULT_VIDEO_DURATION,
  DEFAULT_VIDEO_MODEL,
  DEFAULT_VIDEO_RATIO,
  SEEDREAM_4K_SIZE_OPTIONS,
  SEEDREAM_QUALITY_OPTIONS,
  SEEDREAM_SIZE_OPTIONS,
  CHAT_MODEL_CAPABILITIES as STATIC_CHAT_CAPABILITIES,
  IMAGE_MODEL_CAPABILITIES as STATIC_IMAGE_CAPABILITIES,
  VIDEO_MODEL_CAPABILITIES as STATIC_VIDEO_CAPABILITIES,
  VIDEO_DURATION_OPTIONS,
  VIDEO_RATIO_LIST,
  VIDEO_RATIO_OPTIONS
} from '@/config/models'
import { aiModels as dynamicAiModels, fetchModels, isLoading as isModelsLoading } from '@/stores/aiModels'
import { computed, ref } from 'vue'

// Loading state
const loading = computed(() => isModelsLoading.value)
const error = ref(null)

/**
 * Initialize models | 初始化模型
 * Fetches dynamic models from backend
 */
export const loadAllModels = async () => {
  try {
    // Fetch models of all types (or specifically Image/Video/Chat if API supports batch or we call multiple times)
    // Assuming fetchModels(type) appends/merges to the store.
    // fetchModels checks isInitialized inside for type=2, but we might want to force or check others.
    // For now, let's fetch Image(2), Video(4), Chat(1) if needed.
    
    // We start with Image as it's the main feature
    await fetchModels(2)
    // Fetch Video (Type 4)
    await fetchModels(4)
    // Fetch Chat (Type 1)
    await fetchModels(1)
    
  } catch (err) {
    console.error('Failed to load models:', err)
    error.value = err
  }
}

/**
 * Helper to compute models based on dynamic data and static capabilities
 */
const computeModels = (type, staticCapabilities, defaultLabelFn) => {
  return computed(() => {
    const backendModels = dynamicAiModels.value[type] || []
    
    // If backend has no data, return static fallback (converted to expected format)
    // Note: staticCapabilities doesn't have 'label' anymore, so we might need to rely on backend or add it back if we want pure static fallback.
    // However, the requirement is "don't use hardcoded". So if backend is empty, we show empty or basic fallback if needed.
    // Let's assume we want to show nothing or just the capabilities as "unavailable" if backend fails?
    // Actually, for robust fallback, we might want to keep the keys but mark as unavailable?
    // Let's stick to: "Show what backend returns, enriched with capabilities".
    
    if (backendModels.length === 0) {
        // Fallback: If no backend data, maybe return empty? 
        // Or if we really want to support offline mode, we'd need the labels back in config.
        // Given the prompt "don't use hardcoded", empty is correct behavior if backend is down/empty.
        return []
    }

    return backendModels.map(m => {
       // Find config by matching pattern against model key or name
       // 查找匹配的配置：使用正则表达式匹配 model key 或 name
       const config = staticCapabilities.find(c => {
         if (c.pattern) {
           return c.pattern.test(m.model) || c.pattern.test(m.name)
         }
         return c.key === m.model
       }) || {}
       
       return {
         ...config,
         // Override with backend data
        // Use 'name' for label, 'model' for key/value
        label: m.name,
        value: m.model, // Explicitly set value for NDropdown/NSelect
        key: m.model,
        id: m.id,
        platform: m.platform,
        // Ensure defaults
        sizes: config.sizes || [],
        qualities: config.qualities || [],
        defaultParams: config.defaultParams || {}
      }
    })
  })
}

// Dynamic Models
const imageModels = computeModels(2, STATIC_IMAGE_CAPABILITIES)
const videoModels = computeModels(4, STATIC_VIDEO_CAPABILITIES)
const chatModels = computeModels(1, STATIC_CHAT_CAPABILITIES)

/**
 * Get model config by name | 根据名称获取模型配置
 */
export const getModelConfig = (modelKey) => {
  const allModels = [...imageModels.value, ...videoModels.value, ...chatModels.value]
  return allModels.find(m => m.key === modelKey)
}

/**
 * Get size options for image model | 获取图片模型尺寸选项
 * Returns options based on model's sizes array and quality
 */
export const getModelSizeOptions = (modelKey, quality = 'standard') => {
  const model = imageModels.value.find(m => m.key === modelKey)
  
  // If model has getSizesByQuality function, use it | 如果模型有 getSizesByQuality 函数，使用它
  if (model?.getSizesByQuality) {
    return model.getSizesByQuality(quality)
  }
  
  if (!model?.sizes || model.sizes.length === 0) return SEEDREAM_SIZE_OPTIONS
  
  // Convert sizes array to dropdown options | 转换 sizes 数组为下拉选项
  const sizeOptions = quality === '4k' ? SEEDREAM_4K_SIZE_OPTIONS : SEEDREAM_SIZE_OPTIONS
  return model.sizes.map(size => {
    const option = sizeOptions.find(o => o.key === size)
    return option || { label: size, key: size }
  })
}

/**
 * Get quality options for image model | 获取图片模型画质选项
 */
export const getModelQualityOptions = (modelKey) => {
  const model = imageModels.value.find(m => m.key === modelKey)
  return model?.qualities || []
}

/**
 * Get ratio options for video model | 获取视频模型比例选项
 * Returns options based on model's ratios array
 */
export const getModelRatioOptions = (modelKey) => {
  const model = videoModels.value.find(m => m.key === modelKey)
  if (!model?.ratios || model.ratios.length === 0) return VIDEO_RATIO_OPTIONS
  
  // Convert ratios array to dropdown options | 转换 ratios 数组为下拉选项
  return model.ratios.map(ratio => {
    const option = VIDEO_RATIO_LIST.find(o => o.key === ratio)
    return option || { label: ratio, key: ratio }
  })
}

/**
 * Get duration options for video model | 获取视频模型时长选项
 * Returns options based on model's durs array
 */
export const getModelDurationOptions = (modelKey) => {
  const model = videoModels.value.find(m => m.key === modelKey)
  if (!model?.durs || model.durs.length === 0) return VIDEO_DURATION_OPTIONS
  
  // durs is already in { label, key } format | durs 已经是 { label, key } 格式
  return model.durs
}

// Dropdown options (already in label/key format) | 下拉选项
export const imageModelOptions = computed(() => imageModels.value)
export const videoModelOptions = computed(() => videoModels.value)
export const chatModelOptions = computed(() => chatModels.value)

// Simple select options (for n-select and n-dropdown) | 简单选择选项（用于 n-select 和 n-dropdown）
export const imageModelSelectOptions = computed(() => 
  imageModels.value.map(m => ({ label: m.label, value: m.key, key: m.key }))
)

export const videoModelSelectOptions = computed(() => 
  videoModels.value.map(m => ({ label: m.label, value: m.key, key: m.key }))
)

export const chatModelSelectOptions = computed(() => 
  chatModels.value.map(m => ({ label: m.label, value: m.key, key: m.key }))
)

// Export model arrays (computed refs)
export { chatModels, imageModels, videoModels }

// Export defaults | 导出默认值
export {
  DEFAULT_CHAT_MODEL, DEFAULT_IMAGE_MODEL, DEFAULT_IMAGE_SIZE, DEFAULT_VIDEO_DURATION, DEFAULT_VIDEO_MODEL, DEFAULT_VIDEO_RATIO
}

// Export options | 导出选项
export { SEEDREAM_4K_SIZE_OPTIONS, SEEDREAM_QUALITY_OPTIONS, SEEDREAM_SIZE_OPTIONS, VIDEO_DURATION_OPTIONS, VIDEO_RATIO_OPTIONS }

// Export state | 导出状态
export { error, loading }

