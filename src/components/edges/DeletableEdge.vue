<template>
  <path
    :d="path"
    fill="none"
    stroke="transparent"
    :stroke-width="interactionWidth"
    class="deletable-edge-interaction"
    @mouseenter="hovered = true"
    @mouseleave="hovered = false"
  />

  <BaseEdge :path="path" :style="edgeStyle" />

  <EdgeLabelRenderer>
    <div
      v-show="hovered"
      :style="{
        position: 'absolute',
        transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
        pointerEvents: 'all'
      }"
      class="nodrag nopan"
    >
      <button
        @click.stop="handleDelete"
        class="w-6 h-6 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 shadow-sm hover:shadow transition-shadow flex items-center justify-center"
        title="删除连线"
      >
        <n-icon :size="14" class="text-red-500"><CloseOutline /></n-icon>
      </button>
    </div>
  </EdgeLabelRenderer>
</template>

<script setup>
import { CloseOutline } from '@vicons/ionicons5'
import { BaseEdge, EdgeLabelRenderer, getBezierPath } from '@vue-flow/core'
import { NIcon } from 'naive-ui'
import { computed, ref } from 'vue'
import { removeEdge } from '../../stores/canvas'

const props = defineProps({
  id: String,
  source: String,
  target: String,
  sourceX: Number,
  sourceY: Number,
  targetX: Number,
  targetY: Number,
  sourcePosition: String,
  targetPosition: String,
  data: Object,
  sourceNode: Object,
  targetNode: Object,
  type: String,
  updatable: Boolean,
  selected: Boolean,
  animated: Boolean,
  label: String,
  labelStyle: Object,
  labelShowBg: Boolean,
  labelBgStyle: Object,
  labelBgPadding: [Array, Number],
  labelBgBorderRadius: Number,
  events: Object,
  markerStart: String,
  markerEnd: String,
  style: Object,
  sourceHandleId: String,
  targetHandleId: String,
  sourceHandle: String,
  targetHandle: String,
  interactionWidth: Number
})

const hovered = ref(false)
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
const labelX = computed(() => pathInfo.value.labelX)
const labelY = computed(() => pathInfo.value.labelY)

const edgeStyle = computed(() => ({
  stroke: 'var(--border-color)',
  strokeWidth: 2,
  ...props.style
}))

const handleDelete = () => {
  removeEdge(props.id)
}
</script>

<style scoped>
.deletable-edge-interaction {
  pointer-events: stroke;
}
</style>
