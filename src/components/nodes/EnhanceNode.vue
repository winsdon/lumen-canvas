<template>
  <!-- Enhance Node Wrapper -->
  <div
    class="enhance-node-wrapper relative"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
    ref="nodeWrapperRef"
  >

    <!-- Image Toolbar (Floating Pill) -->
    <div class="absolute -top-12 left-1/2 -translate-x-1/2 bg-[var(--bg-secondary)]/90 backdrop-blur-md rounded-full px-3 py-1.5 border border-[var(--border-color)] transition-opacity duration-200 z-50 flex items-center gap-3 shadow-lg whitespace-nowrap"
          :class="showActions ? 'opacity-100' : 'opacity-0 pointer-events-none'">
        <!-- Icon Actions -->
        <div class="flex items-center gap-2">
          <button v-if="resultUrl" @click.stop="handleDownload" class="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors" title="下载">
            <n-icon :size="16"><DownloadOutline /></n-icon>
          </button>
          <button v-if="resultUrl" @click.stop="handlePreview" class="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors" title="放大预览">
            <n-icon :size="16"><EyeOutline /></n-icon>
          </button>
          <button @click.stop="handleDelete" class="p-1 text-[var(--text-secondary)] hover:text-red-500 transition-colors" title="删除">
            <n-icon :size="16"><TrashOutline /></n-icon>
          </button>
        </div>
    </div>

    <!-- Node Label (Outside Top-Left) -->
    <div class="absolute -top-7 left-0 z-20 pointer-events-none">
      <span class="text-sm text-[var(--text-tertiary)] select-none">增强</span>
    </div>

    <!-- Main Panel -->
    <div
      class="enhance-node bg-[var(--bg-secondary)] rounded-2xl border w-[320px] transition-all duration-200 flex flex-col overflow-hidden relative z-10"
      :class="selected ? 'border-2 border-[var(--accent-color)] shadow-xl shadow-[var(--accent-color)]/20' : 'border border-[var(--border-color)] shadow-md'"
    >
      <!-- Source Image Preview -->
      <div
        class="relative bg-[var(--bg-tertiary)] group/image cursor-pointer transition-all duration-300"
        style="aspect-ratio: 1 / 1;"
        @click="togglePanel"
      >
        <!-- Loading State -->
        <div v-if="loading" class="absolute inset-0 flex flex-col items-center justify-center z-10 bg-[var(--bg-tertiary)]">
          <div class="w-full h-full bg-gradient-to-br from-purple-500/20 via-blue-500/20 to-pink-500/20 animate-pulse absolute inset-0"></div>
          <div class="relative z-10 flex flex-col items-center gap-3">
             <img src="../../assets/loading.webp" alt="Loading" class="w-14 h-12" />
             <span class="text-sm text-[var(--text-secondary)] font-medium">AI 处理中...</span>
          </div>
        </div>

        <!-- Error State -->
        <div v-else-if="error" class="absolute inset-0 flex flex-col items-center justify-center p-4 text-center z-10 bg-red-900/20">
          <n-icon :size="32" class="text-red-500 mb-2"><CloseCircleOutline /></n-icon>
          <span class="text-sm text-red-500 break-words w-full">{{ error }}</span>
        </div>

        <!-- Result Image -->
        <div v-else-if="resultUrl" class="w-full h-full relative">
          <n-image
            :src="resultUrl"
            class="w-full h-full block"
            object-fit="cover"
            :preview-disabled="true"
          />
          <n-image
            ref="previewImageRef"
            :src="resultUrl"
            class="fixed -left-[9999px] -top-[9999px] w-0 h-0 opacity-0 pointer-events-none"
            object-fit="cover"
            :preview-disabled="false"
          />
        </div>

        <!-- Source Image -->
        <div v-else-if="sourceImageUrl" class="w-full h-full relative">
          <n-image
            :src="sourceImageUrl"
            class="w-full h-full block"
            object-fit="cover"
            :preview-disabled="true"
          />
          <div class="absolute inset-0 bg-black/30 flex items-center justify-center">
            <span class="text-white text-sm bg-black/50 px-3 py-1 rounded-full">点击配置增强</span>
          </div>
        </div>

        <!-- Empty State -->
        <div v-else class="absolute inset-0 flex flex-col items-center justify-center text-[var(--text-tertiary)] gap-2">
          <n-icon :size="32"><ImageOutline /></n-icon>
          <span class="text-sm">等待输入图片</span>
        </div>
      </div>

    </div>

    <Handle type="target" :position="Position.Left" id="left" class="enhance-handle custom-handle">
      <div class="w-6 h-6 rounded-full bg-[var(--accent-color)] flex items-center justify-center shadow-sm">
        <n-icon :size="16" class="text-black"><AddOutline /></n-icon>
      </div>
    </Handle>
    <Handle type="source" :position="Position.Right" id="right" class="enhance-handle custom-handle">
      <div class="w-6 h-6 rounded-full bg-[var(--accent-color)] flex items-center justify-center shadow-sm">
        <n-icon :size="16" class="text-black"><AddOutline /></n-icon>
      </div>
    </Handle>

    <!-- Bottom Config Panel (Floating) -->
    <Transition name="slide-fade">
      <div
        v-show="isPanelExpanded"
        class="absolute top-[calc(100%+16px)] left-1/2 -translate-x-1/2 w-[360px] bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-color)] shadow-2xl z-50 flex flex-col overflow-hidden"
        @click.stop
      >
        <!-- Tab Header -->
        <div class="flex border-b border-[var(--border-color)]">
          <button
            @click="activeTab = 'upscale'"
            class="flex-1 py-3 text-sm font-medium transition-colors"
            :class="activeTab === 'upscale' ? 'text-[var(--accent-color)] border-b-2 border-[var(--accent-color)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'"
          >
            高清放大
          </button>
          <button
            @click="activeTab = 'skin'"
            class="flex-1 py-3 text-sm font-medium transition-colors"
            :class="activeTab === 'skin' ? 'text-[var(--accent-color)] border-b-2 border-[var(--accent-color)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'"
          >
            皮肤编辑器
          </button>
        </div>

        <!-- Upscale Tab Content -->
        <div v-show="activeTab === 'upscale'" class="p-4 flex flex-col gap-4">
          <!-- Model Select -->
          <div class="flex flex-col gap-2">
            <label class="text-xs text-[var(--text-secondary)]">模型</label>
            <n-dropdown :options="upscaleModelOptions" @select="handleUpscaleModelSelect" trigger="click">
              <button class="flex items-center justify-between w-full px-3 py-2 bg-[var(--bg-tertiary)] rounded-lg text-sm hover:bg-[var(--bg-primary)] transition-colors border border-[var(--border-color)]">
                <span class="text-[var(--text-primary)]">{{ selectedUpscaleModelLabel }}</span>
                <n-icon :size="14" class="text-[var(--text-tertiary)]"><ChevronDownOutline /></n-icon>
              </button>
            </n-dropdown>
          </div>

          <!-- Style Select -->
          <div class="flex flex-col gap-2">
            <label class="text-xs text-[var(--text-secondary)]">风格</label>
            <n-dropdown :options="upscaleStyleOptions" @select="handleUpscaleStyleSelect" trigger="click">
              <button class="flex items-center justify-between w-full px-3 py-2 bg-[var(--bg-tertiary)] rounded-lg text-sm hover:bg-[var(--bg-primary)] transition-colors border border-[var(--border-color)]">
                <span class="text-[var(--text-primary)]">{{ selectedUpscaleStyleLabel }}</span>
                <n-icon :size="14" class="text-[var(--text-tertiary)]"><ChevronDownOutline /></n-icon>
              </button>
            </n-dropdown>
          </div>

          <!-- Scale Select -->
          <div class="flex flex-col gap-2">
            <label class="text-xs text-[var(--text-secondary)]">放大倍数</label>
            <div class="flex gap-2">
              <button
                v-for="scale in [2, 4, 6]"
                :key="scale"
                @click="upscaleScale = scale"
                class="flex-1 py-2 rounded-lg text-sm font-medium transition-all border"
                :class="upscaleScale === scale
                  ? 'bg-[var(--accent-color)]/10 border-[var(--accent-color)] text-[var(--accent-color)]'
                  : 'bg-[var(--bg-tertiary)] border-[var(--border-color)] text-[var(--text-secondary)] hover:border-[var(--text-secondary)]'"
              >
                {{ scale }}x
              </button>
            </div>
          </div>

          <!-- Points Display -->
          <div class="flex items-center justify-between">
            <span class="text-xs text-[var(--text-secondary)]">预计消耗</span>
            <span class="text-sm text-[var(--accent-color)] font-medium">{{ upscalePoints }} 积分</span>
          </div>
        </div>

        <!-- Skin Editor Tab Content -->
        <div v-show="activeTab === 'skin'" class="p-4 flex flex-col gap-4">
          <!-- Mode Select -->
          <div class="flex flex-col gap-2">
            <label class="text-xs text-[var(--text-secondary)]">模式</label>
            <n-dropdown :options="skinModeOptions" @select="handleSkinModeSelect" trigger="click">
              <button class="flex items-center justify-between w-full px-3 py-2 bg-[var(--bg-tertiary)] rounded-lg text-sm hover:bg-[var(--bg-primary)] transition-colors border border-[var(--border-color)]">
                <span class="text-[var(--text-primary)]">{{ selectedSkinModeLabel }}</span>
                <n-icon :size="14" class="text-[var(--text-tertiary)]"><ChevronDownOutline /></n-icon>
              </button>
            </n-dropdown>
          </div>

          <!-- Intensity Slider -->
          <div class="flex flex-col gap-2">
            <div class="flex items-center justify-between">
              <label class="text-xs text-[var(--text-secondary)]">强度</label>
              <span class="text-sm text-[var(--text-primary)] font-medium">{{ skinIntensity }}</span>
            </div>
            <input
              type="range"
              v-model.number="skinIntensity"
              min="16"
              max="134"
              class="w-full h-2 bg-[var(--bg-tertiary)] rounded-lg appearance-none cursor-pointer accent-[var(--accent-color)]"
            />
            <div class="flex justify-between text-xs text-[var(--text-tertiary)]">
              <span>16</span>
              <span>134</span>
            </div>
          </div>

          <!-- Processing Time Estimate -->
          <div class="flex items-center justify-between">
            <span class="text-xs text-[var(--text-secondary)]">预计处理时间</span>
            <span class="text-sm text-[var(--text-primary)]">~{{ estimatedTime }}s</span>
          </div>

          <!-- Points Display -->
          <div class="flex items-center justify-between">
            <span class="text-xs text-[var(--text-secondary)]">预计消耗</span>
            <span class="text-sm text-[var(--accent-color)] font-medium">{{ skinPoints }} 积分</span>
          </div>
        </div>

        <!-- Action Bar -->
        <div class="flex items-center justify-end px-4 py-3 bg-[var(--bg-tertiary)] border-t border-[var(--border-color)]">
          <button
            @click="handleEnhance"
            :disabled="loading || !sourceImageUrl"
            :class="(loading || !sourceImageUrl) ? 'bg-[var(--text-primary)] opacity-50 cursor-not-allowed' : 'bg-[var(--accent-color)] hover:opacity-90'"
            class="px-4 py-2 rounded-lg text-sm font-medium text-[var(--bg-primary)] transition-colors"
          >
            <span v-if="loading" class="flex items-center gap-2">
              <n-spin :size="14" />
              处理中...
            </span>
            <span v-else>开始增强</span>
          </button>
        </div>
      </div>
    </Transition>

  </div>
</template>

<script setup>
import {
  AddOutline,
  ChevronDownOutline,
  CloseCircleOutline,
  DownloadOutline,
  EyeOutline,
  ImageOutline,
  TrashOutline
} from '@vicons/ionicons5'
import { Handle, Position, useVueFlow } from '@vue-flow/core'
import { NDropdown, NIcon, NImage, NSpin } from 'naive-ui'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useImageEnhance } from '../../hooks'
import { edges, nodes, removeNode, updateNode } from '../../stores/canvas'

const props = defineProps({
  id: String,
  data: Object,
  selected: Boolean,
  // Vue Flow Standard Props
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

const emit = defineEmits(['updateNodeInternals'])
const { updateNodeInternals } = useVueFlow()

// Hooks
const { loading: enhanceLoading, error: enhanceError, result: enhanceResult, enhance: submitEnhance } = useImageEnhance()

// State
const showActions = ref(false)
const isPanelExpanded = ref(false)
const activeTab = ref(props.data?.enhanceType || 'upscale')
const localLoading = ref(props.data?.loading || false)
const localError = ref(props.data?.error || null)
const resultUrl = ref(props.data?.resultUrl || '')
const previewImageRef = ref(null)
const nodeWrapperRef = ref(null)
let hideTimer = null

// Computed loading and error states (use hook state or local state)
const loading = computed(() => localLoading.value || enhanceLoading.value)
const error = computed(() => localError.value || enhanceError.value?.message)

// Upscale parameters
const upscaleModel = ref(props.data?.upscaleModel || 'topazlabs')
const upscaleStyle = ref(props.data?.upscaleStyle || 'general')
const upscaleScale = ref(props.data?.upscaleScale || 2)

// Skin parameters
const skinMode = ref(props.data?.skinMode || 'detail_enhance')
const skinIntensity = ref(props.data?.skinIntensity || 50)

// Options
const upscaleModelOptions = [
  { label: 'Topazlabs', value: 'topazlabs' },
  { label: 'Real-ESRGAN', value: 'real-esrgan' },
  { label: 'GFPGAN', value: 'gfpgan' }
]

const upscaleStyleOptions = [
  { label: '通用', value: 'general' },
  { label: '动漫', value: 'anime' },
  { label: '照片', value: 'photo' }
]

const skinModeOptions = [
  { label: '细节增强', value: 'detail_enhance' },
  { label: '皮肤平滑', value: 'skin_smooth' },
  { label: '美白', value: 'whitening' }
]

// Computed labels
const selectedUpscaleModelLabel = computed(() => {
  return upscaleModelOptions.find(o => o.value === upscaleModel.value)?.label || 'Topazlabs'
})

const selectedUpscaleStyleLabel = computed(() => {
  return upscaleStyleOptions.find(o => o.value === upscaleStyle.value)?.label || '通用'
})

const selectedSkinModeLabel = computed(() => {
  return skinModeOptions.find(o => o.value === skinMode.value)?.label || '细节增强'
})

// Source image from connected node
const sourceImageUrl = computed(() => {
  // First check if we have a direct source URL
  if (props.data?.sourceImageUrl) {
    return props.data.sourceImageUrl
  }

  // Otherwise, look for connected source node
  const incoming = edges.value.filter(e => e.target === props.id)
  for (const edge of incoming) {
    const sourceNode = nodes.value.find(n => n.id === edge.source)
    if (!sourceNode) continue

    if (sourceNode.type === 'textToImage' || sourceNode.type === 'image') {
      const url = sourceNode.data?.url
      const base64 = sourceNode.data?.base64
      if (url) return url
      if (base64) return base64
    }
  }

  return null
})

// Points calculation
const upscalePoints = computed(() => {
  return upscaleScale.value * 10 // Example: 2x = 20 points, 4x = 40 points, 6x = 60 points
})

const skinPoints = computed(() => {
  return 15 // Fixed points for skin editing
})

const estimatedTime = computed(() => {
  // Rough estimate based on intensity
  return Math.round(10 + (skinIntensity.value - 16) / 118 * 20)
})

// Methods
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

const togglePanel = () => {
  isPanelExpanded.value = !isPanelExpanded.value
}

const handleUpscaleModelSelect = (key) => {
  upscaleModel.value = key
  updateNodeData()
}

const handleUpscaleStyleSelect = (key) => {
  upscaleStyle.value = key
  updateNodeData()
}

const handleSkinModeSelect = (key) => {
  skinMode.value = key
  updateNodeData()
}

const updateNodeData = () => {
  updateNode(props.id, {
    enhanceType: activeTab.value,
    upscaleModel: upscaleModel.value,
    upscaleStyle: upscaleStyle.value,
    upscaleScale: upscaleScale.value,
    skinMode: skinMode.value,
    skinIntensity: skinIntensity.value,
    sourceImageUrl: sourceImageUrl.value
  })
}

const handleEnhance = async () => {
  if (!sourceImageUrl.value) {
    window.$message?.warning('请先连接图片源')
    return
  }

  localLoading.value = true
  localError.value = null
  updateNode(props.id, { loading: true, error: null })

  try {
    // Build request parameters based on active tab
    const params = {
      imageUrl: sourceImageUrl.value,
      type: activeTab.value
    }

    if (activeTab.value === 'upscale') {
      params.upscaleModel = upscaleModel.value
      params.upscaleStyle = upscaleStyle.value
      params.upscaleScale = upscaleScale.value
    } else {
      params.skinMode = skinMode.value
      params.skinIntensity = skinIntensity.value
    }

    // Call the enhance API
    const result = await submitEnhance(params)

    if (result && result.url) {
      resultUrl.value = result.url
      updateNode(props.id, {
        resultUrl: result.url,
        loading: false,
        updatedAt: Date.now()
      })
      window.$message?.success('图片增强成功')
    }
  } catch (err) {
    localError.value = err.message || '增强失败'
    updateNode(props.id, {
      loading: false,
      error: localError.value
    })
    window.$message?.error(localError.value)
  } finally {
    localLoading.value = false
  }
}

const handleDownload = () => {
  if (resultUrl.value) {
    const link = document.createElement('a')
    link.href = resultUrl.value
    link.download = `enhanced_${Date.now()}.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }
}

const handlePreview = () => {
  if (!resultUrl.value) return

  const el = previewImageRef.value?.$el || previewImageRef.value
  const imgEl = el?.querySelector?.('img')
  if (imgEl) {
    imgEl.click()
    return
  }

  window.open(resultUrl.value, '_blank')
}

const handleDelete = () => {
  removeNode(props.id)
}

// Global click handler to close panel
const handleGlobalClick = (event) => {
  if (isPanelExpanded.value && nodeWrapperRef.value && !nodeWrapperRef.value.contains(event.target)) {
    const target = event.target
    if (target.closest('.n-popover') || target.closest('.n-dropdown-menu') || target.closest('.n-popover-shared')) {
      return
    }
    isPanelExpanded.value = false
  }
}

// Watch for source image changes
watch(sourceImageUrl, (newUrl) => {
  if (newUrl) {
    updateNode(props.id, { sourceImageUrl: newUrl })
  }
})

// Watch for tab changes
watch(activeTab, () => {
  updateNodeData()
})

// Watch for intensity changes with debounce
let intensityTimeout = null
watch(skinIntensity, () => {
  if (intensityTimeout) clearTimeout(intensityTimeout)
  intensityTimeout = setTimeout(() => {
    updateNodeData()
  }, 300)
})

onMounted(() => {
  document.addEventListener('click', handleGlobalClick)
})

onUnmounted(() => {
  document.removeEventListener('click', handleGlobalClick)
  if (intensityTimeout) clearTimeout(intensityTimeout)
  if (hideTimer) clearTimeout(hideTimer)
})
</script>

<style scoped>
.enhance-node-wrapper {
  /* Ensure z-index handling for overlapping */
}

:deep(.enhance-handle) {
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

.enhance-node-wrapper:hover :deep(.enhance-handle) {
  opacity: 1;
  pointer-events: auto;
}

/* Custom range slider */
input[type="range"] {
  -webkit-appearance: none;
  appearance: none;
  background: transparent;
}

input[type="range"]::-webkit-slider-track {
  background: var(--bg-tertiary);
  height: 8px;
  border-radius: 4px;
}

input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--accent-color);
  cursor: pointer;
  margin-top: -5px;
}

input[type="range"]::-moz-range-track {
  background: var(--bg-tertiary);
  height: 8px;
  border-radius: 4px;
}

input[type="range"]::-moz-range-thumb {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--accent-color);
  cursor: pointer;
  border: none;
}

/* Slide Fade Transition */
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
