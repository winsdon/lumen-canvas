<template>
  <!-- Text Combination Node Wrapper -->
  <div 
    class="text-combination-node-wrapper relative" 
    @mouseenter="handleMouseEnter" 
    @mouseleave="handleMouseLeave"
    ref="nodeWrapperRef"
  >
    
    <!-- Action Toolbar (Floating Pill) -->
    <div class="absolute -top-12 left-1/2 -translate-x-1/2 bg-[var(--bg-secondary)]/90 backdrop-blur-md rounded-full px-3 py-1.5 border border-[var(--border-color)] transition-opacity duration-200 z-50 flex items-center gap-3 shadow-lg whitespace-nowrap"
          :class="showActions ? 'opacity-100' : 'opacity-0 pointer-events-none'">
        
        <!-- Icon Actions -->
        <div class="flex items-center gap-2">
          <button @click.stop="handleCopy" class="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors" title="复制内容">
            <n-icon :size="16"><CopyOutline /></n-icon>
          </button>
          <button @click.stop="handleDelete" class="p-1 text-[var(--text-secondary)] hover:text-red-500 transition-colors" title="删除">
            <n-icon :size="16"><TrashOutline /></n-icon>
          </button>
        </div>
    </div>
    
    <!-- Node Label (Outside Top-Left) -->
    <div class="absolute -top-7 left-0 z-20 pointer-events-none flex items-center gap-2">
      <span class="text-sm text-[var(--text-tertiary)] select-none">文本</span>
    </div>

    <!-- Main Panel: Text Display Area | 主面板：文本展示区域 -->
    <div
      class="text-combination-node bg-[var(--bg-secondary)] rounded-2xl border w-[320px] transition-all duration-200 flex flex-col overflow-hidden relative z-10"
      :class="selected ? 'border-2 border-[var(--accent-color)] shadow-xl shadow-[var(--accent-color)]/20' : 'border border-[var(--border-color)] shadow-md'"
      @click="toggleInputPanel"
    >

      <!-- Header Removed for consistency -->

      <div 
        class="relative bg-[var(--bg-tertiary)] group/text cursor-pointer transition-all duration-300 min-h-[200px] max-h-[400px] flex flex-col" 
      >
        
        <!-- Loading State -->
        <div v-if="loading" class="absolute inset-0 flex flex-col items-center justify-center z-10 bg-[var(--bg-tertiary)]/80 backdrop-blur-sm">
          <n-spin size="large" />
          <span class="mt-3 text-sm text-[var(--text-secondary)] font-medium">AI 正在思考中...</span>
        </div>

        <!-- Error State -->
        <div v-else-if="error" class="absolute inset-0 flex flex-col items-center justify-center p-4 text-center z-10 bg-red-900/10">
          <n-icon :size="32" class="text-red-500 mb-2"><CloseCircleOutline /></n-icon>
          <span class="text-sm text-red-500 break-words w-full">{{ error.message || '生成失败' }}</span>
        </div>

        <!-- Text Result -->
        <div v-else-if="displayContent" class="w-full h-full p-4 pt-10 overflow-y-auto custom-scrollbar">
          <div class="whitespace-pre-wrap text-sm text-[var(--text-primary)] leading-relaxed">{{ displayContent }}</div>
        </div>

        <!-- Empty State -->
        <div v-else class="absolute inset-0 flex flex-col justify-center items-center px-8 text-[var(--text-secondary)] gap-2">
           <n-icon :size="48" class="text-[var(--text-tertiary)]"><ChatbubbleEllipsesOutline /></n-icon>
           <div class="text-sm text-[var(--text-tertiary)]">输入提示词开始生成文本</div>
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

    <!-- Bottom Input Panel (Floating) | 底部输入面板（悬浮） -->
    <Transition name="slide-fade">
      <div 
        v-show="isInputExpanded"
        class="absolute top-[calc(100%+16px)] left-1/2 -translate-x-1/2 w-[480px] bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-color)] shadow-2xl z-50 flex flex-col overflow-hidden"
        @click.stop
      >
        <!-- Input Header -->
        <div class="flex items-start p-3 gap-3">
          
          <!-- Magic Button -->
          <button 
            @click="handlePolish"
            :disabled="isPolishing || !content.trim()"
            class="flex items-center justify-center w-12 h-12 rounded-xl bg-[var(--bg-tertiary)] hover:bg-[var(--bg-primary)] border border-[var(--border-color)] transition-colors group shrink-0"
            :class="{ 'animate-pulse border-purple-500': isPolishing }"
            title="AI 润色提示词"
          >
             <n-spin v-if="isPolishing" :size="18" />
             <n-icon v-else :size="20" class="text-[var(--text-secondary)] group-hover:text-purple-400"><SparklesOutline /></n-icon>
          </button>

          <!-- Text Input -->
          <div class="flex-1 relative">
            <textarea
              v-model="content"
              @blur="updateNodeData"
              @wheel.stop
              @keydown.enter.exact.prevent="handleGenerate"
              class="nodrag w-full bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] resize-none outline-none border-none py-1 h-20 leading-5 overflow-y-auto pr-8 custom-scrollbar"
              placeholder="输入提示词... (Enter 生成)"
            ></textarea>
            
            <button 
              v-if="originalContent"
              @click="handleRevert"
              :disabled="isPolishing"
              class="absolute right-0 bottom-0 p-1.5 rounded-lg bg-[var(--bg-secondary)]/80 hover:bg-[var(--accent-color)] hover:text-white border border-[var(--border-color)] transition-all flex items-center justify-center backdrop-blur-sm shadow-sm"
              title="恢复原文"
            >
               <n-icon :size="14"><ArrowUndoOutline /></n-icon>
            </button>
          </div>
        </div>

        <!-- Control Bar -->
        <div class="flex items-center justify-between px-4 py-2 bg-[var(--bg-tertiary)] border-t border-[var(--border-color)]">
          <div class="flex items-center gap-4">
            <!-- Model Select -->
            <n-dropdown :options="modelOptions" :render-label="renderDropdownLabel" :menu-props="getModelMenuProps" @select="handleModelSelect" trigger="click" placement="top-start">
              <button class="flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                <n-icon :size="16"><HardwareChipOutline /></n-icon>
                <span class="max-w-[120px] truncate font-medium">{{ displayModelName }}</span>
                <n-icon :size="12"><ChevronDownOutline /></n-icon>
              </button>
            </n-dropdown>
          </div>

          <div class="flex items-center gap-3">
             <!-- Generate Button -->
             <button 
               @click="handleGenerate"
               :disabled="loading || !content.trim()"
               :class="(loading || !content.trim()) ? 'bg-[var(--text-primary)]' : 'bg-[var(--accent-color)]'"
               class="w-7 h-7 rounded-full text-[var(--bg-primary)] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
               title="开始生成"
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
  ArrowUndoOutline,
  ArrowUpOutline,
  ChatbubbleEllipsesOutline,
  ChevronDownOutline,
  CloseCircleOutline,
  CopyOutline,
  HardwareChipOutline,
  SparklesOutline,
  TrashOutline
} from '@vicons/ionicons5'
import { Handle, Position, useVueFlow } from '@vue-flow/core'
import { NDropdown, NIcon, NSpin } from 'naive-ui'
import { computed, h, onMounted, onUnmounted, ref } from 'vue'
import { useChat } from '../../hooks'
import { duplicateNode, removeNode, updateNode } from '../../stores/canvas'
import { DEFAULT_CHAT_MODEL, chatModelSelectOptions } from '../../stores/models'

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

defineEmits(['updateNodeInternals'])
useVueFlow()

// State
const showActions = ref(false)
const content = ref(props.data?.content || '')
const generatedContent = ref(props.data?.generatedContent || '')
const originalContent = ref(props.data?.originalContent || null)
const localModel = ref(props.data?.model || DEFAULT_CHAT_MODEL)
const isPolishing = ref(false)
const isInputExpanded = ref(false)
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

// Hooks
// 1. Chat hook for Polish
const { send: sendPolish } = useChat({
  systemPrompt: '你是一个专业的AI绘画提示词专家。将用户输入的内容美化成高质量的生图提示词，包含风格、光线、構图、细节等要素。直接返回提示词，不要其他解释。'
})

// 2. Chat hook for Generation
const { 
  send: sendGeneration, 
  currentResponse: currentGenerationResponse, 
  loading: loading, 
  error: error 
} = useChat()

// Computed
const modelOptions = chatModelSelectOptions
const displayContent = computed(() => generatedContent.value || currentGenerationResponse.value)

const displayModelName = computed(() => {
  const model = modelOptions.value.find(m => m.value === localModel.value || m.key === localModel.value)
  return model?.label || localModel.value || '选择模型'
})

const getModelMenuProps = () => ({
  style: {
    border: '1px solid var(--border-color)',
    '--n-color': 'var(--bg-secondary)'
  }
})

const renderDropdownLabel = (option) => {
  return h('div', { class: 'flex items-center justify-between gap-4 min-w-[140px]' }, [
    h('span', option.label)
  ])
}

// Methods
const updateNodeData = () => {
  updateNode(props.id, { 
    content: content.value,
    model: localModel.value,
    generatedContent: generatedContent.value
  })
}

const toggleInputPanel = () => {
  isInputExpanded.value = !isInputExpanded.value
}

const handleModelSelect = (key) => {
  localModel.value = key
  updateNodeData()
}

const handlePolish = async () => {
  const input = content.value.trim()
  if (!input) return
  
  if (!originalContent.value) {
    originalContent.value = content.value
    updateNode(props.id, { originalContent: content.value })
  }

  isPolishing.value = true
  const currentContent = content.value

  try {
    const result = await sendPolish(input, true)
    if (result) {
      content.value = result
      updateNodeData()
      window.$message?.success('提示词已润色')
    }
  } catch (err) {
    content.value = currentContent
    if (!err?.__handled) {
      window.$message?.error('润色失败: ' + err.message)
    }
  } finally {
    isPolishing.value = false
  }
}

const handleRevert = () => {
  if (originalContent.value) {
    content.value = originalContent.value
    originalContent.value = null
    updateNode(props.id, { 
      content: content.value,
      originalContent: null 
    })
    window.$message?.success('已恢复原文')
  }
}

const handleGenerate = async () => {
  if (!content.value.trim()) return
  
  generatedContent.value = ''
  updateNode(props.id, { loading: true, error: null, generatedContent: '' })
  
  try {
    let result = null
    try {
      result = await sendGeneration(content.value, true, localModel.value)
    } catch (err) {
      const msg = String(err?.message || '')
      if (msg.includes('Model not found')) {
        localModel.value = DEFAULT_CHAT_MODEL
        updateNode(props.id, { model: DEFAULT_CHAT_MODEL })
        result = await sendGeneration(content.value, true)
      } else {
        throw err
      }
    }

    if (result) {
      generatedContent.value = result
      updateNodeData()
      window.$message?.success('文本生成成功')
    }
  } catch (err) {
    updateNode(props.id, {
      loading: false,
      error: err.message
    })
    if (!err?.__handled) {
      window.$message?.error(err.message || '生成失败')
    }
  } finally {
    updateNode(props.id, { loading: false })
  }
}

const handleDelete = () => {
  removeNode(props.id)
}

const handleCopy = () => {
  if (generatedContent.value) {
    navigator.clipboard.writeText(generatedContent.value)
    window.$message?.success('已复制到剪贴板')
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
.text-combination-node-wrapper {
  /* Ensure z-index handling for overlapping */
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

.text-combination-node-wrapper:hover :deep(.t2i-handle) {
  opacity: 1;
  pointer-events: auto;
}

/* Custom scrollbar */
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: var(--border-color);
  border-radius: 2px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: var(--text-tertiary);
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
