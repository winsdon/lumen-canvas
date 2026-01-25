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
          v-if="imageUrl"
          :class="showActions ? 'opacity-100' : 'opacity-0 pointer-events-none'">
        <!-- Text Actions -->
        <div class="flex items-center gap-3 pr-3 border-r border-[var(--border-color)]">
          <button class="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
            <n-icon :size="14"><CreateOutline /></n-icon>
            <span>重绘</span>
          </button>
          <button class="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
            <n-icon :size="14"><TrashOutline /></n-icon>
            <span>擦除</span>
          </button>
          <button class="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
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
          <button @click.stop="handleDownload" class="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors" title="下载">
            <n-icon :size="16"><DownloadOutline /></n-icon>
          </button>
          <button @click.stop="handlePreview" class="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors" title="放大预览">
            <n-icon :size="16"><EyeOutline /></n-icon>
          </button>
          <button @click.stop="handleDelete" class="p-1 text-[var(--text-secondary)] hover:text-red-500 transition-colors" title="删除">
            <n-icon :size="16"><TrashOutline /></n-icon>
          </button>
        </div>
    </div>
    
    <!-- Top Panel: Image Display Area | 顶部：图片展示区域 -->
    <div
      class="text-to-image-node bg-[var(--bg-secondary)] rounded-2xl border w-[320px] transition-all duration-200 flex flex-col overflow-hidden relative z-10"
      :class="selected ? 'border-2 border-blue-500 shadow-xl shadow-blue-500/20' : 'border border-[var(--border-color)] shadow-md'"
      @click="toggleInputPanel"
    >
      
      <!-- Image Header -->
      <div class="absolute top-3 left-3 z-20 pointer-events-none">
        <span class="text-xs font-semibold text-[var(--text-primary)] drop-shadow-md">图片</span>
      </div>

      <div 
        class="relative bg-[var(--bg-tertiary)] group/image cursor-pointer transition-all duration-300" 
        :style="{ aspectRatio: imageAspectRatio }"
      >
        
        <!-- Loading State -->
        <div v-if="loading" class="absolute inset-0 flex flex-col items-center justify-center z-10 bg-[var(--bg-tertiary)]">
          <div class="w-full h-full bg-gradient-to-br from-purple-500/20 via-blue-500/20 to-pink-500/20 animate-pulse absolute inset-0"></div>
          <div class="relative z-10 flex flex-col items-center gap-3">
             <img src="../../assets/loading.webp" alt="Loading" class="w-14 h-12" />
             <span class="text-xs text-[var(--text-secondary)] font-medium">AI 正在绘图中...</span>
          </div>
        </div>

        <!-- Error State -->
        <div v-else-if="error" class="absolute inset-0 flex flex-col items-center justify-center p-4 text-center z-10 bg-red-900/20">
          <n-icon :size="32" class="text-red-500 mb-2"><CloseCircleOutline /></n-icon>
          <span class="text-xs text-red-500 break-words w-full">{{ error.message || '生成失败' }}</span>
        </div>

        <!-- Image Result -->
        <div v-else-if="imageUrl" class="w-full h-full relative group/image-result">
          <n-image
            :src="imageUrl"
            class="w-full h-full block"
            object-fit="cover"
            :preview-disabled="true"
          />
        </div>

        <!-- Empty State (Menu Style) -->
        <div v-else class="absolute inset-0 flex flex-col justify-center px-8 text-[var(--text-secondary)] gap-4">
           <div class="text-xs text-[var(--text-tertiary)] mb-1">尝试:</div>
           
           <div class="flex flex-col gap-3">
             <div class="flex items-center gap-2 text-sm hover:text-[var(--text-primary)] transition-colors">
               <n-icon :size="16"><ImageOutline /></n-icon>
               <span>图生图</span>
             </div>
             <div class="flex items-center gap-2 text-sm hover:text-[var(--text-primary)] transition-colors">
               <n-icon :size="16"><VideocamOutline /></n-icon>
               <span>图生视频</span>
             </div>
             <div class="flex items-center gap-2 text-sm hover:text-[var(--text-primary)] transition-colors">
               <n-icon :size="16"><ColorWandOutline /></n-icon>
               <span>图片换背景</span>
             </div>
           </div>
           
           <!-- Side Add Buttons (Visual Only) -->
           <div class="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:border-[var(--text-primary)] transition-colors cursor-pointer" title="添加输入">
             <n-icon :size="14"><AddOutline /></n-icon>
           </div>
           <div class="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-6 h-6 rounded-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:border-[var(--text-primary)] transition-colors cursor-pointer" title="添加输出">
             <n-icon :size="14"><AddOutline /></n-icon>
           </div>
        </div>

      </div>

      <!-- Vue Flow Handles -->
      <Handle type="target" :position="Position.Left" id="left" class="!bg-[var(--accent-color)] !w-3 !h-3" />
      <Handle type="source" :position="Position.Right" id="right" class="!bg-[var(--accent-color)] !w-3 !h-3" />

    </div>

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
        <div class="flex items-start p-3 gap-3">
          <!-- Style Button -->
          <button class="flex flex-col items-center justify-center w-12 h-12 rounded-xl bg-[var(--bg-tertiary)] hover:bg-[var(--bg-primary)] border border-[var(--border-color)] transition-colors group">
            <n-icon :size="18" class="text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] mb-0.5"><AddOutline /></n-icon>
            <span class="text-[10px] text-[var(--text-tertiary)] group-hover:text-[var(--text-secondary)]">风格</span>
          </button>
          
          <!-- Magic Button -->
          <button 
            @click="handlePolish"
            :disabled="isPolishing || !content.trim()"
            class="flex items-center justify-center w-12 h-12 rounded-xl bg-[var(--bg-tertiary)] hover:bg-[var(--bg-primary)] border border-[var(--border-color)] transition-colors group"
            :class="{ 'animate-pulse border-purple-500': isPolishing }"
          >
             <n-spin v-if="isPolishing" :size="18" />
             <n-icon v-else :size="20" class="text-[var(--text-secondary)] group-hover:text-purple-400"><SparklesOutline /></n-icon>
          </button>

          <!-- Text Input -->
          <div class="flex-1 relative">
            <textarea
              v-model="content"
              @blur="updateNodeData"
              @keydown.enter.exact.prevent="handleGenerate"
              class="w-full bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] resize-none outline-none border-none py-1 h-12 leading-5"
              placeholder="输入描述或按 '/' 呼出指令（Enter 发送）"
            ></textarea>
          </div>
        </div>

        <!-- Control Bar -->
        <div class="flex items-center justify-between px-4 py-2 bg-[var(--bg-tertiary)] border-t border-[var(--border-color)]">
          <div class="flex items-center gap-4">
            <!-- Model Select -->
            <n-dropdown :options="modelOptions" @select="handleModelSelect" trigger="click" placement="top-start">
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
                    :class="{ '!border-blue-500 !bg-blue-500/10': selectedRatio === 'auto' }"
                  >
                    <n-icon :size="24" :class="selectedRatio === 'auto' ? 'text-blue-500' : 'text-[var(--text-tertiary)]'"><ScanOutline /></n-icon>
                    <span class="text-xs" :class="selectedRatio === 'auto' ? 'text-blue-500' : 'text-[var(--text-tertiary)]'">自适应</span>
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
                        :class="selectedRatio === ratio.value ? 'border-blue-500 bg-blue-500/20' : 'border-[var(--text-tertiary)] group-hover:border-[var(--text-secondary)]'"
                        :style="{ width: ratio.w + 'px', height: ratio.h + 'px' }"
                      ></div>
                      <span class="text-[10px]" :class="selectedRatio === ratio.value ? 'text-blue-500' : 'text-[var(--text-tertiary)] group-hover:text-[var(--text-secondary)]'">{{ ratio.label }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </n-popover>
          </div>

          <div class="flex items-center gap-3">
             <!-- Count Selector -->
             <div class="flex items-center gap-1 bg-[var(--bg-primary)] rounded-full px-2 py-0.5 border border-[var(--border-color)]">
               <n-icon :size="14" class="text-[var(--text-tertiary)]"><PeopleOutline /></n-icon>
               <span class="text-sm text-[var(--text-secondary)] w-4 text-center font-medium">{{ generateCount }}</span>
             </div>

             <!-- Generate Button -->
             <button 
               @click="handleGenerate"
               :disabled="loading || !content.trim()"
               class="w-7 h-7 rounded-full bg-[var(--text-primary)] text-[var(--bg-primary)] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
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
  PeopleOutline,
  ScanOutline,
  SparklesOutline,
  TrashOutline,
  VideocamOutline
} from '@vicons/ionicons5'
import { Handle, Position, useVueFlow } from '@vue-flow/core'
import { NDropdown, NIcon, NImage, NPopover, NSpin } from 'naive-ui'
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useChat, useImageGeneration } from '../../hooks'
import { duplicateNode, removeNode, updateNode } from '../../stores/canvas'
import { DEFAULT_IMAGE_MODEL, getModelConfig, getModelSizeOptions, imageModelSelectOptions } from '../../stores/models'

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

// State
const showActions = ref(false)
const content = ref(props.data?.content || '')
const localModel = ref(props.data?.model || DEFAULT_IMAGE_MODEL)
const generateCount = ref(props.data?.n || 1)
const isPolishing = ref(false)
const isInputExpanded = ref(false)
const selectedRatio = ref('auto')
const nodeWrapperRef = ref(null)
let hideTimer = null

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
  { label: '1:1', value: '1:1', w: 12, h: 12 },
  { label: '9:16', value: '9:16', w: 9, h: 16 },
  { label: '16:9', value: '16:9', w: 16, h: 9 },
  { label: '3:4', value: '3:4', w: 10, h: 14 },
  { label: '4:3', value: '4:3', w: 14, h: 10 },
  { label: '3:2', value: '3:2', w: 14, h: 9 },
  { label: '2:3', value: '2:3', w: 9, h: 14 },
  { label: '5:4', value: '5:4', w: 13, h: 11 },
  { label: '21:9', value: '21:9', w: 21, h: 9 }
]

const displayRatio = computed(() => {
  if (selectedRatio.value === 'auto') return '自适应'
  return selectedRatio.value
})

// Hooks
const { loading, error, images, generate } = useImageGeneration()
const { send: sendChat } = useChat({
  systemPrompt: '你是一个专业的AI绘画提示词专家。将用户输入的内容美化成高质量的生图提示词，包含风格、光线、構图、细节等要素。直接返回提示词，不要其他解释。',
  model: 'gpt-4o-mini'
})

// Computed
const imageUrl = computed(() => {
  if (images.value && images.value.length > 0) return images.value[0].url
  return props.data?.url
})

const imageAspectRatio = computed(() => {
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
    window.$message?.error('润色失败: ' + err.message)
  } finally {
    isPolishing.value = false
  }
}

const handleGenerate = async () => {
  if (!content.value.trim()) return
  
  updateNode(props.id, { loading: true, error: null })
  
  try {
    const config = getModelConfig(localModel.value)
    let size = config?.defaultParams?.size || '1024x1024'
    const quality = config?.defaultParams?.quality || 'standard'

    // Calculate size based on ratio if not auto
    if (selectedRatio.value !== 'auto') {
      const [rW, rH] = selectedRatio.value.split(':').map(Number)
      const targetRatio = rW / rH
      
      // Get available sizes for this model
      const availableSizes = getModelSizeOptions(localModel.value, quality)
      
      if (availableSizes && availableSizes.length > 0) {
        // Find closest aspect ratio
        let bestSize = availableSizes[0].key
        let minDiff = Number.MAX_VALUE
        
        for (const option of availableSizes) {
          const [w, h] = option.key.split('x').map(Number)
          const currentRatio = w / h
          const diff = Math.abs(currentRatio - targetRatio)
          
          if (diff < minDiff) {
            minDiff = diff
            bestSize = option.key
          }
        }
        size = bestSize
      }
    }

    const result = await generate({
      model: localModel.value,
      prompt: content.value,
      n: generateCount.value,
      size,
      quality
    })

    if (result && result.length > 0) {
      updateNode(props.id, {
        url: result[0].url,
        loading: false,
        updatedAt: Date.now(),
        generatedSize: size
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
  if (imageUrl.value) {
    window.open(imageUrl.value, '_blank')
  }
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
})

onUnmounted(() => {
  document.removeEventListener('click', handleGlobalClick)
})

</script>

<style scoped>
.text-to-image-node-wrapper {
  /* Ensure z-index handling for overlapping */
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
