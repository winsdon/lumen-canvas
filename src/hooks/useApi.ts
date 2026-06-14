/**
 * API Hooks | API Hooks
 * Simplified hooks for open source version | 开源版简化 hooks
 */

import {
  aiEnhanceImage,
  aiImageDraw,
  aiVideoGenerate,
  getAiEnhanceListByIds,
  getAiImageListByIds,
  getAiVideoMy,
  streamChatCompletions
} from '@/api'
import { fetchModels, getModelId } from '@/stores/aiModels'
import { DEFAULT_CHAT_MODEL } from '@/config/models'
import { onUnmounted, reactive, ref } from 'vue'

/**
 * Base API state hook | 基础 API 状态 Hook
 */
export const useApiState = () => {
  const loading = ref(false)
  const error = ref(null)
  const status = ref('idle')

  const reset = () => {
    loading.value = false
    error.value = null
    status.value = 'idle'
  }

  const setLoading = (isLoading) => {
    loading.value = isLoading
    status.value = isLoading ? 'running' : status.value
  }

  const setError = (err) => {
    error.value = err
    status.value = 'error'
    loading.value = false
  }

  const setSuccess = () => {
    status.value = 'success'
    loading.value = false
    error.value = null
  }

  return { loading, error, status, reset, setLoading, setError, setSuccess }
}

/**
 * Chat composable | 问答组合式函数
 */
export const useChat = (options = {}) => {
  const { loading, error, status, reset, setLoading, setError, setSuccess } = useApiState()

  const messages = ref([])
  const currentResponse = ref('')
  let abortController = null

  const send = async (content, stream = true, modelKey = null, images = []) => {
    setLoading(true)
    currentResponse.value = ''

    try {
      const systemPrompt = options.systemPrompt || ''
      let userPrompt = ''
      
      // Construct context from history
      if (messages.value.length > 0) {
        userPrompt = messages.value
          .filter(m => m.role !== 'system')
          .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
          .join('\n')
        userPrompt += `\nUser: ${content}`
      } else {
        userPrompt = content
      }

      if (stream) {
        status.value = 'streaming'
        abortController = new AbortController()
        let fullResponse = ''
        
        // Ensure models are loaded
        await fetchModels(1)
        
        // Determine model ID: explicitly passed > options > default
        const selectedModelKey = modelKey || options.model || DEFAULT_CHAT_MODEL
        const modelId = getModelId(selectedModelKey)
        
        if (!modelId) {
          throw new Error(`Model not found: ${selectedModelKey}`)
        }

        const requestData = { modelId, systemPrompt, userPrompt }
        if (images && images.length > 0) {
          if (import.meta.env.DEV) console.log('[useChat] Sending images with request:', images)
          requestData.images = images
          // Try compatibility fields in case backend expects different naming
          requestData.image = images.join(',')
          requestData.imageUrls = images
        } else {
          if (import.meta.env.DEV) console.log('[useChat] No images found in request')
        }

        for await (const chunk of streamChatCompletions(
          requestData,
          abortController.signal
        )) {
          fullResponse += chunk
          currentResponse.value = fullResponse
        }

        messages.value.push({ role: 'user', content })
        messages.value.push({ role: 'assistant', content: fullResponse })
        setSuccess()
        return fullResponse
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(err)
        throw err
      }
    }
  }

  const stop = () => {
    if (abortController) {
      abortController.abort()
      abortController = null
    }
  }

  const clear = () => {
    messages.value = []
    currentResponse.value = ''
    reset()
  }

  onUnmounted(() => stop())

  return { loading, error, status, messages, currentResponse, send, stop, clear, reset }
}

/**
 * Image generation composable | 图片生成组合式函数
 * Simplified for open source - fixed input/output format
 */
export const useImageGeneration = () => {
  const { loading, error, status, reset, setLoading, setError, setSuccess } = useApiState()

  const images = ref([])
  const currentImage = ref(null)

  /**
   * Generate image with fixed params | 固定参数生成图片
   * @param {Object} params - { model, prompt, size, n, image (optional ref image), systemPrompt (optional) }
   */
  const generate = async (params) => {
    setLoading(true)
    images.value = []
    currentImage.value = null

    try {
      // 1. Ensure models are fetched | 确保模型已加载
      await fetchModels()
      
      // 2. Get Model ID | 获取模型 ID
      const modelId = getModelId(params.model)
      if (!modelId) {
        // Fallback or error? For now error.
        throw new Error(`Model not found or not mapped: ${params.model}`)
      }
      
      // 3. Parse size | 解析尺寸
      // Format: "1024x1024"
      const sizeStr = params.size || '1024x1024'
      const [width, height] = sizeStr.split('x').map(Number)
      
      // 4. Submit tasks (Handle batch) | 提交任务（处理批量）
      const count = params.n || 1
      const taskIds = []
      
      for (let i = 0; i < count; i++) {
         const taskId = await aiImageDraw({
           modelId,
           prompt: params.prompt,
           width,
           height,
           systemPrompt: params.systemPrompt,
           image: params.image // Optional for img2img
         })
         taskIds.push(taskId)
      }
      
      if (taskIds.length === 0) {
        throw new Error('No tasks created')
      }
      
      status.value = 'polling'
      
      // 5. Polling | 轮询
      const maxAttempts = 120 // 5 mins roughly
      const interval = 3000 // 3s
      
      for (let i = 0; i < maxAttempts; i++) {
        // Fetch all statuses
        const results = await getAiImageListByIds(taskIds)
        // results: Array of AiImageRespVO
        
        // Filter finished items (Success or Fail)
        const finishedItems = results.filter(item => item.picUrl || item.errorMessage)
        
        // If all tasks have a result (success or fail)
        // Also check status 20 for success if picUrl is missing but status is correct?
        // User provided example shows: status: 20, picUrl: "..."
        // So checking picUrl should be enough, but let's be robust.
        
        if (finishedItems.length >= taskIds.length) {
          // Check for any success
          const successItems = results.filter(item => item.picUrl)
          const failItems = results.filter(item => item.errorMessage)
          
          if (successItems.length > 0) {
            // Map to unified format
            const generatedImages = successItems.map(item => {
              // Clean up URL if it has spaces or extra quotes (based on user feedback `...` in json?)
              // The example shows: "picUrl": " `https://...` "
              // It seems like there might be extra spaces or backticks in the string? 
              // Let's trim it just in case.
              let url = item.picUrl
              if (url) {
                url = url.trim().replace(/^`|`$/g, '')
              }
              
              return {
                url: url,
                revisedPrompt: item.prompt,
                id: item.id
              }
            })
            
            images.value = generatedImages
            currentImage.value = generatedImages[0]
            setSuccess()
            return generatedImages
          } else {
             // All failed
             throw new Error(failItems[0]?.errorMessage || 'Image generation failed')
          }
        }
        
        // Wait
        await new Promise(resolve => setTimeout(resolve, interval))
      }
      
      throw new Error('Image generation timeout')

    } catch (err) {
      setError(err)
      throw err
    }
  }

  return { loading, error, status, images, currentImage, generate, reset }
}

/**
 * Video generation composable | 视频生成组合式函数
 * Simplified for open source - fixed input/output format with polling
 */
export const useVideoGeneration = () => {
  const { loading, error, status, reset, setLoading, setError, setSuccess } = useApiState()

  const video = ref(null)
  const taskId = ref(null)
  const progress = reactive({
    attempt: 0,
    maxAttempts: 120,
    percentage: 0
  })

  /**
   * Generate video with fixed params | 固定参数生成视频
   * @param {Object} params
   */
  const generate = async (params, options = {}) => {
    setLoading(true)
    video.value = null
    taskId.value = null
    progress.attempt = 0
    progress.percentage = 0

    try {
      await fetchModels(4)

      const modelKey = params?.model
      const modelId = params?.modelId || getModelId(modelKey)

      if (!modelId) {
        throw new Error('未找到模型 ID，请刷新模型列表后重试')
      }

      const hasFirstFrame = params?.images?.some(img => img.role === 'first_frame')
      const type = params?.type || (hasFirstFrame ? 2 : 1)
      const duration = params?.duration ?? params?.dur

      if (!params?.prompt) {
        throw new Error('请输入提示词')
      }

      if (type === 2 && !hasFirstFrame) {
        throw new Error('图生视频需要首帧图片')
      }

      if (!duration) {
        throw new Error('请选择时长')
      }

      if (!params?.resolution) {
        throw new Error('请选择分辨率')
      }

      const requestData = {
        modelId,
        type,
        prompt: params.prompt,
        duration,
        resolution: params.resolution
      }

      // 传递图片列表（首帧、尾帧、参考图）
      if (params.images && params.images.length > 0) {
        requestData.images = params.images
      }

      if (params.negativePrompt) requestData.negativePrompt = params.negativePrompt
      if (params.audioUrl) requestData.audioUrl = params.audioUrl
      if (params.promptExtend !== undefined) requestData.promptExtend = params.promptExtend
      if (params.watermark !== undefined) requestData.watermark = params.watermark
      if (params.seed !== undefined) requestData.seed = params.seed
      if (params.shotType) requestData.shotType = params.shotType
      if (params.audio !== undefined) requestData.audio = params.audio
      // 将 ratio 合并到 options 中（后端从 options.ratio 读取）
      const mergedOptions = { ...(params.options || {}) }
      if (params.ratio) mergedOptions.ratio = params.ratio
      if (Object.keys(mergedOptions).length > 0) requestData.options = mergedOptions

      const id = await aiVideoGenerate(requestData)

      if (!id) {
        throw new Error('未获取到视频记录 ID')
      }

      taskId.value = id
      if (typeof options?.onTaskId === 'function') {
        options.onTaskId(id)
      }
      status.value = 'polling'

      const maxAttempts = 120
      const interval = 5000

      for (let i = 0; i < maxAttempts; i++) {
        progress.attempt = i + 1
        progress.percentage = Math.min(Math.round((i / maxAttempts) * 100), 99)

        const record = await getAiVideoMy(id)
        const recordStatus = record?.status

        if (recordStatus === 30) {
          if (!record?.videoUrl) {
            throw new Error('已完成但未返回视频地址')
          }

          progress.percentage = 100
          video.value = { url: record.videoUrl, id, ...record }
          setSuccess()
          return video.value
        }

        if (recordStatus === 40) {
          throw new Error(record?.errorMessage || '视频生成失败')
        }

        if (recordStatus === 50) {
          throw new Error('视频生成已取消')
        }

        await new Promise(resolve => setTimeout(resolve, interval))
      }

      throw new Error('视频生成超时')
    } catch (err) {
      setError(err)
      throw err
    }
  }

  /**
   * Resume polling for an existing task | 恢复已有任务的轮询
   * @param {number|string} existingTaskId - 已有的视频记录 ID
   */
  const resumePoll = async (existingTaskId) => {
    if (!existingTaskId) return null
    setLoading(true)
    taskId.value = existingTaskId
    status.value = 'polling'
    progress.attempt = 0
    progress.percentage = 0

    try {
      const maxAttempts = 120
      const interval = 5000

      for (let i = 0; i < maxAttempts; i++) {
        progress.attempt = i + 1
        progress.percentage = Math.min(Math.round((i / maxAttempts) * 100), 99)

        const record = await getAiVideoMy(existingTaskId)
        const recordStatus = record?.status

        if (recordStatus === 30) {
          if (!record?.videoUrl) {
            throw new Error('已完成但未返回视频地址')
          }
          progress.percentage = 100
          video.value = { url: record.videoUrl, id: existingTaskId, ...record }
          setSuccess()
          return video.value
        }

        if (recordStatus === 40) {
          throw new Error(record?.errorMessage || '视频生成失败')
        }

        if (recordStatus === 50) {
          throw new Error('视频生成已取消')
        }

        await new Promise(resolve => setTimeout(resolve, interval))
      }

      throw new Error('视频生成超时')
    } catch (err) {
      setError(err)
      throw err
    }
  }

  return { loading, error, status, video, taskId, progress, generate, resumePoll, reset }
}

/**
 * Image enhancement composable | 图片增强组合式函数
 */
export const useImageEnhance = () => {
  const { loading, error, status, reset, setLoading, setError, setSuccess } = useApiState()

  const result = ref(null)
  const taskId = ref(null)

  /**
   * Enhance image | 增强图片
   * @param {Object} params - { imageUrl, type, upscaleModel, upscaleStyle, upscaleScale, skinMode, skinIntensity }
   */
  const enhance = async (params) => {
    setLoading(true)
    result.value = null
    taskId.value = null

    try {
      // 1. Submit task
      const id = await aiEnhanceImage(params)
      taskId.value = id
      status.value = 'polling'

      // 2. Polling for results
      const maxAttempts = 120 // 6 mins max
      const interval = 3000 // 3s

      for (let i = 0; i < maxAttempts; i++) {
        const results = await getAiEnhanceListByIds([id])
        const task = results?.[0]

        if (task?.resultUrl) {
          result.value = { url: task.resultUrl, id }
          setSuccess()
          return result.value
        }

        if (task?.errorMessage) {
          throw new Error(task.errorMessage)
        }

        await new Promise(resolve => setTimeout(resolve, interval))
      }

      throw new Error('增强处理超时')
    } catch (err) {
      setError(err)
      throw err
    }
  }

  return { loading, error, status, result, taskId, enhance, reset }
}

/**
 * Combined API composable | 综合 API 组合式函数
 */
export const useApi = () => {
  const chat = useChat()
  const image = useImageGeneration()
  const videoGen = useVideoGeneration()
  const enhance = useImageEnhance()

  return { chat, image, video: videoGen, enhance }
}
