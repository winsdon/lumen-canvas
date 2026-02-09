<template>
  <div
    class="text-to-video-node-wrapper relative"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
    ref="nodeWrapperRef"
  >
    <div
      class="absolute -top-12 left-1/2 -translate-x-1/2 bg-[var(--bg-secondary)]/90 backdrop-blur-md rounded-full px-3 py-1.5 border border-[var(--border-color)] transition-opacity duration-200 z-50 flex items-center gap-3 shadow-lg whitespace-nowrap"
      :class="showActions ? 'opacity-100' : 'opacity-0 pointer-events-none'"
    >
      <div class="flex items-center gap-2">
        <button
          v-if="videoUrl"
          @click.stop="handleDownload"
          class="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          title="下载"
        >
          <n-icon :size="16"><DownloadOutline /></n-icon>
        </button>
        <button
          v-if="videoUrl"
          @click.stop="handlePreview"
          class="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          title="预览"
        >
          <n-icon :size="16"><EyeOutline /></n-icon>
        </button>
        <button
          @click.stop="handleDelete"
          class="p-1 text-[var(--text-secondary)] hover:text-red-500 transition-colors"
          title="删除"
        >
          <n-icon :size="16"><TrashOutline /></n-icon>
        </button>
      </div>
    </div>

    <div
      class="text-to-video-node bg-[var(--bg-secondary)] rounded-2xl border w-[360px] transition-all duration-200 flex flex-col overflow-hidden relative z-10"
      :class="selected ? 'border-2 border-[var(--accent-color)] shadow-xl shadow-[var(--accent-color)]/20' : 'border border-[var(--border-color)] shadow-md'"
      @click="toggleInputPanel"
    >
      <div class="absolute top-3 left-3 z-20 pointer-events-none">
        <span class="text-sm font-semibold text-[var(--text-primary)] drop-shadow-md">视频</span>
      </div>

      <div class="relative bg-[var(--bg-tertiary)] group/video cursor-pointer transition-all duration-300" style="aspect-ratio: 16 / 9;">
        <div v-if="nodeLoading" class="absolute inset-0 flex flex-col items-center justify-center z-10 bg-[var(--bg-tertiary)]">
          <div class="w-full h-full bg-gradient-to-br from-cyan-500/20 via-blue-500/20 to-amber-500/20 animate-pulse absolute inset-0"></div>
          <div class="relative z-10 flex flex-col items-center gap-3">
            <img src="../../assets/loading.webp" alt="Loading" class="w-14 h-12" />
            <span class="text-sm text-[var(--text-secondary)] font-medium">AI 正在生成视频...</span>
          </div>
        </div>

        <div v-else-if="nodeError" class="absolute inset-0 flex flex-col items-center justify-center p-4 text-center z-10 bg-red-900/20">
          <n-icon :size="32" class="text-red-500 mb-2"><CloseCircleOutline /></n-icon>
          <span class="text-sm text-red-500 break-words w-full">{{ nodeError }}</span>
        </div>

        <div v-else-if="videoUrl" class="w-full h-full relative bg-black">
          <video :src="videoUrl" controls class="w-full h-full object-contain" />
        </div>

        <div v-else class="absolute inset-0 flex flex-col justify-center px-8 text-[var(--text-secondary)] gap-3">
          <div class="text-sm text-[var(--text-tertiary)]">尝试:</div>
          <div class="flex items-center gap-2 text-base hover:text-[var(--text-primary)] transition-colors">
            <n-icon :size="16"><VideocamOutline /></n-icon>
            <span>文生视频</span>
          </div>
          <div class="text-xs text-[var(--text-tertiary)] leading-5">
            点击卡片输入提示词，选择模型、分辨率和时长后生成。
          </div>
        </div>
      </div>

    </div>

    <Handle type="target" :position="Position.Left" id="left" class="t2v-handle custom-handle">
      <div class="w-6 h-6 rounded-full bg-[var(--accent-color)] flex items-center justify-center shadow-sm">
        <n-icon :size="16" class="text-black"><AddOutline /></n-icon>
      </div>
    </Handle>
    <Handle type="source" :position="Position.Right" id="right" class="t2v-handle custom-handle">
      <div class="w-6 h-6 rounded-full bg-[var(--accent-color)] flex items-center justify-center shadow-sm">
        <n-icon :size="16" class="text-black"><AddOutline /></n-icon>
      </div>
    </Handle>

    <Transition name="slide-fade">
      <div
        v-show="isInputExpanded"
        class="absolute top-[calc(100%+16px)] left-1/2 -translate-x-1/2 w-[520px] bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-color)] shadow-2xl z-50 flex flex-col overflow-hidden"
        @click.stop
      >
        <div class="flex items-start p-3 gap-3">
          <div class="relative w-12 h-12">
            <div
              class="w-12 h-12 rounded-xl bg-[var(--bg-tertiary)] hover:bg-[var(--bg-primary)] border border-[var(--border-color)] transition-colors overflow-hidden group relative flex flex-col items-center justify-center"
            >
              <img v-if="referenceImageUrl" :src="referenceImageUrl" class="absolute inset-0 w-full h-full object-cover" />
              <div v-if="referenceImageUrl" class="absolute inset-0 bg-black/30"></div>

              <n-spin v-if="isReferenceUploading" :size="18" class="relative z-10" />
              <template v-else>
                <n-icon :size="18" class="text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] mb-0.5 relative z-10">
                  <AddOutline />
                </n-icon>
                <span class="text-[10px] text-[var(--text-tertiary)] group-hover:text-[var(--text-secondary)] relative z-10">参考图</span>
              </template>

              <input
                type="file"
                accept="image/*"
                class="absolute inset-0 opacity-0 cursor-pointer z-20"
                :disabled="isReferenceUploading"
                @change="handleReferenceUpload"
              />
            </div>

            <button
              v-if="referenceImageUrl"
              class="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[var(--bg-secondary)] border border-[var(--border-color)] flex items-center justify-center z-30 hover:bg-[var(--bg-primary)]"
              @click.stop="handleRemoveReference"
              title="移除参考图"
            >
              <n-icon :size="12" class="text-[var(--text-secondary)]"><CloseCircleOutline /></n-icon>
            </button>

            <button
              v-if="referenceImageUrl"
              class="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[var(--bg-secondary)] border border-[var(--border-color)] flex items-center justify-center z-30 hover:bg-[var(--bg-primary)]"
              @click.stop="handleReferencePreview"
              title="预览参考图"
            >
              <n-icon :size="12" class="text-[var(--text-secondary)]"><EyeOutline /></n-icon>
            </button>

            <n-image
              v-if="referenceImageUrl"
              ref="referencePreviewImageRef"
              :src="referenceImageUrl"
              class="fixed -left-[9999px] -top-[9999px] w-0 h-0 opacity-0 pointer-events-none"
              object-fit="cover"
              :preview-disabled="false"
            />
          </div>

          <button
            @click="handlePolish"
            :disabled="isPolishing || !content.trim()"
            class="flex items-center justify-center w-12 h-12 rounded-xl bg-[var(--bg-tertiary)] hover:bg-[var(--bg-primary)] border border-[var(--border-color)] transition-colors group"
            :class="{ 'animate-pulse border-purple-500': isPolishing }"
          >
            <n-spin v-if="isPolishing" :size="18" />
            <n-icon v-else :size="20" class="text-[var(--text-secondary)] group-hover:text-purple-400"><SparklesOutline /></n-icon>
          </button>

          <div class="flex-1 relative">
            <textarea
              v-model="content"
              @blur="updateNodeData"
              @wheel.stop
              @keydown.enter.exact.prevent="handleGenerate"
              class="nodrag w-full bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] resize-none outline-none border-none py-1 h-20 leading-5 overflow-y-auto"
              placeholder="输入视频描述（Enter 生成）"
            ></textarea>
          </div>
        </div>

        <div class="flex items-center justify-between px-4 py-2 bg-[var(--bg-tertiary)] border-t border-[var(--border-color)]">
          <div class="flex items-center gap-4">
            <n-dropdown
              :options="modelOptions"
              :render-label="renderDropdownLabel"
              :menu-props="getModelMenuProps"
              @select="handleModelSelect"
              trigger="click"
              placement="top-start"
            >
              <button class="flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                <n-icon :size="16"><VideocamOutline /></n-icon>
                <span class="max-w-[160px] truncate font-medium">{{ displayModelName }}</span>
                <n-icon :size="12"><ChevronDownOutline /></n-icon>
              </button>
            </n-dropdown>

            <n-dropdown
              :options="resolutionOptions"
              :menu-props="getModelMenuProps"
              @select="handleResolutionSelect"
              trigger="click"
              placement="top"
            >
              <button class="flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                <span class="font-medium">{{ localResolution }}</span>
                <n-icon :size="12"><ChevronDownOutline /></n-icon>
              </button>
            </n-dropdown>

            <n-dropdown
              :options="durationOptions"
              :menu-props="getModelMenuProps"
              @select="handleDurationSelect"
              trigger="click"
              placement="top"
            >
              <button class="flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                <span class="font-medium">{{ localDuration }}s</span>
                <n-icon :size="12"><ChevronDownOutline /></n-icon>
              </button>
            </n-dropdown>
          </div>

          <div class="flex items-center gap-3">
            <div v-if="currentModelPoints" class="text-sm text-[var(--accent-color)] font-medium px-1.5 py-0.5 rounded">
              {{ currentModelPoints }} 积分
            </div>
            <button
              @click="handleGenerate"
              :disabled="nodeLoading || !content.trim()"
              :class="(nodeLoading || !content.trim()) ? 'bg-[var(--text-primary)]' : 'bg-[var(--accent-color)]'"
              class="w-7 h-7 rounded-full text-[var(--bg-primary)] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
            >
              <n-icon v-if="nodeLoading" :size="14"><div class="animate-spin rounded-full h-3 w-3 border-b-2 border-[var(--bg-primary)]"></div></n-icon>
              <n-icon v-else :size="16"><ArrowUpOutline /></n-icon>
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import {
  AddOutline,
  ArrowUpOutline,
  ChevronDownOutline,
  CloseCircleOutline,
  DownloadOutline,
  EyeOutline,
  SparklesOutline,
  TrashOutline,
  VideocamOutline,
  AddCircle
} from '@vicons/ionicons5'
import { Handle, Position, useVueFlow } from '@vue-flow/core'
import { NDropdown, NIcon, NImage, NSpin } from 'naive-ui'
import { computed, h, onMounted, onUnmounted, ref, watch } from 'vue'
import { getFilePresignedUrl, uploadFileToUrl } from '../../api'
import { useChat, useVideoGeneration } from '../../hooks'
import { duplicateNode, edges, nodes, removeNode, updateNode } from '../../stores/canvas'
import { DEFAULT_VIDEO_DURATION, DEFAULT_VIDEO_MODEL, DEFAULT_VIDEO_RESOLUTION, getModelConfig, getModelDurationOptions, videoModelSelectOptions, VIDEO_RESOLUTION_OPTIONS } from '../../stores/models'

const props = defineProps({
  id: String,
  data: Object,
  selected: Boolean,
  type: String,
  position: Object,
  zIndex: Number,
  label: String,
  dragging: Boolean,
  resizing: Boolean,
  connectable: Boolean,
  dimensions: Object,
  isValidTargetPos: Function,
  isValidSourcePos: Function,
  parent: String,
  parentNodeId: String,
  targetPosition: String,
  sourcePosition: String,
  dragHandle: String,
  events: Object
})

const { updateNodeInternals } = useVueFlow()

const showActions = ref(false)
const content = ref(props.data?.content || '')
const localModel = ref(props.data?.model || DEFAULT_VIDEO_MODEL)
const localResolution = ref(props.data?.resolution || DEFAULT_VIDEO_RESOLUTION)
const localDuration = ref(props.data?.dur || DEFAULT_VIDEO_DURATION)
const hasManualModelSelection = ref(false)
const isPolishing = ref(false)
const isInputExpanded = ref(false)
const nodeWrapperRef = ref(null)
const referencePreviewImageRef = ref(null)
const isReferenceUploading = ref(false)
let hideTimer = null

const { loading, error, video, taskId, generate } = useVideoGeneration()
const { send: sendChat } = useChat({
  systemPrompt: '你是一个专业的AI视频提示词专家。将用户输入的内容美化成高质量的视频生成提示词，包含镜头语言、风格、光线、构图、动作、节奏等要素。直接返回提示词，不要其他解释。'
})

const modelOptions = videoModelSelectOptions
const resolutionOptions = computed(() => VIDEO_RESOLUTION_OPTIONS)
const durationOptions = computed(() => getModelDurationOptions(localModel.value))

const currentModelPoints = computed(() => {
  const model = modelOptions.value.find(m => m.value === localModel.value || m.key === localModel.value)
  return model?.point ?? model?.imagePoint
})

const renderDropdownLabel = (option) => {
  const points = option?.point ?? option?.imagePoint
  if (points === undefined || points === null) return option.label
  return h('div', { class: 'flex items-center justify-between gap-4 min-w-[140px]' }, [
    h('span', option.label),
    h('span', { class: 'text-xs font-medium text-[var(--accent-color)] px-2 py-0.5 rounded' }, `${points} 积分`)
  ])
}

const referenceImageUrl = computed(() => props.data?.referenceImageUrl)
const isSyncingReference = ref(false)
const lastSyncedSourceId = ref(null)
const lastSyncedSourceSignature = ref(null)

const displayModelName = computed(() => {
  const model = modelOptions.value.find(m => m.value === localModel.value || m.key === localModel.value)
  return model?.label || localModel.value || '选择模型'
})

const videoUrl = computed(() => video.value?.url || props.data?.url)
const nodeLoading = computed(() => Boolean(props.data?.loading) || Boolean(loading.value))
const nodeError = computed(() => {
  if (props.data?.error) return props.data.error
  return error.value?.message || ''
})

const getModelMenuProps = () => ({
  style: {
    border: '1px solid var(--border-color)',
    '--n-color': 'var(--bg-secondary)'
  }
})

const handleMouseEnter = () => {
  if (hideTimer) {
    clearTimeout(hideTimer)
    hideTimer = null
  }
  showActions.value = true
}

const handleMouseLeave = () => {
  hideTimer = setTimeout(() => {
    showActions.value = false
  }, 200)
}

const updateNodeData = () => {
  updateNode(props.id, {
    content: content.value,
    model: localModel.value,
    resolution: localResolution.value,
    dur: localDuration.value
  })
}

const toggleInputPanel = () => {
  isInputExpanded.value = !isInputExpanded.value
}

const applyModelSelection = (key) => {
  localModel.value = key
  const config = getModelConfig(key)
  if (config?.defaultParams?.duration) {
    localDuration.value = config.defaultParams.duration
  }
  updateNodeData()
}

const handleModelSelect = (key) => {
  hasManualModelSelection.value = true
  applyModelSelection(key)
}

const handleResolutionSelect = (key) => {
  localResolution.value = key
  updateNodeData()
}

const handleDurationSelect = (key) => {
  localDuration.value = key
  updateNodeData()
}

const handlePolish = async () => {
  const input = content.value.trim()
  if (!input) return

  isPolishing.value = true
  try {
    const result = await sendChat(input, true)
    if (result) {
      content.value = result
      updateNodeData()
      window.$message?.success('提示词已润色')
    }
  } catch (err) {
    if (!err?.__handled) {
      window.$message?.error('润色失败: ' + err.message)
    }
  } finally {
    isPolishing.value = false
  }
}

const handleReferenceUpload = async (event) => {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return

  try {
    isReferenceUploading.value = true
    const res = await getFilePresignedUrl(file.name)
    const { uploadUrl, url } = res
    await uploadFileToUrl(uploadUrl, file)

    updateNode(props.id, {
      referenceImageUrl: url,
      referenceImageFileName: file.name,
      referenceImageFileType: file.type,
      updatedAt: Date.now()
    })

    window.$message?.success('参考图上传成功')
  } catch (err) {
    window.$message?.error('参考图上传失败')
  } finally {
    isReferenceUploading.value = false
  }
}

const handleReferencePreview = () => {
  if (!referenceImageUrl.value) return

  const el = referencePreviewImageRef.value?.$el || referencePreviewImageRef.value
  const imgEl = el?.querySelector?.('img')
  if (imgEl) {
    imgEl.click()
    return
  }

  window.open(referenceImageUrl.value, '_blank')
}

const handleRemoveReference = () => {
  updateNode(props.id, {
    referenceImageUrl: null,
    referenceImageFileName: null,
    referenceImageFileType: null,
    updatedAt: Date.now()
  })
}

const getConnectedReferenceSource = () => {
  const incoming = edges.value.filter(e => e.target === props.id)
  for (let i = incoming.length - 1; i >= 0; i--) {
    const edge = incoming[i]
    const sourceNode = nodes.value.find(n => n.id === edge.source)
    if (!sourceNode) continue

    if (sourceNode.type === 'textToImage' || sourceNode.type === 'image') {
      const url = sourceNode.data?.url
      const base64 = sourceNode.data?.base64
      if (url || base64) {
        return { nodeId: sourceNode.id, url, base64, fileName: sourceNode.data?.fileName }
      }
    }
  }
  return null
}

const syncReferenceFromSource = async (source) => {
  if (!source) return
  if (isSyncingReference.value) return

  const signature = source.url || `${String(source.base64 || '').slice(0, 64)}|${String(source.base64 || '').slice(-64)}`
  if (lastSyncedSourceId.value === source.nodeId && lastSyncedSourceSignature.value === signature) return

  isSyncingReference.value = true
  try {
    if (source.url) {
      if (source.url !== referenceImageUrl.value) {
        updateNode(props.id, {
          referenceImageUrl: source.url,
          referenceImageFileName: source.fileName || null,
          referenceImageFileType: null,
          updatedAt: Date.now()
        })
      }
    } else if (source.base64) {
      const base64String = source.base64
      const matches = String(base64String).match(/^data:(.+?);base64,(.+)$/)
      const mime = matches?.[1] || 'image/png'
      const raw = matches?.[2] || base64String

      const bytes = atob(raw)
      const array = new Uint8Array(bytes.length)
      for (let i = 0; i < bytes.length; i++) array[i] = bytes.charCodeAt(i)

      const ext = mime.includes('jpeg') ? 'jpg' : (mime.includes('webp') ? 'webp' : 'png')
      const name = `reference_${Date.now()}.${ext}`
      const blob = new Blob([array], { type: mime })

      const res = await getFilePresignedUrl(name)
      const { uploadUrl, url } = res
      await uploadFileToUrl(uploadUrl, blob)

      updateNode(props.id, {
        referenceImageUrl: url,
        referenceImageFileName: name,
        referenceImageFileType: mime,
        updatedAt: Date.now()
      })
    }
  } finally {
    lastSyncedSourceId.value = source.nodeId
    lastSyncedSourceSignature.value = signature
    isSyncingReference.value = false
  }
}

const handleGenerate = async () => {
  if (!content.value.trim()) return

  updateNode(props.id, { loading: true, error: null })
  try {
    const result = await generate(
      {
        model: localModel.value,
        prompt: content.value,
        resolution: localResolution.value,
        duration: localDuration.value,
        imgUrl: referenceImageUrl.value || ''
      },
      {
        onTaskId: (id) => {
          updateNode(props.id, { taskId: id, updatedAt: Date.now() })
        }
      }
    )

    if (result?.url) {
      updateNode(props.id, {
        url: result.url,
        loading: false,
        error: null,
        taskId: result.id || taskId.value || props.data?.taskId,
        updatedAt: Date.now()
      })
      window.$message?.success('视频生成成功')
      return
    }

    updateNode(props.id, { loading: false, error: '未返回视频地址' })
    window.$message?.error('未返回视频地址')
  } catch (err) {
    updateNode(props.id, {
      loading: false,
      error: err.message || '生成失败'
    })
    window.$message?.error(err.message || '视频生成失败')
  }
}

const handlePreview = () => {
  if (!videoUrl.value) return
  window.open(videoUrl.value, '_blank')
}

const handleDownload = () => {
  if (!videoUrl.value) return
  const link = document.createElement('a')
  link.href = videoUrl.value
  link.download = `generated_${Date.now()}.mp4`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

const handleDelete = () => {
  removeNode(props.id)
}

const handleDuplicate = () => {
  const newId = duplicateNode(props.id)
  if (newId) {
    setTimeout(() => updateNodeInternals(newId), 50)
    window.$message?.success('节点已复制')
  }
}

const handleGlobalClick = (event) => {
  if (isInputExpanded.value && nodeWrapperRef.value && !nodeWrapperRef.value.contains(event.target)) {
    const target = event.target
    if (target.closest('.n-popover') || target.closest('.n-dropdown-menu') || target.closest('.n-popover-shared')) {
      return
    }
    isInputExpanded.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleGlobalClick)
  if (!props.data?.model || !props.data?.resolution || !props.data?.dur) {
    updateNodeData()
  }
})

onUnmounted(() => {
  document.removeEventListener('click', handleGlobalClick)
})

watch(
  () => [
    edges.value.length,
    edges.value.map(e => `${e.id}:${e.source}->${e.target}:${e.sourceHandle || ''}:${e.targetHandle || ''}`).join('|'),
    nodes.value.length,
    nodes.value.map(n => `${n.id}:${n.data?.url || ''}:${n.data?.base64 ? 'b64' : ''}`).join('|')
  ].join('::'),
  () => {
    const source = getConnectedReferenceSource()
    if (!source) {
      if (referenceImageUrl.value) {
        updateNode(props.id, {
          referenceImageUrl: null,
          referenceImageFileName: null,
          referenceImageFileType: null,
          updatedAt: Date.now()
        })
      }
      return
    }
    syncReferenceFromSource(source)
  },
  { immediate: true }
)

watch(
  () => modelOptions.value.map(o => o?.key || o?.value).join('|'),
  () => {
    if (hasManualModelSelection.value) return
    const options = modelOptions.value || []
    if (options.length === 0) return

    const selected = localModel.value
    const exists = options.some(o => (o?.key || o?.value) === selected)
    if (exists && props.data?.model) return

    const firstKey = options[0]?.key || options[0]?.value
    if (!firstKey) return
    applyModelSelection(firstKey)
  },
  { immediate: true }
)
</script>

<style scoped>
:deep(.t2v-handle) {
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s ease;
  width: auto;
  height: auto;
  background: transparent;
  border: none;
  min-width: 0;
  min-height: 0;
  z-index: 9999;
}

.text-to-video-node-wrapper:hover :deep(.t2v-handle) {
  opacity: 1;
  pointer-events: auto;
}

textarea::-webkit-scrollbar {
  width: 4px;
}
textarea::-webkit-scrollbar-track {
  background: transparent;
}
textarea::-webkit-scrollbar-thumb {
  background: #444;
  border-radius: 2px;
}
textarea::-webkit-scrollbar-thumb:hover {
  background: #666;
}

.slide-fade-enter-active,
.slide-fade-leave-active {
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.slide-fade-enter-from,
.slide-fade-leave-to {
  opacity: 0;
  transform: translate(-50%, -10px);
}
</style>
