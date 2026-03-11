<template>
  <!-- Text to Image Node Wrapper -->
  <div 
    class="text-to-image-node-wrapper relative" 
    @mouseenter="handleMouseEnter" 
    @mouseleave="handleMouseLeave"
    ref="nodeWrapperRef"
  >
    
    <!-- Image Toolbar (Floating Pill) -->
    <div class="absolute -top-12 left-1/2 -translate-x-1/2 bg-[var(--bg-secondary)]/90 backdrop-blur-md rounded-full px-3 py-1.5 border border-[var(--border-color)] transition-opacity duration-200 z-50 flex items-center gap-3 shadow-lg whitespace-nowrap"
          :class="showActions ? 'opacity-100' : 'opacity-0 pointer-events-none'">
        <!-- Text Actions -->
        <div v-if="imageUrl" class="flex items-center gap-3 pr-3 border-r border-[var(--border-color)]">
          <button class="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
            <n-icon :size="14"><CreateOutline /></n-icon>
            <span>重绘</span>
          </button>
          <button class="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
            <n-icon :size="14"><TrashOutline /></n-icon>
            <span>擦除</span>
          </button>
          <button @click.stop="handleEnhance" class="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
            <n-icon :size="14"><ScanOutline /></n-icon>
            <span>增强</span>
          </button>
          <button class="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
            <n-icon :size="14"><ExpandOutline /></n-icon>
            <span>扩图</span>
          </button>
        </div>

        <!-- Icon Actions -->
        <div class="flex items-center gap-2">
          <button v-if="imageUrl" @click.stop="handleDownload" class="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors" title="下载">
            <n-icon :size="16"><DownloadOutline /></n-icon>
          </button>
          <button v-if="imageUrl" @click.stop="handlePreview" class="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors" title="放大预览">
            <n-icon :size="16"><EyeOutline /></n-icon>
          </button>
          <button @click.stop="handleDelete" class="p-1 text-[var(--text-secondary)] hover:text-red-500 transition-colors" title="删除">
            <n-icon :size="16"><TrashOutline /></n-icon>
          </button>
        </div>
    </div>
    
    <!-- Node Label (Outside Top-Left) -->
    <div class="absolute -top-7 left-0 z-20 pointer-events-none">
      <span class="text-sm text-[var(--text-tertiary)] select-none">图片</span>
    </div>
    
    <!-- Top Panel: Image Display Area | 顶部：图片展示区域 -->
    <div
      class="text-to-image-node bg-[var(--bg-secondary)] rounded-2xl border w-[320px] transition-all duration-200 flex flex-col overflow-hidden relative z-10"
      :class="selected ? 'border-2 border-[var(--accent-color)] shadow-xl shadow-[var(--accent-color)]/20' : 'border border-[var(--border-color)] shadow-md'"
      @click="toggleInputPanel"
    >

      <div 
        class="relative bg-[var(--bg-tertiary)] group/image cursor-pointer transition-all duration-300" 
        :style="{ aspectRatio: imageAspectRatio }"
      >
        
        <!-- Loading State -->
        <div v-if="loading" class="absolute inset-0 flex flex-col items-center justify-center z-10 bg-[var(--bg-tertiary)]">
          <div class="w-full h-full bg-gradient-to-br from-purple-500/20 via-blue-500/20 to-pink-500/20 animate-pulse absolute inset-0"></div>
          <div class="relative z-10 flex flex-col items-center gap-3">
             <img src="../../assets/loading.webp" alt="Loading" class="w-14 h-12" />
             <span class="text-sm text-[var(--text-secondary)] font-medium">AI 正在绘图中...</span>
          </div>
        </div>

        <!-- Error State -->
        <div v-else-if="error" class="absolute inset-0 flex flex-col items-center justify-center p-4 text-center z-10 bg-red-900/20">
          <n-icon :size="32" class="text-red-500 mb-2"><CloseCircleOutline /></n-icon>
          <span class="text-sm text-red-500 break-words w-full">{{ error.message || '生成失败' }}</span>
        </div>

        <!-- Image Result -->
        <div v-else-if="imageUrl" class="w-full h-full relative group/image-result">
          <n-image
            :src="imageUrl"
            class="w-full h-full block"
            object-fit="cover"
            :preview-disabled="true"
          />

          <n-image
            ref="previewImageRef"
            :src="imageUrl"
            class="fixed -left-[9999px] -top-[9999px] w-0 h-0 opacity-0 pointer-events-none"
            object-fit="cover"
            :preview-disabled="false"
          />
        </div>

        <!-- Empty State (Menu Style) -->
        <div v-else class="absolute inset-0 flex flex-col justify-center px-8 text-[var(--text-secondary)] gap-4">
           <div class="text-sm text-[var(--text-tertiary)] mb-1">尝试:</div>
           
           <div class="flex flex-col gap-3">
             <div class="flex items-center gap-2 text-base hover:text-[var(--text-primary)] transition-colors">
               <n-icon :size="16"><ImageOutline /></n-icon>
               <span>图生图</span>
             </div>
             <div class="flex items-center gap-2 text-base hover:text-[var(--text-primary)] transition-colors">
               <n-icon :size="16"><VideocamOutline /></n-icon>
               <span>图生视频</span>
             </div>
             <div class="flex items-center gap-2 text-base hover:text-[var(--text-primary)] transition-colors">
               <n-icon :size="16"><ColorWandOutline /></n-icon>
               <span>图片换背景</span>
             </div>
           </div>
        </div>

      </div>

    </div>

    <Handle type="target" :position="Position.Left" id="left" class="t2i-handle custom-handle">
      <div class="w-6 h-6 rounded-full bg-[var(--accent-color)] flex items-center justify-center shadow-sm">
        <n-icon :size="16" class="text-black"><AddOutline /></n-icon>
      </div>
    </Handle>
    <Handle type="source" :position="Position.Right" id="right" class="t2i-handle custom-handle">
      <div class="w-6 h-6 rounded-full bg-[var(--accent-color)] flex items-center justify-center shadow-sm">
        <n-icon :size="16" class="text-black"><AddOutline /></n-icon>
      </div>
    </Handle>

    <!-- Hover Actions (Delete/Copy) -->
    <div v-show="showActions" class="absolute -top-10 right-0 flex gap-2 z-50">
       
    </div>

    <!-- Bottom Input Panel (Floating) | 底部输入面板（悬浮） -->
    <Transition name="slide-fade">
      <div 
        v-show="isInputExpanded"
        class="absolute top-[calc(100%+16px)] left-1/2 -translate-x-1/2 w-[480px] bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-color)] shadow-2xl z-50 flex flex-col overflow-hidden"
        @click.stop
      >
        <!-- Input Header -->
        <div class="flex flex-col p-3 gap-3">
          <!-- Connected Text Indicator -->
          <div v-if="!content && connectedText" class="flex items-center gap-1.5 text-xs text-[var(--accent-color)] bg-[var(--accent-color)]/10 px-2 py-1 rounded self-start border border-[var(--accent-color)]/20 max-w-full">
            <n-icon :size="12"><TextOutline /></n-icon>
            <span class="flex-shrink-0">已连接文本源</span>
            <span class="opacity-70 truncate flex-1">{{ connectedText }}</span>
          </div>

          <!-- Reference Image Upload Area | 参考图上传区域 -->
          <div :key="referenceRenderKey" class="flex flex-wrap gap-2">
            <!-- Upload Button | 上传按钮 -->
            <div
              v-if="referenceImages.length < 5"
              class="relative w-12 h-12 rounded-xl bg-[var(--bg-tertiary)] hover:bg-[var(--bg-primary)] border border-[var(--border-color)] border-dashed transition-colors overflow-hidden group flex flex-col items-center justify-center flex-shrink-0"
            >
              <n-spin v-if="isReferenceUploading" :size="18" />
              <template v-else>
                <n-icon :size="18" class="text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] mb-0.5">
                  <AddOutline />
                </n-icon>
                <span class="text-[10px] text-[var(--text-tertiary)] group-hover:text-[var(--text-secondary)]">参考图</span>
              </template>

              <input
                type="file"
                accept="image/*"
                class="absolute inset-0 opacity-0 cursor-pointer z-20"
                :disabled="isReferenceUploading"
                @change="handleReferenceUpload"
                title="上传参考图 (最多5张)"
              />
            </div>

            <!-- Uploaded Images List | 已上传图片列表 -->
            <div 
              v-for="(img, index) in referenceImages" 
              :key="img.sourceNodeId || img.url || index"
              class="relative w-12 h-12 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-color)] overflow-hidden group flex-shrink-0"
            >
              <n-image :src="img.url" class="w-full h-full block" object-fit="cover" />
              
              <!-- Remove Button | 移除按钮 -->
              <button
                class="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/50 hover:bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all z-10"
                @click.stop="handleRemoveReference(index)"
                title="移除"
              >
                <n-icon :size="10"><CloseCircleOutline /></n-icon>
              </button>
            </div>
          </div>
          
          <!-- Text Input -->
          <div class="flex-1 relative w-full">
            <textarea
              v-model="content"
              @blur="updateNodeData"
              @wheel.stop
              @keydown.enter.exact.prevent="handleGenerate"
              class="nodrag w-full bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] resize-none outline-none border-none py-1 h-20 leading-5 overflow-y-auto"
              placeholder="输入描述或按 '/' 呼出指令（Enter 发送）"
            ></textarea>
          </div>
        </div>

        <!-- Control Bar -->
        <div class="flex items-center justify-between px-4 py-2 bg-[var(--bg-tertiary)] border-t border-[var(--border-color)]">
          <div class="flex items-center gap-4">
            <!-- Model Select -->
            <n-dropdown :options="modelOptions" :render-label="renderDropdownLabel" :menu-props="getModelMenuProps" @select="handleModelSelect" trigger="click" placement="top-start">
              <button class="flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                <n-icon :size="16"><ImageOutline /></n-icon>
                <span class="max-w-[120px] truncate font-medium">{{ displayModelName }}</span>
                <n-icon :size="12"><ChevronDownOutline /></n-icon>
              </button>
            </n-dropdown>

            <!-- Ratio Select -->
            <n-popover trigger="click" placement="top" :show-arrow="false" raw :style="{ backgroundColor: 'var(--bg-secondary)', padding: 0, borderRadius: '12px', border: '1px solid var(--border-color)' }">
              <template #trigger>
                <div class="flex items-center gap-1.5 cursor-pointer group hover:bg-[var(--bg-primary)] px-2 py-1 rounded transition-colors">
                  <div class="w-4 h-4 flex items-center justify-center border border-[var(--text-secondary)] rounded-[2px]">
                    <div class="w-2 h-2 border border-[var(--text-secondary)] rounded-[1px]"></div>
                  </div>
                  <span class="text-sm text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] select-none font-medium">{{ displayRatio }}</span>
                  <n-icon :size="12" class="text-[var(--text-tertiary)]"><ChevronDownOutline /></n-icon>
                </div>
              </template>
              
              <div class="p-3 w-[280px]">
                <div class="text-xs text-[var(--text-secondary)] mb-2 px-1">比例</div>
                <div class="flex gap-2 mb-2">
                  <div 
                    @click="handleRatioSelect('auto')"
                    class="w-20 h-24 bg-[var(--bg-tertiary)] hover:bg-[var(--bg-primary)] rounded-lg flex flex-col items-center justify-center gap-2 cursor-pointer border border-transparent transition-all"
                    :class="{ '!border-[var(--accent-color)] !bg-[var(--accent-color)]/10': selectedRatio === 'auto' }"
                  >
                    <n-icon :size="24" :class="selectedRatio === 'auto' ? 'text-[var(--accent-color)]' : 'text-[var(--text-tertiary)]'"><ScanOutline /></n-icon>
                    <span class="text-xs" :class="selectedRatio === 'auto' ? 'text-[var(--accent-color)]' : 'text-[var(--text-tertiary)]'">自适应</span>
                  </div>
                  
                  <div class="flex-1 grid grid-cols-4 gap-2">
                    <div 
                      v-for="ratio in ratioOptions" 
                      :key="ratio.label"
                      @click="handleRatioSelect(ratio.value)"
                      class="flex flex-col items-center gap-1 cursor-pointer group"
                    >
                      <div 
                        class="border rounded-sm transition-colors"
                        :class="selectedRatio === ratio.value ? 'border-[var(--accent-color)] bg-[var(--accent-color)]/20' : 'border-[var(--text-tertiary)] group-hover:border-[var(--text-secondary)]'"
                        :style="{ width: ratio.w + 'px', height: ratio.h + 'px' }"
                      ></div>
                      <span class="text-[10px]" :class="selectedRatio === ratio.value ? 'text-[var(--accent-color)]' : 'text-[var(--text-tertiary)] group-hover:text-[var(--text-secondary)]'">{{ ratio.label }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </n-popover>
          </div>

          <div class="flex items-center gap-3">
             <div v-if="currentModelPoints" class="text-sm text-[var(--accent-color)] font-medium px-1.5 py-0.5 rounded">
               {{ currentModelPoints * generateCount }} 积分
             </div>

             <!-- Generate Button -->
             <button 
               @click="handleGenerate"
               :disabled="loading || (!content.trim() && !connectedText)"
               :class="(loading || (!content.trim() && !connectedText)) ? 'bg-[var(--text-primary)]' : 'bg-[var(--accent-color)]'"
               class="w-7 h-7 rounded-full text-[var(--bg-primary)] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
             >
               <n-icon v-if="loading" :size="14"><div class="animate-spin rounded-full h-3 w-3 border-b-2 border-[var(--bg-primary)]"></div></n-icon>
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
  ColorWandOutline,
  CreateOutline,
  DownloadOutline,
  ExpandOutline,
  EyeOutline,
  ImageOutline,
  ScanOutline,
  TextOutline,
  TrashOutline,
  VideocamOutline
} from '@vicons/ionicons5'
import { Handle, Position, useVueFlow } from '@vue-flow/core'
import { NDropdown, NIcon, NImage, NPopover, NSpin } from 'naive-ui'
import { computed, h, onMounted, onUnmounted, ref, watch } from 'vue'
import { getFilePresignedUrl, uploadFileToUrl } from '../../api'
import { useImageGeneration } from '../../hooks'
import { addEdge, addNode, duplicateNode, edges, nodes, removeEdge, removeNode, updateNode } from '../../stores/canvas'
import { DEFAULT_IMAGE_MODEL, getModelConfig, imageModelSelectOptions } from '../../stores/models'

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
const referenceRenderKey = ref(0)

// State
const showActions = ref(false)
const content = ref(props.data?.content || '')
const localModel = ref(props.data?.model || DEFAULT_IMAGE_MODEL)
const generateCount = ref(props.data?.n || 1)
const isInputExpanded = ref(false)
const selectedRatio = ref(props.data?.ratio || 'auto')
const previewImageRef = ref(null)
const isReferenceUploading = ref(false)
const nodeWrapperRef = ref(null)
let hideTimer = null

const referenceImages = ref([])
const referenceImageUrl = computed(() => referenceImages.value[0]?.url) // Compatibility for other checks
const isSyncingReference = ref(false)
const lastSyncedSourcesSignature = ref(null)

const syncReferenceImagesFromData = () => {
  const sources = getConnectedReferenceSources()
  if (sources.length > 0) {
    const immediate = sources
      .map(source => ({
        url: source.url || source.base64,
        fileName: source.fileName || null,
        sourceNodeId: source.nodeId
      }))
      .filter(img => img.url)
      .slice(0, 5)
    if (immediate.length > 0) {
      referenceImages.value = immediate
      referenceRenderKey.value += 1
      updateNodeInternals(props.id)
      return
    }
  }
  if (props.data?.referenceImages && Array.isArray(props.data.referenceImages) && props.data.referenceImages.length > 0) {
    referenceImages.value = props.data.referenceImages
    referenceRenderKey.value += 1
    updateNodeInternals(props.id)
    return
  }
  if (props.data?.referenceImageUrl) {
    referenceImages.value = [{
      url: props.data.referenceImageUrl,
      fileName: props.data.referenceImageFileName,
      type: props.data.referenceImageFileType
    }]
    referenceRenderKey.value += 1
    updateNodeInternals(props.id)
    return
  }
  if (referenceImages.value.length > 0) {
    referenceImages.value = []
    referenceRenderKey.value += 1
    updateNodeInternals(props.id)
  }
}

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

const ratioOptions = [
  { label: '1:1', value: '1:1', size: '2048x2048', w: 12, h: 12 },
  { label: '9:16', value: '9:16', size: '1440x2560', w: 9, h: 16 },
  { label: '16:9', value: '16:9', size: '2560x1440', w: 16, h: 9 },
  { label: '3:4', value: '3:4', size: '1728x2304', w: 10, h: 14 },
  { label: '4:3', value: '4:3', size: '2304x1728', w: 14, h: 10 },
  { label: '3:2', value: '3:2', size: '2496x1664', w: 14, h: 9 },
  { label: '2:3', value: '2:3', size: '1664x2496', w: 9, h: 14 },
  { label: '21:9', value: '21:9', size: '3024x1296', w: 21, h: 9 },
  { label: '9:21', value: '9:21', size: '1296x3024', w: 9, h: 21 }
]

const displayRatio = computed(() => {
  if (selectedRatio.value === 'auto') return '自适应'
  return selectedRatio.value
})

watch(
  () => props.data?.ratio || 'auto',
  (ratio) => {
    if (ratio !== selectedRatio.value) selectedRatio.value = ratio
  },
  { immediate: true }
)

const connectedText = computed(() => {
  const incoming = edges.value.filter(e => e.target === props.id)
  for (const edge of incoming) {
    const sourceNode = nodes.value.find(n => n.id === edge.source)
    if (!sourceNode) continue
    
    // Check for Text Combination Node
    if (sourceNode.type === 'textCombination') {
      const text = sourceNode.data?.generatedContent || sourceNode.data?.content
      if (text) return text
    }
    
    // Check for Text Node
    if (sourceNode.type === 'text') {
      const text = sourceNode.data?.content
      if (text) return text
    }
  }
  return null
})

// Hooks
const { loading, error, images, generate } = useImageGeneration()
const polishSystemPrompt = '你是一个专业的AI绘画提示词专家。将用户输入的内容美化成高质量的生图提示词，包含风格、光线、构图、细节等要素。请用中文输出。直接返回提示词，不要其他解释。'

// Computed
const imageUrl = computed(() => {
  if (images.value && images.value.length > 0) return images.value[0].url
  return props.data?.url
})

const imageAspectRatio = computed(() => {
  if (props.data?.ratio && props.data.ratio !== 'auto') {
    const [rw, rh] = String(props.data.ratio).split(':').map(Number)
    if (rw && rh) return `${rw} / ${rh}`
  }
  if (!props.data?.generatedSize) return '1 / 1'
  try {
    const [w, h] = props.data.generatedSize.split('x').map(Number)
    if (!w || !h) return '1 / 1'
    return `${w} / ${h}`
  } catch (e) {
    return '1 / 1'
  }
})

const modelOptions = imageModelSelectOptions

const displayModelName = computed(() => {
  const model = modelOptions.value.find(m => m.value === localModel.value || m.key === localModel.value)
  return model?.label || localModel.value || '选择模型'
})

const currentModelPoints = computed(() => {
  const model = modelOptions.value.find(m => m.value === localModel.value || m.key === localModel.value)
  return model?.imagePoint
})

const getModelMenuProps = () => ({
  style: {
    border: '1px solid var(--border-color)',
    '--n-color': 'var(--bg-secondary)'
  }
})

const renderDropdownLabel = (option) => {
  if (option.imagePoint === undefined || option.imagePoint === null) return option.label
  return h('div', { class: 'flex items-center justify-between gap-4 min-w-[140px]' }, [
    h('span', option.label),
    h('span', { class: 'text-xs font-medium text-[var(--accent-color)] px-2 py-0.5 rounded' }, `${option.imagePoint} 积分`)
  ])
}

// Methods
const updateNodeData = () => {
  updateNode(props.id, { 
    content: content.value,
    model: localModel.value,
    n: generateCount.value
  })
}

const toggleInputPanel = () => {
  isInputExpanded.value = !isInputExpanded.value
}

const handleRatioSelect = (ratio) => {
  selectedRatio.value = ratio
}

const handleModelSelect = (key) => {
  localModel.value = key
  updateNodeData()
}

const handleGenerate = async () => {
  const promptToUse = content.value.trim() || connectedText.value
  if (!promptToUse) return
  
  updateNode(props.id, { loading: true, error: null })
  
  try {
    const config = getModelConfig(localModel.value)
    let size = config?.defaultParams?.size || '1024x1024'
    const quality = config?.defaultParams?.quality || 'standard'

    if (selectedRatio.value !== 'auto') {
      const matched = ratioOptions.find(r => r.value === selectedRatio.value)
      if (matched?.size) size = matched.size
    }

    const result = await generate({
      model: localModel.value,
      prompt: promptToUse,
      n: generateCount.value,
      size,
      quality,
      systemPrompt: polishSystemPrompt,
      image: referenceImages.value.map(img => img.url).join(',')
    })

    if (result && result.length > 0) {
      updateNode(props.id, {
        url: result[0].url,
        loading: false,
        updatedAt: Date.now(),
        generatedSize: size,
        ratio: selectedRatio.value
      })
      window.$message?.success('图片生成成功')
    }
  } catch (err) {
    updateNode(props.id, {
      loading: false,
      error: err.message
    })
    window.$message?.error(err.message || '生成失败')
  }
}

const handleReferenceUpload = async (event) => {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return

  if (referenceImages.value.length >= 5) {
    window.$message?.warning('最多只能上传5张参考图')
    return
  }

  try {
    isReferenceUploading.value = true

    const res = await getFilePresignedUrl(file.name)
    const { uploadUrl, url } = res
    await uploadFileToUrl(uploadUrl, file)

    const newImages = [...referenceImages.value, {
      url: url,
      fileName: file.name,
      type: file.type
    }]

    updateNode(props.id, {
      referenceImages: newImages,
      referenceImageUrl: null, // Clear legacy
      updatedAt: Date.now()
    })
    referenceImages.value = newImages
    referenceRenderKey.value += 1
    updateNodeInternals(props.id)

    window.$message?.success('参考图上传成功')
  } catch (err) {
    window.$message?.error('参考图上传失败')
  } finally {
    isReferenceUploading.value = false
  }
}

const getConnectedReferenceSources = () => {
  const incoming = edges.value.filter(e => e.target === props.id)
  const sources = []
  for (const edge of incoming) {
    const sourceNode = nodes.value.find(n => n.id === edge.source)
    if (!sourceNode) continue
    if (sourceNode.type !== 'textToImage' && sourceNode.type !== 'image') continue

    const url = sourceNode.data?.url
    const base64 = sourceNode.data?.base64
    if (!url && !base64) continue

    sources.push({ nodeId: sourceNode.id, url, base64, fileName: sourceNode.data?.fileName })
    if (sources.length >= 5) break
  }
  return sources
}

const syncReferencesFromSources = async (sources) => {
  if (!sources?.length) return
  if (isSyncingReference.value) return

  const signature = sources
    .map(s => s.url || `${String(s.base64 || '').slice(0, 64)}|${String(s.base64 || '').slice(-64)}`)
    .join('||')
  if (lastSyncedSourcesSignature.value === signature) return

  isSyncingReference.value = true
  try {
    const synced = []
    const seenKeys = new Set()
    const seenUrls = new Set()

    for (const source of sources.slice(0, 5)) {
      const key = source.nodeId || source.url || source.base64
      if (!key || seenKeys.has(key)) continue
      seenKeys.add(key)
      if (source.url) {
        seenUrls.add(source.url)
        synced.push({
          url: source.url,
          fileName: source.fileName || null,
          sourceNodeId: source.nodeId
        })
        continue
      }

      if (!source.base64) continue
      if (isReferenceUploading.value) break

      isReferenceUploading.value = true
      try {
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

        seenUrls.add(url)
        synced.push({ url, fileName: name, type: mime, sourceNodeId: source.nodeId })
      } finally {
        isReferenceUploading.value = false
      }
    }

    const manual = referenceImages.value.filter(img => {
      if (img?.sourceNodeId && seenKeys.has(img.sourceNodeId)) return false
      if (img?.url && seenUrls.has(img.url)) return false
      return !img?.sourceNodeId
    })
    const merged = [...synced, ...manual].slice(0, 5)

    updateNode(props.id, {
      referenceImages: merged,
      referenceImageUrl: null,
      updatedAt: Date.now()
    })
    referenceImages.value = merged
    referenceRenderKey.value += 1
    updateNodeInternals(props.id)
  } finally {
    lastSyncedSourcesSignature.value = signature
    isSyncingReference.value = false
  }
}

const handleRemoveReference = (index) => {
  const target = referenceImages.value[index]
  const newImages = [...referenceImages.value]
  newImages.splice(index, 1)
  
  updateNode(props.id, {
    referenceImages: newImages,
    referenceImageUrl: null,
    updatedAt: Date.now()
  })
  referenceImages.value = newImages
  referenceRenderKey.value += 1
  updateNodeInternals(props.id)
  if (target?.sourceNodeId) {
    const toRemove = edges.value.filter(edge => edge.source === target.sourceNodeId && edge.target === props.id)
    toRemove.forEach(edge => removeEdge(edge.id))
  }
  lastSyncedSourcesSignature.value = null
}

const handleDownload = () => {
  if (imageUrl.value) {
    const link = document.createElement('a')
    link.href = imageUrl.value
    link.download = `generated_${Date.now()}.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }
}

const handlePreview = () => {
  if (!imageUrl.value) return

  const el = previewImageRef.value?.$el || previewImageRef.value
  const imgEl = el?.querySelector?.('img')
  if (imgEl) {
    imgEl.click()
    return
  }

  window.open(imageUrl.value, '_blank')
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

const handleEnhance = () => {
  if (!imageUrl.value) {
    window.$message?.warning('请先生成图片')
    return
  }

  // Get current node position
  const currentNode = nodes.value.find(n => n.id === props.id)
  const nodeX = currentNode?.position?.x || 0
  const nodeY = currentNode?.position?.y || 0

  // Create enhance node
  const enhanceNodeId = addNode('enhance', {
    x: nodeX + 350,
    y: nodeY + 50
  }, {
    sourceImageUrl: imageUrl.value,
    sourceImageId: props.id,
    label: '图片增强'
  })

  // Create edge connection
  addEdge({
    source: props.id,
    target: enhanceNodeId,
    sourceHandle: 'right',
    targetHandle: 'left'
  })

  // Force update node internals
  setTimeout(() => {
    updateNodeInternals(enhanceNodeId)
  }, 50)

  window.$message?.success('已创建增强节点')
}

// Global click handler to close panel
const handleGlobalClick = (event) => {
  if (isInputExpanded.value && nodeWrapperRef.value && !nodeWrapperRef.value.contains(event.target)) {
    // Check if the click target is within a popover or dropdown
    const target = event.target
    if (target.closest('.n-popover') || target.closest('.n-dropdown-menu') || target.closest('.n-popover-shared')) {
      return
    }
    isInputExpanded.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleGlobalClick)
  if (!props.data?.model) updateNodeData()
  syncReferenceImagesFromData()
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
    const sources = getConnectedReferenceSources()
    if (sources.length > 0) {
      syncReferenceImagesFromData()
      syncReferencesFromSources(sources)
      return
    }
    const manual = referenceImages.value.filter(img => !img?.sourceNodeId)
    if (manual.length !== referenceImages.value.length) {
      updateNode(props.id, {
        referenceImages: manual,
        referenceImageUrl: null,
        updatedAt: Date.now()
      })
      referenceImages.value = manual
      referenceRenderKey.value += 1
      updateNodeInternals(props.id)
    }
    lastSyncedSourcesSignature.value = null
  },
  { immediate: true }
)

watch(
  () => [
    props.data?.referenceImages?.length || 0,
    props.data?.referenceImageUrl || ''
  ].join('::'),
  () => {
    syncReferenceImagesFromData()
  },
  { immediate: true }
)

</script>

<style scoped>
.text-to-image-node-wrapper {
  /* Ensure z-index handling for overlapping */
}

:deep(.n-image) {
  width: 100%;
  height: 100%;
}

:deep(.n-image .n-image__wrapper) {
  width: 100%;
  height: 100%;
}

:deep(.n-image img),
:deep(.n-image .n-image__img) {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
}

:deep(.t2i-handle) {
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

.text-to-image-node-wrapper:hover :deep(.t2i-handle) {
  opacity: 1;
  pointer-events: auto;
}

/* Custom scrollbar for textarea */
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
