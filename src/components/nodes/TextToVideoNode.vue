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

    <!-- Node Label (Outside Top-Left) -->
    <div class="absolute -top-7 left-0 z-20 pointer-events-none">
      <span class="text-sm text-[var(--text-tertiary)] select-none">视频</span>
    </div>

    <div
      class="text-to-video-node bg-[var(--bg-secondary)] rounded-2xl border w-[360px] transition-all duration-200 flex flex-col overflow-hidden relative z-10"
      :class="selected ? 'border-2 border-[var(--accent-color)] shadow-xl shadow-[var(--accent-color)]/20' : 'border border-[var(--border-color)] shadow-md'"
      @click="toggleInputPanel"
    >

      <div class="relative bg-[var(--bg-tertiary)] group/video cursor-pointer transition-all duration-300" :style="{ aspectRatio: (localRatio === '9:16' ? '9 / 16' : '16 / 9') }">
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
        <!-- Mode Tabs | 模式标签 -->
        <div class="flex border-b border-[var(--border-color)]">
          <button
            @click="switchInputMode('frame')"
            class="flex-1 py-2 text-xs font-medium transition-colors"
            :class="inputMode === 'frame' ? 'text-[var(--accent-color)] border-b-2 border-[var(--accent-color)]' : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'"
          >
            首尾帧
          </button>
          <button
            @click="switchInputMode('reference')"
            class="flex-1 py-2 text-xs font-medium transition-colors"
            :class="inputMode === 'reference' ? 'text-[var(--accent-color)] border-b-2 border-[var(--accent-color)]' : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'"
          >
            参考图
          </button>
        </div>

        <div class="flex items-start p-3 gap-3">
          <div v-if="inputMode === 'reference'" class="flex-1 flex flex-col gap-3">
            <div :key="referenceRenderKey" class="flex flex-wrap gap-2 items-center">
              <!-- Add button | 添加按钮 -->
              <div
                v-if="referenceImages.length < 5"
                class="relative w-12 h-12 rounded-xl bg-[var(--bg-tertiary)] hover:bg-[var(--bg-primary)] border border-[var(--border-color)] border-dashed transition-colors overflow-hidden group flex flex-col items-center justify-center flex-shrink-0"
              >
                <n-spin v-if="isReferenceUploading" :size="14" />
                <template v-else>
                  <n-icon :size="16" class="text-[var(--text-tertiary)]"><AddOutline /></n-icon>
                  <span class="text-[10px] text-[var(--text-tertiary)]">参考图</span>
                </template>
                <input
                  type="file"
                  accept="image/*"
                  class="absolute inset-0 opacity-0 cursor-pointer z-10"
                  :disabled="isReferenceUploading"
                  @change="handleReferenceImageUpload"
                />
              </div>
              <!-- Reference images list | 已上传的参考图列表 -->
              <div
                v-for="(img, index) in referenceImages"
                :key="img.sourceNodeId || img.url || index"
                class="relative w-12 h-12 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-color)] overflow-hidden group flex-shrink-0"
                draggable="true"
                @dragstart.stop="handleDragStart($event, index)"
                @dragover.prevent.stop="handleDragOver($event, index)"
                @drop.prevent.stop="handleDrop(index)"
                @dragend="handleDragEnd"
                @mousedown.stop
              >
                <div
                  class="w-full h-full transition-all"
                  :class="[
                    dragIndex === index ? 'opacity-40' : '',
                    dragOverIndex === index && dragIndex !== index ? 'ring-2 ring-[var(--accent-color)]' : ''
                  ]"
                  style="cursor: grab;"
                >
                  <img :src="img.url" class="w-full h-full object-cover pointer-events-none" />
                </div>
                <button
                  @click.stop="removeReferenceImage(index)"
                  class="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/50 hover:bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all z-20"
                >
                  <n-icon :size="10" class="text-[var(--text-secondary)]"><CloseCircleOutline /></n-icon>
                </button>
              </div>

              <!-- Backward compatibility: show old reference image | 向后兼容：显示旧参考图 -->
              <div v-if="!referenceImages.length && referenceImageUrl" class="relative">
                <div
                  class="w-12 h-12 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-color)] transition-all overflow-hidden cursor-pointer"
                >
                  <img :src="referenceImageUrl" class="w-full h-full object-cover" />
                </div>
                <button
                  @click.stop="handleRemoveReference"
                  class="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/50 hover:bg-red-500 text-white flex items-center justify-center z-20"
                >
                  <n-icon :size="10" class="text-[var(--text-secondary)]"><CloseCircleOutline /></n-icon>
                </button>
              </div>
            </div>

            <div class="w-full relative">
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

          <div v-else class="flex-1 flex flex-col gap-3">
            <div v-if="inputMode === 'frame'" class="flex gap-2">
              <div class="relative">
                <div
                  class="w-12 h-12 rounded-xl bg-[var(--bg-tertiary)] border-2 transition-all overflow-hidden cursor-pointer hover:border-purple-400"
                  :class="[
                    firstFrameUrl ? 'border-purple-500' : 'border-dashed border-[var(--border-color)]',
                    frameDragOverSlot === 'first' && draggingFrameSlot === 'last' ? 'ring-2 ring-purple-400' : ''
                  ]"
                  :draggable="!!firstFrameUrl"
                  @dragstart.stop="firstFrameUrl && handleFrameDragStart($event, 'first')"
                  @dragover.prevent.stop="handleFrameDragOver($event, 'first')"
                  @drop.prevent.stop="handleFrameDrop('first')"
                  @dragend="handleFrameDragEnd"
                >
                  <img v-if="firstFrameUrl" :src="firstFrameUrl" class="w-full h-full object-cover" :class="draggingFrameSlot === 'first' ? 'opacity-50' : ''" />
                  <div v-else class="w-full h-full flex flex-col items-center justify-center">
                    <n-spin v-if="isFirstFrameUploading" :size="14" />
                    <template v-else>
                      <n-icon :size="16" class="text-[var(--text-tertiary)]"><AddOutline /></n-icon>
                      <span class="text-[9px] text-[var(--text-tertiary)]">首帧</span>
                    </template>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    class="absolute inset-0 opacity-0 cursor-pointer z-10"
                    :disabled="isFirstFrameUploading"
                    @change="handleFirstFrameUpload"
                  />
                </div>
                <div v-if="firstFrameUrl" class="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-purple-500 text-white text-[8px] px-1.5 py-0.5 rounded whitespace-nowrap">首帧</div>
                <button
                  v-if="firstFrameUrl"
                  @click.stop="removeFirstFrame"
                  class="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[var(--bg-secondary)] border border-[var(--border-color)] flex items-center justify-center z-20 hover:bg-[var(--bg-primary)]"
                >
                  <n-icon :size="10" class="text-[var(--text-secondary)]"><CloseCircleOutline /></n-icon>
                </button>
              </div>

              <div class="relative">
                <div
                  class="w-12 h-12 rounded-xl bg-[var(--bg-tertiary)] border-2 transition-all overflow-hidden cursor-pointer hover:border-orange-400"
                  :class="[
                    lastFrameUrl ? 'border-orange-500' : 'border-dashed border-[var(--border-color)]',
                    frameDragOverSlot === 'last' && draggingFrameSlot === 'first' ? 'ring-2 ring-orange-400' : ''
                  ]"
                  :draggable="!!lastFrameUrl"
                  @dragstart.stop="lastFrameUrl && handleFrameDragStart($event, 'last')"
                  @dragover.prevent.stop="handleFrameDragOver($event, 'last')"
                  @drop.prevent.stop="handleFrameDrop('last')"
                  @dragend="handleFrameDragEnd"
                >
                  <img v-if="lastFrameUrl" :src="lastFrameUrl" class="w-full h-full object-cover" :class="draggingFrameSlot === 'last' ? 'opacity-50' : ''" />
                  <div v-else class="w-full h-full flex flex-col items-center justify-center">
                    <n-spin v-if="isLastFrameUploading" :size="14" />
                    <template v-else>
                      <n-icon :size="16" class="text-[var(--text-tertiary)]"><AddOutline /></n-icon>
                      <span class="text-[9px] text-[var(--text-tertiary)]">尾帧</span>
                    </template>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    class="absolute inset-0 opacity-0 cursor-pointer z-10"
                    :disabled="isLastFrameUploading"
                    @change="handleLastFrameUpload"
                  />
                </div>
                <div v-if="lastFrameUrl" class="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-orange-500 text-white text-[8px] px-1.5 py-0.5 rounded whitespace-nowrap">尾帧</div>
                <button
                  v-if="lastFrameUrl"
                  @click.stop="removeLastFrame"
                  class="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[var(--bg-secondary)] border border-[var(--border-color)] flex items-center justify-center z-20 hover:bg-[var(--bg-primary)]"
                >
                  <n-icon :size="10" class="text-[var(--text-secondary)]"><CloseCircleOutline /></n-icon>
                </button>
              </div>
            </div>

            <div class="w-full relative">
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
              :options="ratioOptions"
              :menu-props="getModelMenuProps"
              @select="handleRatioSelect"
              trigger="click"
              placement="top"
            >
              <button class="flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                <span class="font-medium">{{ localRatio }}</span>
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
  TrashOutline,
  VideocamOutline,
  AddCircle,
  LinkOutline
} from '@vicons/ionicons5'
import { Handle, Position, useVueFlow } from '@vue-flow/core'
import { NDropdown, NIcon, NImage, NSpin } from 'naive-ui'
import { computed, h, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { getFilePresignedUrl, uploadFileToUrl } from '../../api'
import { estimatePoint } from '../../api/point'
import { useVideoGeneration } from '../../hooks'
import { duplicateNode, edges, nodes, removeEdge, removeNode, updateNode, isDraftNode } from '../../stores/canvas'
import { DEFAULT_VIDEO_DURATION, DEFAULT_VIDEO_MODEL, DEFAULT_VIDEO_RESOLUTION, DEFAULT_VIDEO_RATIO, getModelConfig, getModelDurationOptions, videoModelSelectOptions, VIDEO_RESOLUTION_OPTIONS, VIDEO_RATIO_OPTIONS } from '../../stores/models'

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
const localRatio = ref(props.data?.ratio || DEFAULT_VIDEO_RATIO)
const hasManualModelSelection = ref(false)
const isInputExpanded = ref(false)
const nodeWrapperRef = ref(null)
const referencePreviewImageRef = ref(null)
const isReferenceUploading = ref(false)

// Multi-image state | 多图片状态
const inputMode = ref(props.data?.inputMode || 'reference')
const isFirstFrameUploading = ref(false)
const isLastFrameUploading = ref(false)

let hideTimer = null

const { loading, error, video, taskId, generate, resumePoll } = useVideoGeneration()

const modelOptions = videoModelSelectOptions
const resolutionOptions = computed(() => VIDEO_RESOLUTION_OPTIONS)
const durationOptions = computed(() => getModelDurationOptions(localModel.value))
const ratioOptions = computed(() => (VIDEO_RATIO_OPTIONS || []).filter(o => o.key === '16:9' || o.key === '9:16'))

const currentModelPoints = ref(null)

const currentModelId = computed(() => {
  const model = modelOptions.value.find(m => m.value === localModel.value || m.key === localModel.value)
  return model?.id
})

const updatePointEstimate = async () => {
  const modelId = currentModelId.value
  if (!modelId) {
    // Fallback to static points
    const model = modelOptions.value.find(m => m.value === localModel.value || m.key === localModel.value)
    currentModelPoints.value = model?.point ?? model?.imagePoint
    return
  }
  try {
    const params = {}
    if (localDuration.value) {
      params.duration = String(localDuration.value)
    }
    if (localResolution.value) {
      params.resolution = localResolution.value
    }
    const res = await estimatePoint(modelId, params)
    currentModelPoints.value = res?.point ?? res?.data?.point ?? null
  } catch {
    // Fallback to static points on error
    const model = modelOptions.value.find(m => m.value === localModel.value || m.key === localModel.value)
    currentModelPoints.value = model?.point ?? model?.imagePoint
  }
}

const renderDropdownLabel = (option) => {
  const points = option?.point ?? option?.imagePoint
  if (points === undefined || points === null) return option.label
  return h('div', { class: 'flex items-center justify-between gap-4 min-w-[140px]' }, [
    h('span', option.label),
    h('span', { class: 'text-xs font-medium text-[var(--accent-color)] px-2 py-0.5 rounded' }, `${points} 积分`)
  ])
}

const referenceImageUrl = computed(() => props.data?.referenceImageUrl)
const firstFrameUrl = ref(null)
const lastFrameUrl = ref(null)
const referenceImages = ref([])
const isSyncingReference = ref(false)
const lastSyncedSourcesSignature = ref(null)
const referenceRenderKey = ref(0)

const refreshNode = () => {
  nextTick(() => {
    updateNodeInternals(props.id)
  })
}

const syncReferenceImagesFromData = () => {
  const sources = getConnectedReferenceSources()
  if (sources.length > 0) {
    if (inputMode.value === 'frame') {
      firstFrameUrl.value = sources[0]?.url || sources[0]?.base64 || null
      lastFrameUrl.value = sources[1]?.url || sources[1]?.base64 || null
    }
    referenceImages.value = sources
      .map(source => ({
        url: source.url || source.base64,
        fileName: source.fileName || null,
        sourceNodeId: source.nodeId
      }))
      .slice(0, 5)
    return
  }
  if (props.data?.referenceImages?.length > 0) {
    referenceImages.value = props.data.referenceImages
    return
  }
  if (inputMode.value === 'frame') {
    firstFrameUrl.value = props.data?.firstFrameUrl || null
    lastFrameUrl.value = props.data?.lastFrameUrl || null
  }
  if (inputMode.value === 'reference' && props.data?.referenceImageUrl) {
    referenceImages.value = [{ url: props.data.referenceImageUrl, fileName: props.data?.referenceImageFileName }]
    return
  }
  if (referenceImages.value.length > 0) {
    referenceImages.value = []
  }
}

const applyImmediateSourceSync = (sources) => {
  const normalized = (sources || [])
    .map(source => ({ ...source, displayUrl: source?.url || source?.base64 }))
    .filter(source => source?.displayUrl)
  if (!normalized.length) return

  const uniqueSources = []
  const seenKeys = new Set()
  const seenUrls = new Set()
  normalized.forEach(source => {
    const key = source?.nodeId || source?.displayUrl
    if (!key || seenKeys.has(key)) return
    seenKeys.add(key)
    seenUrls.add(source.displayUrl)
    uniqueSources.push(source)
  })
  if (!uniqueSources.length) return

  const updates = {}
  if (!props.data?.firstFrameSourceNodeId && !props.data?.firstFrameUrl && uniqueSources[0]) {
    updates.firstFrameUrl = uniqueSources[0].displayUrl
    updates.firstFrameSourceNodeId = uniqueSources[0].nodeId
  }
  if (!props.data?.lastFrameSourceNodeId && !props.data?.lastFrameUrl && uniqueSources[1]) {
    updates.lastFrameUrl = uniqueSources[1].displayUrl
    updates.lastFrameSourceNodeId = uniqueSources[1].nodeId
  }

  const manual = referenceImages.value.filter(img => {
    if (img?.sourceNodeId && seenKeys.has(img.sourceNodeId)) return false
    if (img?.url && seenUrls.has(img.url)) return false
    return !img?.sourceNodeId
  })
  const merged = [
    ...uniqueSources.map(source => ({
      url: source.displayUrl,
      fileName: source.fileName || null,
      sourceNodeId: source.nodeId
    })),
    ...manual
  ].slice(0, 5)

  if (merged.length > 0) {
    updates.referenceImages = merged
    updates.referenceImageUrl = null
    referenceImages.value = merged
  }

  if (Object.keys(updates).length > 0) {
    updates.updatedAt = Date.now()
    updateNode(props.id, updates)
    if (updates.firstFrameUrl !== undefined) {
      firstFrameUrl.value = updates.firstFrameUrl
    }
    if (updates.lastFrameUrl !== undefined) {
      lastFrameUrl.value = updates.lastFrameUrl
    }
    referenceRenderKey.value += 1
    refreshNode()
  }
}

// Drag and drop state | 拖拽排序状态
const dragIndex = ref(-1)
const dragOverIndex = ref(-1)
const draggingFrameSlot = ref(null) // 'first' | 'last' | null
const frameDragOverSlot = ref(null) // 'first' | 'last' | null

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
    dur: localDuration.value,
    ratio: localRatio.value,
    inputMode: inputMode.value
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

const handleRatioSelect = (key) => {
  localRatio.value = key
  updateNodeData()
}

const handleDurationSelect = (key) => {
  localDuration.value = key
  updateNodeData()
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

// Switch input mode | 切换输入模式
const switchInputMode = (mode) => {
  inputMode.value = mode
  updateNode(props.id, { inputMode: mode })
  refreshNode()
}

// First frame upload | 首帧上传
const handleFirstFrameUpload = async (event) => {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return

  try {
    isFirstFrameUploading.value = true
    const res = await getFilePresignedUrl(file.name)
    await uploadFileToUrl(res.uploadUrl, file)
    updateNode(props.id, { firstFrameUrl: res.url, firstFrameSourceNodeId: null, updatedAt: Date.now() })
    window.$message?.success('首帧上传成功')
  } catch (err) {
    window.$message?.error('首帧上传失败')
  } finally {
    isFirstFrameUploading.value = false
  }
}

// Last frame upload | 尾帧上传
const handleLastFrameUpload = async (event) => {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return

  try {
    isLastFrameUploading.value = true
    const res = await getFilePresignedUrl(file.name)
    await uploadFileToUrl(res.uploadUrl, file)
    updateNode(props.id, { lastFrameUrl: res.url, lastFrameSourceNodeId: null, updatedAt: Date.now() })
    window.$message?.success('尾帧上传成功')
  } catch (err) {
    window.$message?.error('尾帧上传失败')
  } finally {
    isLastFrameUploading.value = false
  }
}

// Reference image upload (append to array) | 参考图上传（追加到数组）
const handleReferenceImageUpload = async (event) => {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return

  if (referenceImages.value.length >= 5) {
    window.$message?.warning('最多支持5张参考图')
    return
  }

  try {
    isReferenceUploading.value = true
    const res = await getFilePresignedUrl(file.name)
    await uploadFileToUrl(res.uploadUrl, file)
    const newImages = [...referenceImages.value, { url: res.url, fileName: file.name }]
    updateNode(props.id, { referenceImages: newImages, updatedAt: Date.now() })
    window.$message?.success('参考图上传成功')
  } catch (err) {
    window.$message?.error('参考图上传失败')
  } finally {
    isReferenceUploading.value = false
  }
}

// Remove first frame | 移除首帧
const removeFirstFrame = () => {
  const sourceId = props.data?.firstFrameSourceNodeId
  updateNode(props.id, { firstFrameUrl: null, firstFrameSourceNodeId: null, updatedAt: Date.now() })
  firstFrameUrl.value = null
  if (sourceId) {
    edges.value
      .filter(edge => edge.source === sourceId && edge.target === props.id)
      .forEach(edge => removeEdge(edge.id))
  }
}

// Remove last frame | 移除尾帧
const removeLastFrame = () => {
  const sourceId = props.data?.lastFrameSourceNodeId
  updateNode(props.id, { lastFrameUrl: null, lastFrameSourceNodeId: null, updatedAt: Date.now() })
  lastFrameUrl.value = null
  if (sourceId) {
    edges.value
      .filter(edge => edge.source === sourceId && edge.target === props.id)
      .forEach(edge => removeEdge(edge.id))
  }
}

// Remove reference image by index | 移除参考图
const removeReferenceImage = (index) => {
  const removed = referenceImages.value[index]
  const newImages = referenceImages.value.filter((_, i) => i !== index)
  updateNode(props.id, { referenceImages: newImages, updatedAt: Date.now() })
  referenceImages.value = newImages
  referenceRenderKey.value += 1
  refreshNode()
  if (removed?.sourceNodeId) {
    edges.value
      .filter(edge => edge.source === removed.sourceNodeId && edge.target === props.id)
      .forEach(edge => removeEdge(edge.id))
  }
}

// === Drag and Drop: Reference Images | 参考图拖拽排序 ===
const handleDragStart = (event, index) => {
  dragIndex.value = index
  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData('text/plain', String(index))
}

const handleDragOver = (event, index) => {
  event.preventDefault()
  event.dataTransfer.dropEffect = 'move'
  dragOverIndex.value = index
}

const handleDrop = (index) => {
  const from = dragIndex.value
  if (from < 0 || from === index) {
    handleDragEnd()
    return
  }
  const newImages = [...referenceImages.value]
  const [moved] = newImages.splice(from, 1)
  newImages.splice(index, 0, moved)
  updateNode(props.id, { referenceImages: newImages, updatedAt: Date.now() })
  handleDragEnd()
}

const handleDragEnd = () => {
  dragIndex.value = -1
  dragOverIndex.value = -1
}

// === Drag and Drop: First/Last Frame | 首尾帧拖拽互换 ===
const handleFrameDragStart = (event, slot) => {
  draggingFrameSlot.value = slot
  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData('text/plain', slot)
}

const handleFrameDragOver = (event, slot) => {
  event.preventDefault()
  event.dataTransfer.dropEffect = 'move'
  frameDragOverSlot.value = slot
}

const handleFrameDrop = (targetSlot) => {
  const sourceSlot = draggingFrameSlot.value
  if (!sourceSlot || sourceSlot === targetSlot) {
    handleFrameDragEnd()
    return
  }
  // Swap first and last frame | 交换首尾帧
  const tempUrl = firstFrameUrl.value
  const tempSourceId = props.data?.firstFrameSourceNodeId
  updateNode(props.id, {
    firstFrameUrl: lastFrameUrl.value,
    firstFrameSourceNodeId: props.data?.lastFrameSourceNodeId || null,
    lastFrameUrl: tempUrl,
    lastFrameSourceNodeId: tempSourceId || null,
    updatedAt: Date.now()
  })
  handleFrameDragEnd()
}

const handleFrameDragEnd = () => {
  draggingFrameSlot.value = null
  frameDragOverSlot.value = null
}

const getConnectedReferenceSources = () => {
  const incoming = edges.value.filter(e => e.target === props.id)
  const sources = []
  const seenIds = new Set()
  for (const edge of incoming) {
    const sourceNode = nodes.value.find(n => n.id === edge.source)
    if (!sourceNode) continue
    if (sourceNode.type !== 'textToImage' && sourceNode.type !== 'image') continue
    if (seenIds.has(sourceNode.id)) continue

    const url = sourceNode.data?.url
    const base64 = sourceNode.data?.base64
    if (!url && !base64) continue

    seenIds.add(sourceNode.id)
    sources.push({ nodeId: sourceNode.id, url, base64, fileName: sourceNode.data?.fileName })
    if (sources.length >= 5) break
  }
  return sources
}

const syncReferencesFromSources = async (sources) => {
  if (!sources?.length) return
  if (isSyncingReference.value) return

  const signature = `${inputMode.value}::${sources
    .map(s => s.url || `${String(s.base64 || '').slice(0, 64)}|${String(s.base64 || '').slice(-64)}`)
    .join('||')}`
  if (lastSyncedSourcesSignature.value === signature) return

  isSyncingReference.value = true
  try {
    // Resolve all sources to URLs | 将所有源解析为 URL
    const resolved = []
    for (const source of sources.slice(0, 5)) {
      if (source.url) {
        resolved.push({ url: source.url, fileName: source.fileName || null, sourceNodeId: source.nodeId })
        continue
      }
      if (!source.base64) continue

      // Upload base64 | 上传 base64
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
        await uploadFileToUrl(res.uploadUrl, blob)
        resolved.push({ url: res.url, fileName: name, sourceNodeId: source.nodeId })
      } catch {
        // Skip failed uploads
      }
    }

    if (!resolved.length) return

    if (inputMode.value === 'frame') {
      // Frame mode: sources[0] → firstFrame, sources[1] → lastFrame
      const updates = {}
      if (resolved[0]) {
        updates.firstFrameUrl = resolved[0].url
        updates.firstFrameSourceNodeId = resolved[0].sourceNodeId
      }
      if (resolved[1]) {
        updates.lastFrameUrl = resolved[1].url
        updates.lastFrameSourceNodeId = resolved[1].sourceNodeId
      }
      updates.updatedAt = Date.now()
      updateNode(props.id, updates)
      if (updates.firstFrameUrl !== undefined) {
        firstFrameUrl.value = updates.firstFrameUrl
      }
      if (updates.lastFrameUrl !== undefined) {
        lastFrameUrl.value = updates.lastFrameUrl
      }
      referenceRenderKey.value += 1
      refreshNode()
    } else {
      // Reference mode: merge synced + manual
      const manual = referenceImages.value.filter(img => !img?.sourceNodeId)
      const merged = [...resolved, ...manual].slice(0, 5)
      updateNode(props.id, {
        referenceImages: merged,
        referenceImageUrl: null,
        updatedAt: Date.now()
      })
      referenceImages.value = merged
      referenceRenderKey.value += 1
      refreshNode()
    }
  } finally {
    lastSyncedSourcesSignature.value = signature
    isSyncingReference.value = false
  }
}

const handleGenerate = async () => {
  if (isDraftNode(props.id)) {
    window.$message?.warning('草稿中的节点请先确认后再执行')
    return
  }
  if (!content.value.trim()) return

  updateNode(props.id, { loading: true, error: null })
  try {
    // Build request params | 构建请求参数
    const params = {
      model: localModel.value,
      prompt: content.value,
      resolution: localResolution.value,
      duration: localDuration.value,
      ratio: localRatio.value
    }

    // Add images based on mode | 根据模式添加图片
    if (inputMode.value === 'frame') {
      // Frame mode: first/last frame | 首尾帧模式
      const images = []
      if (firstFrameUrl.value) {
        images.push({ url: firstFrameUrl.value, role: 'first_frame' })
      }
      if (lastFrameUrl.value) {
        images.push({ url: lastFrameUrl.value, role: 'last_frame' })
      }
      if (images.length > 0) {
        params.images = images
      }
    } else {
      // Reference mode | 参考图模式
      if (referenceImages.value.length > 0) {
        params.images = referenceImages.value.map(img => ({
          url: img.url,
          role: 'input_reference'
        }))
      }
    }

    const result = await generate(params, {
      onTaskId: (id) => {
        updateNode(props.id, { taskId: id, updatedAt: Date.now() })
      }
    })

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
  syncReferenceImagesFromData()

  // Resume polling if task was in progress | 恢复进行中的任务轮询
  if (props.data?.taskId && props.data?.loading && !props.data?.url) {
    resumePoll(props.data.taskId).then(result => {
      if (result?.url) {
        updateNode(props.id, {
          url: result.url,
          loading: false,
          error: null,
          taskId: result.id || props.data?.taskId,
          updatedAt: Date.now()
        })
        window.$message?.success('视频生成成功')
      }
    }).catch(err => {
      updateNode(props.id, {
        loading: false,
        error: err.message || '生成失败',
        updatedAt: Date.now()
      })
    })
  }
})

onUnmounted(() => {
  document.removeEventListener('click', handleGlobalClick)
})

watch(
  () => props.data?.inputMode,
  (mode) => {
    if (mode && mode !== inputMode.value) {
      inputMode.value = mode
      refreshNode()
    }
    syncReferenceImagesFromData()
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

watch(
  () => [
    edges.value.length,
    edges.value.map(e => `${e.id}:${e.source}->${e.target}:${e.sourceHandle || ''}:${e.targetHandle || ''}`).join('|'),
    nodes.value.length,
    nodes.value.map(n => `${n.id}:${n.data?.url || ''}:${n.data?.base64 ? 'b64' : ''}`).join('|'),
    inputMode.value
  ].join('::'),
  () => {
    const sources = getConnectedReferenceSources()
    if (sources.length > 0) {
      applyImmediateSourceSync(sources)
      syncReferencesFromSources(sources)
      return
    }
    // No sources — only clear items that came from connections | 无源时仅清除来自连接的项
    if (inputMode.value === 'frame') {
      const updates = {}
      if (props.data?.firstFrameSourceNodeId) {
        updates.firstFrameUrl = null
        updates.firstFrameSourceNodeId = null
      }
      if (props.data?.lastFrameSourceNodeId) {
        updates.lastFrameUrl = null
        updates.lastFrameSourceNodeId = null
      }
      if (Object.keys(updates).length > 0) {
        updates.updatedAt = Date.now()
        updateNode(props.id, updates)
        refreshNode()
      }
    } else {
      const manual = referenceImages.value.filter(img => !img?.sourceNodeId)
      if (manual.length !== referenceImages.value.length) {
        updateNode(props.id, {
          referenceImages: manual,
          referenceImageUrl: null,
          updatedAt: Date.now()
        })
        referenceImages.value = manual
        referenceRenderKey.value += 1
        refreshNode()
      }
    }
    lastSyncedSourcesSignature.value = null
  },
  { immediate: true }
)

// Watch model/duration/resolution changes → update point estimate | 监听参数变化更新积分预估
watch(
  [() => localModel.value, () => localDuration.value, () => localResolution.value, () => currentModelId.value],
  () => {
    updatePointEstimate()
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
