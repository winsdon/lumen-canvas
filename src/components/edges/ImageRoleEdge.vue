<template>
  <!-- Custom edge with image role selector | 带图片角色选择器的自定义边 -->
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
  
  <!-- Edge label with role dropdown | 带角色下拉的边标签 -->
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
        :options="imageRoleOptions" 
        @select="handleRoleSelect"
        size="small"
      >
        <button 
          class="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 shadow-sm hover:shadow transition-shadow"
        >
          {{ currentRoleLabel }}
          <n-icon :size="10"><ChevronDownOutline /></n-icon>
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
import { ChevronDownOutline, CloseOutline } from '@vicons/ionicons5'
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

// Image role options | 图片角色选项
const imageRoleOptions = [
  { label: '首帧', key: 'first_frame_image' },
  { label: '尾帧', key: 'last_frame_image' },
  { label: '参考图', key: 'input_reference' }
]

// Current role from edge data | 从边数据获取当前角色
const currentRole = computed(() => props.data?.imageRole || 'first_frame_image')

// Current role label | 当前角色标签
const currentRoleLabel = computed(() => {
  const option = imageRoleOptions.find(o => o.key === currentRole.value)
  return option?.label || '首帧'
})

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
const deleteX = computed(() => labelX.value + 46)
const deleteY = computed(() => labelY.value)

// Edge style | 边样式
const edgeStyle = computed(() => ({
  stroke: '#6366f1',
  strokeWidth: 2,
  ...props.style
}))

// Handle role selection | 处理角色选择
const handleRoleSelect = (role) => {
  // If selecting first_frame or last_frame, ensure uniqueness | 如果选择首帧或尾帧，确保唯一性
  if (role === 'first_frame_image' || role === 'last_frame_image') {
    // Find other edges connected to the same target with the same role | 查找连接到同一目标且具有相同角色的其他边
    const sameTargetEdges = edges.value.filter(edge => 
      edge.target === props.target && 
      edge.id !== props.id && 
      edge.data?.imageRole === role
    )
    
    // Auto-switch the other edge to the opposite role | 自动切换其他边到相反角色
    sameTargetEdges.forEach(edge => {
      const oppositeRole = role === 'first_frame_image' ? 'last_frame_image' : 'first_frame_image'
      updateEdgeData(edge.id, { imageRole: oppositeRole })
    })
  }
  
  // Update current edge role | 更新当前边角色
  updateEdgeData(props.id, { imageRole: role })
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
