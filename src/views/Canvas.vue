<template>
  <!-- Canvas page | 画布页面 -->
  <div class="h-screen w-screen flex flex-col bg-[var(--bg-primary)]">
    <!-- Header | 顶部导航 -->
    <header
      class="flex items-center justify-between px-4 py-3 border-b border-[var(--border-color)] bg-[var(--bg-secondary)]">
      <div class="flex items-center gap-3">
        <button @click="goBack" class="p-2 hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors">
          <n-icon :size="20">
            <ChevronBackOutline />
          </n-icon>
        </button>
        <n-dropdown :options="projectOptions" @select="handleProjectAction">
          <button class="flex items-center gap-1 hover:bg-[var(--bg-tertiary)] px-2 py-1 rounded-lg transition-colors">
            <span class="font-medium">{{ projectName }}</span>
            <n-icon :size="16">
              <ChevronDownOutline />
            </n-icon>
          </button>
        </n-dropdown>
      </div>
      <div class="flex items-center gap-2">
        <button @click="toggleTheme" class="p-2 hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors">
          <n-icon :size="20">
            <SunnyOutline v-if="isDark" />
            <MoonOutline v-else />
          </n-icon>
        </button>
        <button @click="showDownloadModal = true" class="p-2 hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors"
          :class="{ 'text-[var(--accent-color)]': hasDownloadableAssets }" title="批量下载素材">
          <n-icon :size="20">
            <DownloadOutline />
          </n-icon>
        </button>
        <UserAvatar @login="handleLogin" />
      </div>
    </header>

    <!-- Main canvas area | 主画布区域 -->
    <div class="flex-1 relative overflow-hidden">
      <!-- Vue Flow canvas | Vue Flow 画布 -->
      <VueFlow :key="flowKey" v-model:nodes="nodes" v-model:edges="edges" v-model:viewport="viewport"
        :node-types="nodeTypes" :edge-types="edgeTypes" :default-viewport="canvasViewport" :min-zoom="0.1" :max-zoom="2"
        :snap-to-grid="true" :snap-grid="[20, 20]" select-nodes-on-drag selection-key-code="Control"
        :delete-key-code="['Backspace', 'Delete']" :zoom-on-double-click="false" @connect="onConnect"
        @connect-start="onConnectStart" @connect-end="onConnectEnd" @node-click="onNodeClick" @pane-click="onPaneClick"
        @viewport-change="handleViewportChange" @edges-change="onEdgesChange" @selection-change="handleSelectionChange"
        @selection-end="handleSelectionEnd" @node-drag="handleNodeDrag" @node-drag-stop="handleNodeDragStop"
        class="canvas-flow">
        <Background v-if="showGrid" :gap="20" :size="1" />
        <MiniMap v-if="!isMobile" position="bottom-right" :pannable="true" :zoomable="true" />
      </VueFlow>

      <!-- Left toolbar | 左侧工具栏 -->
      <aside
        class="absolute left-4 top-1/2 -translate-y-1/2 flex flex-col gap-1 p-2 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-color)] shadow-lg z-10">
        <button @click="toggleNodeMenu"
          class="w-10 h-10 flex items-center justify-center rounded-xl bg-[var(--accent-color)] text-white hover:bg-[var(--accent-hover)] transition-colors"
          title="添加节点">
          <n-icon :size="20" class="text-black">
            <AddOutline />
          </n-icon>
        </button>
        <button @click="showWorkflowPanel = true"
          class="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-[var(--bg-tertiary)] transition-colors"
          title="工作流模板">
          <n-icon :size="20">
            <AppsOutline />
          </n-icon>
        </button>
        <div class="w-full h-px bg-[var(--border-color)] my-1"></div>
        <button v-for="tool in tools" :key="tool.id" @click="tool.action" :disabled="tool.disabled && tool.disabled()"
          class="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          :title="tool.name">
          <n-icon :size="20">
            <component :is="tool.icon" />
          </n-icon>
        </button>
      </aside>

      <!-- Node menu popup | 节点菜单弹窗 -->
      <div v-if="showNodeMenu" ref="nodeMenuRef"
        class="fixed bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-color)] shadow-lg p-2 z-50 transition-all duration-200 min-w-[160px]"
        :style="{ left: menuPosition.x + 'px', top: menuPosition.y + 'px' }" @keydown.esc="showNodeMenu = false">
        <div class="px-2 py-1 text-xs text-[var(--text-secondary)] font-medium">添加节点</div>
        <button
          v-for="nodeType in nodeTypeOptions.filter(n => ['textToImage', 'textToVideo', 'textCombination', 'text'].includes(n.type))"
  :key="nodeType.type" @click="addNewNode(nodeType.type)"
          class="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors text-left">
          <n-icon :size="20" :color="nodeType.color">
            <component :is="nodeType.icon" />
          </n-icon>
          <span class="text-sm">{{ nodeType.name }}</span>
        </button>

        <div class="w-full h-px bg-[var(--border-color)] my-1"></div>

        <div class="px-2 py-1 text-xs text-[var(--text-secondary)] font-medium">添加资源</div>
        <button v-for="nodeType in nodeTypeOptions.filter(n => ['image', 'video'].includes(n.type))"
          :key="nodeType.type" @click="addNewNode(nodeType.type)"
          class="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors text-left">
          <n-icon :size="20" :color="nodeType.color">
            <component :is="nodeType.icon" />
          </n-icon>
          <span class="text-sm">{{ nodeType.name }}</span>
        </button>
      </div>

      <!-- Group Button Overlay | 组合按钮覆盖层 -->
      <div v-if="showGroupButton" class="absolute z-50 pointer-events-none"
        :style="{ left: groupButtonPosition.x + 'px', top: groupButtonPosition.y + 'px' }">
        <div class="pointer-events-auto"
          :style="{ transform: `translateX(-50%) scale(${viewport.zoom})`, transformOrigin: 'center top' }">
          <div class="pt-2 pb-2 px-4">
            <button @click="handleGroupNodes"
              class="flex items-center gap-2 bg-[var(--bg-secondary)]/90 backdrop-blur-md rounded-full px-4 py-2 border border-[var(--border-color)] shadow-lg text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors whitespace-nowrap">
              <n-icon :size="16">
                <LinkOutline />
              </n-icon>
              <span>组合</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Bottom controls | 底部控制 -->
      <div
        class="absolute bottom-4 left-4 flex items-center gap-2 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-color)] p-1">
        <!-- <button 
          @click="showGrid = !showGrid" 
          :class="showGrid ? 'bg-[var(--accent-color)] text-white' : 'hover:bg-[var(--bg-tertiary)]'"
          class="p-2 rounded transition-colors"
          title="切换网格"
        >
          <n-icon :size="16"><GridOutline /></n-icon>
        </button> -->
        <button @click="fitView({ padding: 0.2 })" class="p-2 hover:bg-[var(--bg-tertiary)] rounded transition-colors"
          title="适应视图">
          <n-icon :size="16">
            <LocateOutline />
          </n-icon>
        </button>
        <div class="flex items-center gap-1 px-2">
          <button @click="zoomOut" class="p-1 hover:bg-[var(--bg-tertiary)] rounded transition-colors">
            <n-icon :size="14">
              <RemoveOutline />
            </n-icon>
          </button>
          <span class="text-xs min-w-[40px] text-center">{{ Math.round(viewport.zoom * 100) }}%</span>
          <button @click="zoomIn" class="p-1 hover:bg-[var(--bg-tertiary)] rounded transition-colors">
            <n-icon :size="14">
              <AddOutline />
            </n-icon>
          </button>
        </div>
      </div>


    </div>

    <!-- Rename Modal | 重命名弹窗 -->
    <n-modal v-model:show="showRenameModal" preset="dialog" title="重命名项目">
      <n-input v-model:value="renameValue" placeholder="请输入项目名称" />
      <template #action>
        <n-button @click="showRenameModal = false">取消</n-button>
        <n-button type="primary" @click="confirmRename">确定</n-button>
      </template>
    </n-modal>

    <!-- Delete Confirm Modal | 删除确认弹窗 -->
    <n-modal v-model:show="showDeleteModal" preset="dialog" title="删除项目" type="warning">
      <p>确定要删除项目「{{ projectName }}」吗？此操作不可恢复。</p>
      <template #action>
        <n-button @click="showDeleteModal = false">取消</n-button>
        <n-button type="error" @click="confirmDelete">删除</n-button>
      </template>
    </n-modal>

    <div v-if="showConnectNodeModal" ref="connectNodeMenuRef"
      class="fixed bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-color)] shadow-lg p-2 z-50 transition-all duration-200 min-w-[180px]"
      :style="{ left: connectMenuPosition.x + 'px', top: connectMenuPosition.y + 'px' }">
      <div class="px-2 py-1 text-xs text-[var(--text-secondary)] font-medium">选择节点</div>
      <button v-for="nodeType in connectNodeTypeOptions" :key="nodeType.type" @click="confirmConnectNode(nodeType.type)"
        class="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors text-left">
        <n-icon :size="20" :color="nodeType.color">
          <component :is="nodeType.icon" />
        </n-icon>
        <span class="text-sm">{{ nodeType.name }}</span>
      </button>
      <div class="w-full h-px bg-[var(--border-color)] my-1"></div>
      <button @click="cancelConnectNode"
        class="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors text-left text-[var(--text-secondary)]">
        <span class="text-sm">取消</span>
      </button>
    </div>

    <!-- Download Modal | 下载弹窗 -->
    <DownloadModal v-model:show="showDownloadModal" />

    <!-- Workflow Panel | 工作流面板 -->
    <WorkflowPanel v-model:show="showWorkflowPanel" @add-workflow="handleAddWorkflow" />
  </div>
</template>

<script setup>
/**
 * Canvas view component | 画布视图组件
 * Main infinite canvas with Vue Flow integration
 */
import {
  AddOutline,
  AppsOutline,
  ArrowRedoOutline,
  ArrowUndoOutline,
  ChevronBackOutline,
  ChevronDownOutline,
  ColorPaletteOutline,
  DownloadOutline,
  ImageOutline,
  LinkOutline,
  LocateOutline,
  MoonOutline,
  RemoveOutline,
  SunnyOutline,
  TextOutline,
  VideocamOutline
} from '@vicons/ionicons5'
import { Background } from '@vue-flow/background'
import { VueFlow, useVueFlow } from '@vue-flow/core'
import { MiniMap } from '@vue-flow/minimap'
import { NButton, NDropdown, NIcon, NInput, NModal } from 'naive-ui'
import { computed, markRaw, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useWorkflowOrchestrator } from '../hooks'
import { addEdge, addNode, canRedo, canUndo, canvasViewport, clearCanvas, edges, groupNodes, loadProject, manualSaveHistory, nodes, redo, removeNode, saveProject, undo, updateNode, updateViewport } from '../stores/canvas'
import { loadAllModels } from '../stores/models'
import { deleteProject, initProjectsStore, projects, renameProject } from '../stores/projects'
import { isDark, toggleTheme } from '../stores/theme'
import { getAiVideoMy, getAiVideoPageMy } from '@/api/video'

import DownloadModal from '../components/DownloadModal.vue'
import UserAvatar from '../components/UserAvatar.vue'
import WorkflowPanel from '../components/WorkflowPanel.vue'

// Initialize models on page load | 页面加载时初始化模型
onMounted(() => {
  loadAllModels()
})

// Workflow orchestrator hook | 工作流编排 hook
const {
  isAnalyzing: workflowAnalyzing,
  isExecuting: workflowExecuting,
  currentStep: workflowStep,
  totalSteps: workflowTotalSteps,
  executionLog: workflowLog,
  analyzeIntent,
  executeWorkflow,
  createTextToImageWorkflow,
  createMultiAngleStoryboard,
  WORKFLOW_TYPES
} = useWorkflowOrchestrator()

// Custom node components | 自定义节点组件
import DeletableEdge from '../components/edges/DeletableEdge.vue'
import ImageRoleEdge from '../components/edges/ImageRoleEdge.vue'
import PromptOrderEdge from '../components/edges/PromptOrderEdge.vue'
import ConnectPlaceholderNode from '../components/nodes/ConnectPlaceholderNode.vue'
import GroupNode from '../components/nodes/GroupNode.vue'
import ImageConfigNode from '../components/nodes/ImageConfigNode.vue'
import ImageNode from '../components/nodes/ImageNode.vue'
import TextToImageNode from '../components/nodes/TextToImageNode.vue'
import TextToVideoNode from '../components/nodes/TextToVideoNode.vue'
import TextCombinationNode from '../components/nodes/TextCombinationNode.vue'
import TextNode from '../components/nodes/TextNode.vue'
import VideoConfigNode from '../components/nodes/VideoConfigNode.vue'
import VideoNode from '../components/nodes/VideoNode.vue'
import EnhanceNode from '../components/nodes/EnhanceNode.vue'

const router = useRouter()
const route = useRoute()

// Vue Flow instance | Vue Flow 实例
const { viewport, zoomIn, zoomOut, fitView, updateNodeInternals, project, removeSelectedElements, findNode, updateNode: updateFlowNode } = useVueFlow()

// Register custom node types | 注册自定义节点类型
const nodeTypes = {
  text: markRaw(TextNode),
  imageConfig: markRaw(ImageConfigNode),
  video: markRaw(VideoNode),
  image: markRaw(ImageNode),
  videoConfig: markRaw(VideoConfigNode),
  textToImage: markRaw(TextToImageNode),
  textToVideo: markRaw(TextToVideoNode),
  textCombination: markRaw(TextCombinationNode),
  connectPlaceholder: markRaw(ConnectPlaceholderNode),
  group: markRaw(GroupNode),
  enhance: markRaw(EnhanceNode)
}

// Register custom edge types | 注册自定义边类型
const edgeTypes = {
  deletable: markRaw(DeletableEdge),
  imageRole: markRaw(ImageRoleEdge),
  promptOrder: markRaw(PromptOrderEdge)
}

// UI state | UI状态
const showNodeMenu = ref(false)
const nodeMenuRef = ref(null)
const menuPosition = ref({ x: 80, y: 300 })
const targetNodePosition = ref(null)
const chatInput = ref('')
const autoExecute = ref(true)
const isMobile = ref(false)
const showGrid = ref(true)
const isProcessing = ref(false)

// Toggle node menu | 切换节点菜单
const toggleNodeMenu = () => {
  if (showNodeMenu.value) {
    showNodeMenu.value = false
  } else {
    // Reset to default position (near toolbar) | 重置到默认位置（工具栏旁）
    menuPosition.value = { x: 80, y: window.innerHeight / 2 - 100 }
    targetNodePosition.value = null
    showNodeMenu.value = true
  }
}

// Handle pane double click | 处理画布双击
const onPaneDblClick = (e) => {
  const { event } = e
  event.preventDefault()

  // Set menu position at click coordinates | 在点击坐标处设置菜单位置
  menuPosition.value = { x: event.clientX, y: event.clientY }

  // Store target node position (converted to canvas coordinates) | 存储目标节点位置（转换为画布坐标）
  targetNodePosition.value = project({ x: event.clientX, y: event.clientY })

  showNodeMenu.value = true
}

// Flow key for forcing re-render on project switch | 项目切换时强制重新渲染的 key
const flowKey = ref(Date.now())

// Modal state | 弹窗状态
const showRenameModal = ref(false)
const showDeleteModal = ref(false)
const showDownloadModal = ref(false)
const showWorkflowPanel = ref(false)
const showConnectNodeModal = ref(false)
const renameValue = ref('')

// Grouping UI state | 组合 UI 状态
const showGroupButton = ref(false)
const groupButtonPosition = ref({ x: 0, y: 0 })
const selectedNodesForGroup = ref([])

const updateGroupButton = (selectedNodes) => {
  // Filter out nodes that are already in a group (as children) to simplify logic
  // Also filter out connection lines or other non-groupable things if any
  const candidates = selectedNodes.filter(n => !n.parentNode)

  if (candidates.length < 2) {
    showGroupButton.value = false
    selectedNodesForGroup.value = []
    return
  }

  selectedNodesForGroup.value = candidates

  // Calculate bounding box in graph coordinates
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  candidates.forEach(node => {
    const x = node.position.x
    const y = node.position.y
    const w = node.width || node.dimensions?.width || 200
    const h = node.height || node.dimensions?.height || 100
    if (x < minX) minX = x
    if (y < minY) minY = y
    if (x + w > maxX) maxX = x + w
    if (y + h > maxY) maxY = y + h
  })

  // Center Top of the bounding box
  const centerX = minX + (maxX - minX) / 2
  const topY = minY

  // Project to screen/viewport coordinates
  // ScreenX = GraphX * zoom + viewportX
  const screenX = centerX * viewport.value.zoom + viewport.value.x
  const groupButtonOffset = 48
  const screenY = (topY - groupButtonOffset) * viewport.value.zoom + viewport.value.y

  groupButtonPosition.value = { x: screenX, y: screenY }
  showGroupButton.value = true
}

const handleGroupNodes = () => {
  const groupId = groupNodes(selectedNodesForGroup.value)
  showGroupButton.value = false
  selectedNodesForGroup.value = []
  if (!groupId) return
  nextTick(() => {
    updateNodeInternals(groupId)
    removeSelectedElements()
  })
}

// Handle selection change | 处理选择变化
const handleSelectionChange = (params) => {
  updateGroupButton(params.nodes)
}

const handleSelectionEnd = () => {
  nextTick(() => {
    const selected = nodes.value.filter(n => n.selected)
    updateGroupButton(selected)
  })
}

// Handle node drag | 处理节点拖拽
const clampNodeInsideGroup = (node) => {
  const parentId = node?.parentNode
  if (!parentId) return
  const parent = findNode(parentId)
  if (!parent || parent.type !== 'group') return

  const parentW = parent.dimensions?.width || parent.width || 0
  const parentH = parent.dimensions?.height || parent.height || 0
  const nodeW = node.dimensions?.width || node.width || 0
  const nodeH = node.dimensions?.height || node.height || 0
  if (!parentW || !parentH || !nodeW || !nodeH) return

  const maxX = Math.max(0, parentW - nodeW)
  const maxY = Math.max(0, parentH - nodeH)
  const nextX = Math.min(Math.max(node.position.x, 0), maxX)
  const nextY = Math.min(Math.max(node.position.y, 0), maxY)

  if (nextX === node.position.x && nextY === node.position.y) return
  updateFlowNode(node.id, { position: { x: nextX, y: nextY } })
}

const clampDraggedNodes = (payload) => {
  const dragged = payload?.nodes?.length ? payload.nodes : payload?.node ? [payload.node] : []
  dragged.forEach(clampNodeInsideGroup)
}

const handleNodeDrag = (payload) => {
  const selected = nodes.value.filter(n => n.selected)
  updateGroupButton(selected)
  clampDraggedNodes(payload)
}

const handleNodeDragStop = (payload) => {
  clampDraggedNodes(payload)
}

const connectNodeMenuRef = ref(null)
const connectMenuPosition = ref({ x: 80, y: 300 })

const connectStart = ref(null)
const pendingConnection = ref(null)

// Check if has downloadable assets | 检查是否有可下载素材
const hasDownloadableAssets = computed(() => {
  return nodes.value.some(n =>
    (n.type === 'image' || n.type === 'video') && n.data?.url
  )
})


// Project info | 项目信息
const projectName = computed(() => {
  const project = projects.value.find(p => p.id === route.params.id)
  return project?.name || '未命名项目'
})

// Project dropdown options | 项目下拉选项
const projectOptions = [
  { label: '重命名', key: 'rename' },
  { label: '复制', key: 'duplicate' },
  { label: '删除', key: 'delete' }
]

// Toolbar tools | 工具栏工具
const tools = [
  { id: 'text', name: '文本', icon: TextOutline, action: () => addNewNode('text') },
  { id: 'image', name: '图片', icon: ImageOutline, action: () => addNewNode('image') },
  { id: 'undo', name: '撤销', icon: ArrowUndoOutline, action: () => undo(), disabled: () => !canUndo() },
  { id: 'redo', name: '重做', icon: ArrowRedoOutline, action: () => redo(), disabled: () => !canRedo() }
]

// Node type options for menu | 节点类型菜单选项
const nodeTypeOptions = [
  { type: 'textToImage', name: '文生图(组合)', icon: ImageOutline, color: '#ec4899' },
  { type: 'textToVideo', name: '文生视频(组合)', icon: VideocamOutline, color: '#f97316' },
  { type: 'textCombination', name: '文本(组合)', icon: TextOutline, color: '#8b5cf6' },
  { type: 'text', name: '文本节点', icon: TextOutline, color: '#3b82f6' },
  { type: 'image', name: '图片节点', icon: ImageOutline, color: '#8b5cf6' },
  { type: 'video', name: '视频节点', icon: VideocamOutline, color: '#ef4444' }
]

const connectNodeTypeOptions = computed(() =>
  nodeTypeOptions.filter(n => ['textToImage', 'textToVideo', 'textCombination', 'text', 'image', 'video'].includes(n.type))
)

// Add new node | 添加新节点
const addNewNode = async (type) => {
  let position

  if (targetNodePosition.value) {
    // Use stored target position (from double click) | 使用存储的目标位置（来自双击）
    position = targetNodePosition.value
    // Reset target position | 重置目标位置
    targetNodePosition.value = null
  } else {
    // Calculate viewport center position | 计算视口中心位置
    const viewportCenterX = -viewport.value.x / viewport.value.zoom + (window.innerWidth / 2) / viewport.value.zoom
    const viewportCenterY = -viewport.value.y / viewport.value.zoom + (window.innerHeight / 2) / viewport.value.zoom
    position = { x: viewportCenterX - 100, y: viewportCenterY - 100 }
  }

  // Add node | 添加节点
  const nodeId = addNode(type, position)

  // Set highest z-index | 设置最高层级
  const maxZIndex = Math.max(0, ...nodes.value.map(n => n.zIndex || 0))
  updateNode(nodeId, { zIndex: maxZIndex + 1 })

  // Force Vue Flow to recalculate node dimensions | 强制 Vue Flow 重新计算节点尺寸
  setTimeout(() => {
    updateNodeInternals(nodeId)
  }, 50)

  showNodeMenu.value = false
}

// Handle add workflow from panel | 处理从面板添加工作流
const handleAddWorkflow = ({ workflow, options }) => {
  // Calculate viewport center position | 计算视口中心位置
  const viewportCenterX = -viewport.value.x / viewport.value.zoom + (window.innerWidth / 2) / viewport.value.zoom
  const viewportCenterY = -viewport.value.y / viewport.value.zoom + (window.innerHeight / 2) / viewport.value.zoom

  // Create nodes from workflow template | 从工作流模板创建节点
  const startPosition = { x: viewportCenterX - 300, y: viewportCenterY - 200 }
  const { nodes: newNodes, edges: newEdges } = workflow.createNodes(startPosition, options)

  const nodeIdMap = new Map()
  const createdNodeIds = []
  newNodes.forEach(node => {
    const nodeId = addNode(node.type, node.position, node.data)
    nodeIdMap.set(node.id, nodeId)
    createdNodeIds.push(nodeId)
  })

  // Add edges to canvas | 将边添加到画布
  setTimeout(() => {
    newEdges.forEach(edge => {
      addEdge({
        source: nodeIdMap.get(edge.source) || edge.source,
        target: nodeIdMap.get(edge.target) || edge.target,
        sourceHandle: edge.sourceHandle || 'right',
        targetHandle: edge.targetHandle || 'left',
        type: edge.type,  // Preserve edge type (e.g., promptOrder) | 保留边类型
        data: edge.data   // Preserve edge data (e.g., promptOrder number) | 保留边数据
      })
    })

    // Update node internals | 更新节点内部
    createdNodeIds.forEach(nodeId => updateNodeInternals(nodeId))

    setTimeout(() => {
      const nodesToGroup = createdNodeIds
        .map(id => findNode(id) || nodes.value.find(n => n.id === id))
        .filter(Boolean)

      if (nodesToGroup.length < 2) return
      const groupId = groupNodes(nodesToGroup)
      if (!groupId) return
      updateNode(groupId, { label: workflow.name, workflowId: workflow.id })
      nextTick(() => updateNodeInternals(groupId))
    }, 80)
  }, 100)

  window.$message?.success(`已添加工作流: ${workflow.name}`)
}

// Handle connection | 处理连接
const onConnect = (params) => {
  // Check connection types | 检查连接类型
  const sourceNode = nodes.value.find(n => n.id === params.source)
  const targetNode = nodes.value.find(n => n.id === params.target)

  if (sourceNode?.type === 'image' && targetNode?.type === 'videoConfig') {
    // Use imageRole edge type | 使用图片角色边类型
    addEdge({
      ...params,
      type: 'imageRole',
      data: { imageRole: 'first_frame_image' } // Default to first frame | 默认首帧
    })
  } else if (sourceNode?.type === 'text' && targetNode?.type === 'imageConfig') {
    // Use promptOrder edge type | 使用提示词顺序边类型
    // Calculate next order number | 计算下一个顺序号
    const existingTextEdges = edges.value.filter(e =>
      e.target === params.target && e.type === 'promptOrder'
    )
    const nextOrder = existingTextEdges.length + 1

    addEdge({
      ...params,
      type: 'promptOrder',
      data: { promptOrder: nextOrder }
    })
  } else {
    addEdge(params)
  }

  nextTick(() => {
    updateNodeInternals([params.source, params.target])
  })
}

const cleanupPendingConnection = () => {
  const pending = pendingConnection.value
  pendingConnection.value = null
  if (!pending?.placeholderNodeId) return
  removeNode(pending.placeholderNodeId)
}

const cancelConnectNode = () => {
  cleanupPendingConnection()
  showConnectNodeModal.value = false
}

const confirmConnectNode = async (type) => {
  const pending = pendingConnection.value
  if (!pending) {
    showConnectNodeModal.value = false
    return
  }

  pendingConnection.value = null
  showConnectNodeModal.value = false

  const newNodeId = addNode(type, pending.position)
  setTimeout(() => updateNodeInternals(newNodeId), 50)

  removeNode(pending.placeholderNodeId)

  if (pending.direction === 'reverse') {
    onConnect({
      source: newNodeId,
      target: pending.nodeId,
      sourceHandle: 'right',
      targetHandle: pending.handleId || 'left'
    })
    return
  }

  onConnect({
    source: pending.nodeId,
    target: newNodeId,
    sourceHandle: pending.handleId || 'right',
    targetHandle: 'left'
  })
}

const onConnectStart = (payload) => {
  cleanupPendingConnection()
  showConnectNodeModal.value = false

  if (!payload) return
  const event = payload.event || null
  const nodeId = payload.nodeId
  const handleId = payload.handleId
  const handleType = payload.handleType
  connectStart.value = { event, nodeId, handleId, handleType }
}

const onConnectEnd = (payload) => {
  const event = payload?.event || payload
  const start = connectStart.value
  connectStart.value = null

  if (!event || !start?.nodeId) return

  const targetEl = event.target
  const isHandle = Boolean(targetEl?.closest?.('.vue-flow__handle') || targetEl?.classList?.contains?.('vue-flow__handle'))
  if (isHandle) return

  const isPane = Boolean(targetEl?.closest?.('.vue-flow__pane') || targetEl?.classList?.contains?.('vue-flow__pane'))
  if (!isPane) return

  const safeX = Math.min(event.clientX, window.innerWidth - 220)
  const safeY = Math.min(event.clientY, window.innerHeight - 360)
  connectMenuPosition.value = { x: Math.max(8, safeX), y: Math.max(8, safeY) }

  const position = project({ x: event.clientX, y: event.clientY })
  const placeholderNodeId = addNode('connectPlaceholder', position)

  const direction = start.handleType === 'target' ? 'reverse' : 'forward'
  const edgeParams = direction === 'reverse'
    ? { source: placeholderNodeId, target: start.nodeId, sourceHandle: 'right', targetHandle: start.handleId || 'left' }
    : { source: start.nodeId, target: placeholderNodeId, sourceHandle: start.handleId || 'right', targetHandle: 'left' }

  addEdge(edgeParams)

  pendingConnection.value = {
    ...start,
    direction,
    position,
    placeholderNodeId
  }
  showConnectNodeModal.value = true
}

// Handle node click | 处理节点点击
const onNodeClick = (event) => {
  showNodeMenu.value = false
  showGroupButton.value = false
  selectedNodesForGroup.value = []
  // nodes.value.forEach(node => {
  //   updateNode(node.id, { selected: false })
  // })

  // // Select clicked node | 选中的节点
  // const clickedNode = nodes.value.find(n => n.id === event.node.id)
  // if (clickedNode) {
  //   updateNode(event.node.id, { selected: true })
  // }
}

// Handle viewport change | 处理视口变化
const handleViewportChange = (newViewport) => {
  updateViewport(newViewport)
  const selected = nodes.value.filter(n => n.selected)
  updateGroupButton(selected)
}

// Handle edges change | 处理边变化
const onEdgesChange = (changes) => {
  // Check if any edge is being removed | 检查是否有边被删除
  const hasRemoval = changes.some(change => change.type === 'remove')

  if (hasRemoval) {
    // Trigger history save after edge removal | 边删除后触发历史保存
    nextTick(() => {
      manualSaveHistory()
    })
  }
}

// Handle pane click | 处理画布点击
let lastClickTime = 0
const onPaneClick = (event) => {
  const now = Date.now()
  if (now - lastClickTime < 300) {
    // Double click detected | 检测到双击
    onPaneDblClick({ event })
    lastClickTime = 0 // Reset | 重置
  } else {
    // Single click | 单击
    showNodeMenu.value = false
    showGroupButton.value = false
    selectedNodesForGroup.value = []
    lastClickTime = now
  }
}

watch(
  () => showConnectNodeModal.value,
  (show) => {
    if (show) return
    cleanupPendingConnection()
  }
)

const handleConnectNodeMenuGlobalMouseDown = (event) => {
  if (!showConnectNodeModal.value) return
  const el = connectNodeMenuRef.value
  if (!el) return
  if (el.contains(event.target)) return
  cancelConnectNode()
}

watch(
  () => showConnectNodeModal.value,
  (show) => {
    if (show) {
      document.addEventListener('mousedown', handleConnectNodeMenuGlobalMouseDown, true)
      return
    }
    document.removeEventListener('mousedown', handleConnectNodeMenuGlobalMouseDown, true)
  },
  { immediate: true }
)

onUnmounted(() => {
  document.removeEventListener('mousedown', handleConnectNodeMenuGlobalMouseDown, true)
})

// Handle project action | 处理项目操作
const handleProjectAction = (key) => {
  switch (key) {
    case 'rename':
      renameValue.value = projectName.value
      showRenameModal.value = true
      break
    case 'duplicate':
      // TODO: Implement duplicate
      window.$message?.info('复制功能开发中')
      break
    case 'delete':
      showDeleteModal.value = true
      break
  }
}

// Confirm rename | 确认重命名
const confirmRename = async () => {
  const projectId = route.params.id
  if (renameValue.value.trim()) {
    await renameProject(projectId, renameValue.value.trim())
    window.$message?.success('已重命名')
  }
  showRenameModal.value = false
}

// Confirm delete | 确认删除
const confirmDelete = async () => {
  const projectId = route.params.id
  await deleteProject(projectId)
  showDeleteModal.value = false
  window.$message?.success('项目已删除')
  router.push('/')
}

// Send message | 发送消息
const sendMessage = async () => {
  const input = chatInput.value.trim()
  if (!input) return

  isProcessing.value = true
  const content = chatInput.value
  chatInput.value = ''

  try {
    // Calculate position to avoid overlap | 计算位置避免重叠
    let maxY = 0
    if (nodes.value.length > 0) {
      maxY = Math.max(...nodes.value.map(n => n.position.y))
    }
    const baseX = 100
    const baseY = maxY + 200

    if (autoExecute.value) {
      // Auto-execute mode: analyze intent and execute workflow | 自动执行模式：分析意图并执行工作流
      window.$message?.info('正在分析工作流...')

      try {
        // Analyze user intent | 分析用户意图
        const result = await analyzeIntent(content)

        // Ensure we have valid workflow params | 确保有效的工作流参数
        const workflowParams = {
          workflow_type: result?.workflow_type || WORKFLOW_TYPES.TEXT_TO_IMAGE,
          image_prompt: result?.image_prompt || content,
          video_prompt: result?.video_prompt || content,
          character: result?.character,
          shots: result?.shots
        }

        window.$message?.info(`执行工作流: ${result?.description || '文生图'}`)

        // Execute the workflow | 执行工作流
        await executeWorkflow(workflowParams, { x: baseX, y: baseY })

        window.$message?.success('工作流已启动')
      } catch (err) {
        console.error('Workflow error:', err)
        // Fallback to simple text-to-image | 回退到文生图
        window.$message?.warning('使用默认文生图工作流')
        await createTextToImageWorkflow(content, { x: baseX, y: baseY })
      }
    } else {
      // Manual mode: just create nodes | 手动模式：仅创建节点
      addNode('textToImage', { x: baseX, y: baseY }, {
        content: content,
        label: '文生图(组合)'
      })
    }
  } catch (err) {
    // Global error handler will show the message | 全局错误处理会显示消息
    console.error('Create failed:', err)
  } finally {
    isProcessing.value = false
  }
}

// Handle login | 处理登录
const handleLogin = () => {
  window.$showLoginModal?.()
}

// Go back to home | 返回首页
const goBack = () => {
  router.push('/')
}

// Check if mobile | 检测是否移动端
const checkMobile = () => {
  isMobile.value = window.innerWidth < 768
}

const videoResumeDebugEnabled = import.meta.env.DEV && new URLSearchParams(window.location.search).get('videoDebug') === '1'
const debugVideoResume = (...args) => {
  if (!videoResumeDebugEnabled) return
  console.log('[video-resume]', ...args)
}

let videoStatusResumeToken = 0

const resumePendingVideoTasks = () => {
  const token = ++videoStatusResumeToken
  const videoNodes = nodes.value.filter((n) => n.type === 'video')
  const videoNodesById = new Map(videoNodes.map((n) => [n.id, n]))
  const videoConfigNodes = nodes.value.filter((n) => n.type === 'videoConfig')
  const usedTaskIds = new Set()

  const parseRecordTime = (record) => {
    const raw = record?.createTime ?? record?.createdAt ?? record?.createAt ?? record?.create_time
    if (!raw) return 0
    if (typeof raw === 'number') return raw
    const t = Date.parse(raw)
    return Number.isFinite(t) ? t : 0
  }

  const getRecordId = (record) => {
    const raw = record?.id ?? record?.taskId ?? record?.videoId ?? record?.recordId
    if (raw === null || raw === undefined) return ''
    return String(raw)
  }

  const getListFromPage = (pageRes) => {
    if (!pageRes) return []
    if (Array.isArray(pageRes)) return pageRes
    if (Array.isArray(pageRes.list)) return pageRes.list
    if (Array.isArray(pageRes.records)) return pageRes.records
    if (Array.isArray(pageRes.data?.list)) return pageRes.data.list
    if (Array.isArray(pageRes.data?.records)) return pageRes.data.records
    return []
  }

  const candidateVideoNodeIds = new Set(
    videoNodes
      .filter((n) => !n.data?.url && !n.data?.error && (n.data?.loading || n.data?.taskId))
      .map((n) => n.id)
  )

  for (const configNode of videoConfigNodes) {
    const outputNodeId = configNode.data?.outputNodeId
    const hasTaskId = !!configNode.data?.taskId
    if (outputNodeId && hasTaskId && videoNodesById.has(outputNodeId)) {
      candidateVideoNodeIds.add(outputNodeId)
    }
  }

  const pendingVideoNodes = Array.from(candidateVideoNodeIds)
    .map((id) => videoNodesById.get(id))
    .filter(Boolean)
  debugVideoResume('resume called', {
    routeId: route.params.id,
    token,
    nodes: nodes.value.length,
    edges: edges.value.length,
    pendingVideos: pendingVideoNodes.length,
    videoConfigs: videoConfigNodes.length
  })
  if (videoResumeDebugEnabled) {
    window.__videoResumeDebug = {
      token,
      resume: resumePendingVideoTasks,
      snapshot: () => ({
        routeId: route.params.id,
        nodes: nodes.value,
        edges: edges.value
      })
    }
  }

  let inProgressRecordsPromise = null
  const getInProgressRecords = async () => {
    if (inProgressRecordsPromise) return inProgressRecordsPromise
    inProgressRecordsPromise = (async () => {
      try {
        const res = await getAiVideoPageMy({ pageNo: 1, pageSize: 20 })
        const list = getListFromPage(res)
        return list.filter((r) => r?.status === 10 || r?.status === 20)
      } catch (err) {
        debugVideoResume('fetch in-progress list failed', { message: err?.message })
        return []
      }
    })()
    return inProgressRecordsPromise
  }
  for (const videoNode of pendingVideoNodes) {
    let resolvedTaskId = videoNode.data?.taskId
    let configNodeId = null


    if (!resolvedTaskId) {
      const incomingEdge = edges.value.find((e) => e.target === videoNode.id)
      const sourceNode = incomingEdge ? nodes.value.find((n) => n.id === incomingEdge.source) : null
      if (sourceNode?.type === 'videoConfig') {
        configNodeId = sourceNode.id
        resolvedTaskId = sourceNode.data?.taskId
        if (resolvedTaskId) {
          updateNode(videoNode.id, { taskId: resolvedTaskId })
        }
      }
    }

    if (!resolvedTaskId) {
      const connectedConfigNode = configNodeId ? nodes.value.find((n) => n.id === configNodeId) : null
      const nodeTime = videoNode.data?.createdAt || videoNode.data?.updatedAt || 0
      const configTime = connectedConfigNode?.data?.createdAt || connectedConfigNode?.data?.updatedAt || 0
      const anchorTime = Math.max(nodeTime, configTime, 0)

        ; (async () => {
          const inProgress = await getInProgressRecords()
          if (token !== videoStatusResumeToken) return
          if (!inProgress.length) return

          const candidates = inProgress
            .map((r) => {
              const rid = getRecordId(r)
              const t = parseRecordTime(r)
              return { rid, t, r }
            })
            .filter((x) => x.rid && !usedTaskIds.has(x.rid))

          if (!candidates.length) return

          candidates.sort((a, b) => {
            const da = Math.abs((a.t || 0) - anchorTime)
            const db = Math.abs((b.t || 0) - anchorTime)
            return da - db
          })

          const best = candidates[0]
          if (!best?.rid) return

          usedTaskIds.add(best.rid)
          debugVideoResume('resolved missing taskId via recent list', {
            videoNodeId: videoNode.id,
            taskId: best.rid,
            recordStatus: best.r?.status,
            recordTime: best.t,
            anchorTime
          })

          updateNode(videoNode.id, { taskId: best.rid, loading: true, label: videoNode.data?.label || '视频生成中...' })
          if (configNodeId) {
            updateNode(configNodeId, { taskId: best.rid, outputNodeId: videoNode.id })
          }

          resumePendingVideoTasks()
        })()

      debugVideoResume('skip video node: missing taskId', { videoNodeId: videoNode.id })
      continue
    }
    debugVideoResume('start polling', { videoNodeId: videoNode.id, taskId: resolvedTaskId, configNodeId })

    usedTaskIds.add(String(resolvedTaskId))

    const incomingEdge = edges.value.find((e) => e.target === videoNode.id)
    const sourceNode = incomingEdge ? nodes.value.find((n) => n.id === incomingEdge.source) : null
    if (sourceNode?.type === 'videoConfig') {
      configNodeId = sourceNode.id
      if (!sourceNode.data?.outputNodeId) {
        updateNode(configNodeId, { outputNodeId: videoNode.id, taskId: resolvedTaskId })
      } else if (!sourceNode.data?.taskId) {
        updateNode(configNodeId, { taskId: resolvedTaskId })
      }
    }

    updateNode(videoNode.id, {
      loading: true,
      taskId: resolvedTaskId,
      label: videoNode.data?.label || '视频生成中...'
    })

      ; (async () => {
        const maxAttempts = 120
        const interval = 5000
        let lastStatus = null

        for (let attempt = 0; attempt < maxAttempts; attempt++) {
          if (token !== videoStatusResumeToken) return

          const latestVideoNode = nodes.value.find((n) => n.id === videoNode.id)
          if (!latestVideoNode || latestVideoNode.data?.url || latestVideoNode.data?.error) return

          let record
          try {
            record = await getAiVideoMy(resolvedTaskId)
          } catch (err) {
            debugVideoResume('poll error', { videoNodeId: videoNode.id, taskId: resolvedTaskId, attempt: attempt + 1, message: err?.message })
            await new Promise((resolve) => setTimeout(resolve, interval))
            continue
          }

          const recordStatus = record?.status
          if (recordStatus !== lastStatus) {
            lastStatus = recordStatus
            debugVideoResume('status changed', { videoNodeId: videoNode.id, taskId: resolvedTaskId, attempt: attempt + 1, status: recordStatus })
          }

          if (recordStatus === 30) {
            if (record?.videoUrl) {
              updateNode(videoNode.id, {
                url: record.videoUrl,
                loading: false,
                label: '视频生成',
                taskId: resolvedTaskId,
                updatedAt: Date.now()
              })
              if (configNodeId) {
                updateNode(configNodeId, { executed: true, outputNodeId: videoNode.id, taskId: resolvedTaskId, updatedAt: Date.now() })
              }
            } else {
              updateNode(videoNode.id, {
                loading: false,
                error: '已完成但未返回视频地址',
                label: '生成失败',
                taskId: resolvedTaskId,
                updatedAt: Date.now()
              })
            }
            return
          }

          if (recordStatus === 40) {
            updateNode(videoNode.id, {
              loading: false,
              error: record?.errorMessage || '视频生成失败',
              label: '生成失败',
              taskId: resolvedTaskId,
              updatedAt: Date.now()
            })
            return
          }

          if (recordStatus === 50) {
            updateNode(videoNode.id, {
              loading: false,
              error: '视频生成已取消',
              label: '已取消',
              taskId: resolvedTaskId,
              updatedAt: Date.now()
            })
            return
          }

          const desiredLabel = recordStatus === 10 ? '视频排队中...' : '视频生成中...'
          if (latestVideoNode.data?.label !== desiredLabel || latestVideoNode.data?.taskId !== resolvedTaskId) {
            updateNode(videoNode.id, {
              loading: true,
              taskId: resolvedTaskId,
              label: desiredLabel
            })
          }

          await new Promise((resolve) => setTimeout(resolve, interval))
        }

        updateNode(videoNode.id, {
          loading: false,
          error: '视频生成超时',
          label: '生成失败',
          taskId: resolvedTaskId,
          updatedAt: Date.now()
        })
      })()
  }
}

// Load project by ID | 根据ID加载项目
const loadProjectById = async (projectId) => {
  // Update flow key to force VueFlow re-render | 更新 key 强制 VueFlow 重新渲染
  flowKey.value = Date.now()

  if (projectId && projectId !== 'new') {
    await loadProject(projectId)
  } else {
    // New project - clear canvas | 新项目 - 清空画布
    clearCanvas()
  }
}

// Watch for route changes | 监听路由变化
watch(
  () => route.params.id,
  async (newId, oldId) => {
    if (newId && newId !== oldId) {
      // Save current project before switching | 切换前保存当前项目
      if (oldId) {
        await saveProject()
      }
      // Load new project | 加载新项目
      await loadProjectById(newId)
      resumePendingVideoTasks()
    }
  }
)

// Initialize | 初始化
onMounted(async () => {
  checkMobile()
  window.addEventListener('resize', checkMobile)

  // Initialize projects store | 初始化项目存储
  await initProjectsStore()

  // Load project data | 加载项目数据
  await loadProjectById(route.params.id)
  resumePendingVideoTasks()

  // Check for initial prompt from home page | 检查来自首页的初始提示词
  const initialPrompt = sessionStorage.getItem('ai-canvas-initial-prompt')
  if (initialPrompt) {
    sessionStorage.removeItem('ai-canvas-initial-prompt')
    chatInput.value = initialPrompt
    // Auto-send the message | 自动发送消息
    nextTick(() => {
      sendMessage()
    })
  }
})

// Cleanup on unmount | 卸载时清理
onUnmounted(async () => {
  window.removeEventListener('resize', checkMobile)
  videoStatusResumeToken += 1
  // Save project before leaving | 离开前保存项目
  await saveProject()
})
</script>

<style>
/* Import Vue Flow styles | 引入 Vue Flow 样式 */
@import '@vue-flow/core/dist/style.css';
@import '@vue-flow/core/dist/theme-default.css';
@import '@vue-flow/minimap/dist/style.css';

.canvas-flow {
  width: 100%;
  height: 100%;
}
</style>
