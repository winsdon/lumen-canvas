<template>
  <!-- Custom edge with prompt order selector | 带提示词顺序选择器的自定义边 -->
  <path
    :d="path"
    fill="none"
    stroke="transparent"
    :stroke-width="interactionWidth"
    class="edge-interaction"
    @mouseenter="hovered = true"
    @mouseleave="hovered = false"
  />
  <BaseEdge :path="path" :style="edgeStyle" />
  
  <!-- Edge label with order selector | 带顺序选择器的边标签 -->
  <EdgeLabelRenderer>
    <div 
      :style="{ 
        position: 'absolute', 
        transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
        pointerEvents: 'all'
      }"
      class="nodrag nopan"
    >
      <n-dropdown 
        :options="orderOptions" 
        @select="handleOrderSelect"
        size="small"
      >
        <button 
          class="flex items-center justify-center w-6 h-6 text-xs font-bold rounded-full bg-[var(--accent-color)] text-white border-2 border-white shadow-md hover:scale-110 transition-transform"
        >
          {{ currentOrder }}
        </button>
      </n-dropdown>
    </div>
  </EdgeLabelRenderer>

  <EdgeLabelRenderer>
    <div
      v-show="hovered"
      :style="{
        position: 'absolute',
        transform: `translate(-50%, -50%) translate(${deleteX}px, ${deleteY}px)`,
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
import { computed, ref } from 'vue'
import { BaseEdge, EdgeLabelRenderer, getBezierPath, useVueFlow } from '@vue-flow/core'
import { NDropdown, NIcon } from 'naive-ui'
import { CloseOutline } from '@vicons/ionicons5'
import { edges, removeEdge } from '../../stores/canvas'

// Get VueFlow instance | 获取 VueFlow 实例
const { updateEdgeData } = useVueFlow()

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
  markerEnd: String,
  style: Object,
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
  labelBgPadding: Array,
  labelBgBorderRadius: Number,
  events: Object,
  markerStart: String,
  sourceHandleId: String,
  targetHandleId: String,
  interactionWidth: Number
})

const hovered = ref(false)
const interactionWidth = 28

// Order labels | 顺序标签
const orderLabels = [
  { label: '① 第一个', key: 1 },
  { label: '② 第二个', key: 2 },
  { label: '③ 第三个', key: 3 },
  { label: '④ 第四个', key: 4 },
  { label: '⑤ 第五个', key: 5 }
]

// Dynamic order options based on connected edges count | 基于连接边数量的动态顺序选项
const orderOptions = computed(() => {
  // Get all promptOrder edges connected to the same target | 获取连接到同一目标的所有文本边
  const sameTargetTextEdges = edges.value.filter(edge => 
    edge.target === props.target && 
    edge.type === 'promptOrder'
  )
  const count = sameTargetTextEdges.length || 1
  return orderLabels.slice(0, count)
})

// Current order from edge data | 从边数据获取当前顺序
const currentOrder = computed(() => props.data?.promptOrder || 1)

// Calculate bezier path | 计算贝塞尔路径
const path = computed(() => {
  const [edgePath] = getBezierPath({
    sourceX: props.sourceX,
    sourceY: props.sourceY,
    targetX: props.targetX,
    targetY: props.targetY,
    sourcePosition: props.sourcePosition,
    targetPosition: props.targetPosition
  })
  return edgePath
})

// Label position (center of edge) | 标签位置（边的中心）
const labelX = computed(() => (props.sourceX + props.targetX) / 2)
const labelY = computed(() => (props.sourceY + props.targetY) / 2)
const deleteX = computed(() => labelX.value + 32)
const deleteY = computed(() => labelY.value - 26)

// Edge style | 边样式
const edgeStyle = computed(() => ({
  stroke: 'var(--accent-color)',
  strokeWidth: 2,
  ...props.style
}))

// Handle order selection | 处理顺序选择
const handleOrderSelect = (newOrder) => {
  // Get all text edges connected to the same target | 获取连接到同一目标的所有文本边
  const sameTargetTextEdges = edges.value.filter(edge => 
    edge.target === props.target && 
    edge.type === 'promptOrder'
  )
  
  // Find edge currently using this order | 查找当前使用此顺序的边
  const edgeWithSameOrder = sameTargetTextEdges.find(edge => 
    edge.id !== props.id && 
    edge.data?.promptOrder === newOrder
  )
  
  // If another edge has this order, swap with current | 如果另一条边有此顺序，则交换
  if (edgeWithSameOrder) {
    updateEdgeData(edgeWithSameOrder.id, { promptOrder: currentOrder.value })
  }
  
  // Update current edge order | 更新当前边顺序
  updateEdgeData(props.id, { promptOrder: newOrder })
}

const handleDelete = () => {
  removeEdge(props.id)
}
</script>

<style scoped>
.edge-interaction {
  pointer-events: stroke;
}
</style>
