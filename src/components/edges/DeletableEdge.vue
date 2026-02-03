<template>
  <path
    ref="pathRef"
    :d="path"
    fill="none"
    stroke="transparent"
    :stroke-width="interactionWidth"
    class="deletable-edge-interaction"
    @mouseenter="onEdgeEnter"
    @mousemove="onMouseMove"
    @mouseleave="onEdgeLeave"
  />

  <BaseEdge :path="path" :style="edgeStyle" />

  <EdgeLabelRenderer>
    <div
      v-if="isHovered"
      :style="{
        position: 'absolute',
        transform: `translate(-50%, -50%) translate(${buttonPos.x}px, ${buttonPos.y}px)`,
        pointerEvents: 'all',
        zIndex: 10
      }"
      class="nodrag nopan"
      @mouseenter="onButtonEnter"
      @mouseleave="onButtonLeave"
      @mousemove="onMouseMove"
    >
      <button
        @click.stop="handleDelete"
        class="w-8 h-8 rounded-full bg-[#1a1a1a] text-white border border-gray-700 shadow-lg flex items-center justify-center hover:scale-110 transition-transform"
        title="删除连线"
      >
        <n-icon :size="18"><CutOutline /></n-icon>
      </button>
    </div>
  </EdgeLabelRenderer>
</template>

<script setup>
import { CutOutline } from '@vicons/ionicons5'
import { BaseEdge, EdgeLabelRenderer, getBezierPath, useVueFlow } from '@vue-flow/core'
import { NIcon } from 'naive-ui'
import { computed, ref } from 'vue'
import { removeEdge } from '../../stores/canvas'

const props = defineProps({
  id: String,
  sourceX: Number,
  sourceY: Number,
  targetX: Number,
  targetY: Number,
  sourcePosition: String,
  targetPosition: String,
  data: Object,
  markerEnd: String,
  style: Object,
  interactionWidth: {
    type: Number,
    default: 20
  }
})

const { screenToFlowCoordinate } = useVueFlow()
const isHovered = ref(false)
const buttonPos = ref({ x: 0, y: 0 })
const pathRef = ref(null)
let hideTimer = null
const interactionWidth = 28

const pathInfo = computed(() => {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX: props.sourceX,
    sourceY: props.sourceY,
    targetX: props.targetX,
    targetY: props.targetY,
    sourcePosition: props.sourcePosition,
    targetPosition: props.targetPosition
  })
  return { edgePath, labelX, labelY }
})

const path = computed(() => pathInfo.value.edgePath)

const edgeStyle = computed(() => ({
  stroke: isHovered.value ? 'var(--accent-color)' : 'var(--border-color)',
  strokeWidth: 2,
  transition: 'stroke 0.2s',
  ...props.style
}))

const showButton = () => {
  if (hideTimer) {
    clearTimeout(hideTimer)
    hideTimer = null
  }
  isHovered.value = true
}

const hideButton = () => {
  hideTimer = setTimeout(() => {
    isHovered.value = false
  }, 50)
}

const updatePosition = (event) => {
  const mousePos = screenToFlowCoordinate({
    x: event.clientX,
    y: event.clientY
  })

  if (!pathRef.value) {
    buttonPos.value = mousePos
    return
  }

  // Calculate closest point on path
  // 计算路径上离鼠标最近的点
  const pathNode = pathRef.value
  const len = pathNode.getTotalLength()
  
  // 1. Coarse search (粗略搜索)
  let bestDist = Infinity
  let bestLen = 0
  const coarseSteps = 20
  
  for (let i = 0; i <= coarseSteps; i++) {
    const l = (len * i) / coarseSteps
    const p = pathNode.getPointAtLength(l)
    const d = (p.x - mousePos.x) ** 2 + (p.y - mousePos.y) ** 2
    if (d < bestDist) {
      bestDist = d
      bestLen = l
    }
  }
  
  // 2. Fine search around the best coarse point (精细搜索)
  const range = len / coarseSteps
  const start = Math.max(0, bestLen - range)
  const end = Math.min(len, bestLen + range)
  const fineSteps = 10
  
  for (let i = 0; i <= fineSteps; i++) {
    const l = start + ((end - start) * i) / fineSteps
    const p = pathNode.getPointAtLength(l)
    const d = (p.x - mousePos.x) ** 2 + (p.y - mousePos.y) ** 2
    if (d < bestDist) {
      bestDist = d
      bestLen = l
    }
  }
  
  buttonPos.value = pathNode.getPointAtLength(bestLen)
}

const onEdgeEnter = (e) => {
  showButton()
  updatePosition(e)
}

const onEdgeLeave = () => {
  hideButton()
}

const onButtonEnter = () => {
  showButton()
}

const onButtonLeave = () => {
  hideButton()
}

const onMouseMove = (e) => {
  showButton()
  updatePosition(e)
}

const handleDelete = () => {
  removeEdge(props.id)
}
</script>

<style scoped>
.deletable-edge-interaction {
  pointer-events: stroke;
}
</style>
