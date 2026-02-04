/**
 * Canvas store | 画布状态管理
 * Manages nodes, edges and canvas state
 */
import { ref, watch } from 'vue'
import { getProjectCanvas, updateProjectCanvas } from './projects'

// Node ID counter | 节点ID计数器
let nodeId = 0
const getNodeId = () => `node_${nodeId++}`

// Current project ID | 当前项目ID
export const currentProjectId = ref(null)

// Nodes and edges | 节点和边
export const nodes = ref([])
export const edges = ref([])

let isPropagating = false

const propagateReferenceToTarget = (sourceNodeId, targetNodeId) => {
  const sourceNode = nodes.value.find(n => n.id === sourceNodeId)
  const targetNode = nodes.value.find(n => n.id === targetNodeId)
  if (!sourceNode || !targetNode) return

  if (targetNode.type !== 'textToImage' && targetNode.type !== 'textToVideo') return

  const url = sourceNode.data?.url
  const base64 = sourceNode.data?.base64
  const reference = url || base64
  if (!reference) return

  const current = targetNode.data?.referenceImageUrl
  if (current === reference) return

  isPropagating = true
  try {
    updateNode(targetNodeId, {
      referenceImageUrl: reference,
      referenceImageFileName: sourceNode.data?.fileName || null,
      referenceImageFileType: null,
      updatedAt: Date.now()
    })
  } finally {
    isPropagating = false
  }
}

// Viewport state | 视口状态
export const canvasViewport = ref({ x: 100, y: 50, zoom: 0.8 })

// Selected node | 选中的节点
export const selectedNode = ref(null)

// Auto-save flag | 自动保存标志
let autoSaveEnabled = false
let saveTimeout = null

// History for undo/redo | 撤销/重做历史
const history = ref([])
const historyIndex = ref(-1)
const MAX_HISTORY = 50
let isRestoring = false

/**
 * Save current state to history | 保存当前状态到历史
 */
const saveToHistory = () => {
  if (isRestoring) return
  
  const state = {
    nodes: JSON.parse(JSON.stringify(nodes.value)),
    edges: JSON.parse(JSON.stringify(edges.value))
  }
  
  // Remove future history if we're not at the end | 如果不在末尾，删除未来历史
  if (historyIndex.value < history.value.length - 1) {
    history.value = history.value.slice(0, historyIndex.value + 1)
  }
  
  // Add new state | 添加新状态
  history.value.push(state)
  
  // Limit history size | 限制历史大小
  if (history.value.length > MAX_HISTORY) {
    history.value.shift()
  } else {
    historyIndex.value++
  }
}

// Add a new node | 添加新节点
export const addNode = (type, position = { x: 100, y: 100 }, data = {}) => {
  const id = getNodeId()
  const now = Date.now()
  const newNode = {
    id,
    type,
    position,
    data: {
      ...getDefaultNodeData(type),
      ...data,
      createdAt: data.createdAt || now,
      updatedAt: data.updatedAt || now
    }
  }
  nodes.value = [...nodes.value, newNode]
  saveToHistory() // Save after adding node | 添加节点后保存
  return id
}

// Get default data for node type | 获取节点类型的默认数据
const getDefaultNodeData = (type) => {
  switch (type) {
    case 'text':
      return {
        content: '',
        label: '文本输入'
      }
    case 'imageConfig':
      return {
        prompt: '',
        model: 'gemini-2.5-flash-image',
        size: '2048x2048',
        ratio: '1:1',
        quality: '4张 | 高清',
        label: '文生图'
      }
    case 'videoConfig':
      return {
        prompt: '',
        resolution: '720P',
        dur: 5,
        model: 'doubao-seedance-1-5-pro_720p',
        label: '图生视频'
      }
    case 'video':
      return {
        url: '',
        duration: 0,
        label: '视频节点'
      }
    case 'image':
      return {
        url: '',
        label: '图片节点'
      }
    case 'textToImage':
      return {
        content: '',
        model: 'gemini-2.5-flash-image',
        n: 1,
        url: '',
        label: '文生图(组合)'
      }
    case 'textToVideo':
      return {
        content: '',
        model: 'doubao-seedance-1-5-pro_720p',
        resolution: '720P',
        dur: 5,
        referenceImageUrl: null,
        referenceImageFileName: null,
        referenceImageFileType: null,
        url: '',
        label: '文生视频(组合)'
      }
    case 'group':
      return {
        label: '组合'
      }
    default:
      return {}
  }
}

// Update node data | 更新节点数据
export const updateNode = (id, data) => {
  nodes.value = nodes.value.map(node => 
    node.id === id ? { ...node, data: { ...node.data, ...data } } : node
  )

  if (isPropagating) return

  const hasOutputImage = Boolean(data?.url) || Boolean(data?.base64)
  if (!hasOutputImage) return

  const outgoing = edges.value.filter(e => e.source === id)
  for (const edge of outgoing) {
    propagateReferenceToTarget(id, edge.target)
  }
}

// Remove node | 删除节点
export const removeNode = (id) => {
  nodes.value = nodes.value.filter(node => node.id !== id)
  edges.value = edges.value.filter(edge => edge.source !== id && edge.target !== id)
  saveToHistory() // Save after removing node | 删除节点后保存
}

// Duplicate node | 复制节点
export const duplicateNode = (id) => {
  const sourceNode = nodes.value.find(node => node.id === id)
  if (!sourceNode) return null
  
  const newId = getNodeId()
  
  // Calculate max z-index | 计算最大层级
  const maxZIndex = Math.max(0, ...nodes.value.map(n => n.zIndex || 0))
  
  const newNode = {
    id: newId,
    type: sourceNode.type,
    position: {
      x: sourceNode.position.x + 50,
      y: sourceNode.position.y + 50
    },
    data: { ...sourceNode.data },
    zIndex: maxZIndex + 1
  }
  nodes.value = [...nodes.value, newNode]
  saveToHistory() // Save after duplicating node | 复制节点后保存
  return newId
}

// Add edge | 添加边
export const addEdge = (params) => {
  const newEdge = {
    id: `edge_${params.source}_${params.target}`,
    ...params
  }
  if (!newEdge.type) newEdge.type = 'deletable'
  edges.value = [...edges.value, newEdge]
  saveToHistory() // Save after adding edge | 添加连线后保存

  propagateReferenceToTarget(params.source, params.target)
}

// Update edge data | 更新边数据
export const updateEdge = (id, data) => {
  edges.value = edges.value.map(edge => 
    edge.id === id ? { ...edge, data: { ...edge.data, ...data } } : edge
  )
  saveToHistory() // Save after updating edge | 更新连线后保存
}

// Remove edge | 删除边
export const removeEdge = (id) => {
  edges.value = edges.value.filter(edge => edge.id !== id)
  saveToHistory() // Save after removing edge | 删除连线后保存
}

// Clear canvas | 清空画布
export const clearCanvas = () => {
  nodes.value = []
  edges.value = []
  nodeId = 0
}

/**
 * Group nodes | 组合节点
 * @param {Array} nodesToGroup - Nodes to group (must include dimensions)
 */
export const groupNodes = (nodesToGroup) => {
  if (nodesToGroup.length < 2) return null

  const absById = new Map()
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  let minZIndex = Infinity

  nodesToGroup.forEach(node => {
    const absPos = node.computedPosition || node.positionAbsolute || node.position || { x: 0, y: 0 }
    const x = absPos.x
    const y = absPos.y
    const w = node.dimensions?.width || node.width || 200
    const h = node.dimensions?.height || node.height || 100
    const z = typeof node.zIndex === 'number' ? node.zIndex : 0

    absById.set(String(node.id), { x, y, w, h, z })
    
    if (x < minX) minX = x
    if (y < minY) minY = y
    if (x + w > maxX) maxX = x + w
    if (y + h > maxY) maxY = y + h
    if (z < minZIndex) minZIndex = z
  })
  
  const padding = 20
  const groupWidth = Math.max(100, maxX - minX + padding * 2)
  const groupHeight = Math.max(100, maxY - minY + padding * 2)
  const groupNodeId = getNodeId()
  const groupX = minX - padding
  const groupY = minY - padding
  const groupNode = {
    id: groupNodeId,
    type: 'group',
    position: { x: groupX, y: groupY },
    width: groupWidth,
    height: groupHeight,
    style: { 
      width: `${groupWidth}px`, 
      height: `${groupHeight}px` 
    },
    data: { label: '组合' },
    zIndex: Number.isFinite(minZIndex) ? minZIndex - 1 : -1,
    selected: true
  }
  
  // Add group node | 添加组合节点
  nodes.value = [...nodes.value, groupNode]
  
  // Update children | 更新子节点
  const nodeIds = new Set(nodesToGroup.map(n => n.id))
  nodes.value = nodes.value.map(node => {
    if (nodeIds.has(node.id)) {
      const absPos = absById.get(String(node.id)) || null
      const absX = absPos?.x ?? node.position?.x ?? 0
      const absY = absPos?.y ?? node.position?.y ?? 0
      return {
        ...node,
        parentNode: groupNodeId,
        selected: false,
        position: {
          x: absX - groupX,
          y: absY - groupY
        },
        positionAbsolute: undefined
      }
    }
    if (node.id === groupNodeId) {
      return { ...node, selected: true, positionAbsolute: undefined }
    }
    return { ...node, selected: false, positionAbsolute: undefined }
  })
  
  saveToHistory()
  return groupNodeId
}

/**
 * Ungroup nodes | 解组节点
 * @param {string} groupId - Group node ID
 */
export const ungroupNodes = (groupId) => {
  const groupNode = nodes.value.find(n => n.id === groupId)
  if (!groupNode) return

  // Update children | 更新子节点
  nodes.value = nodes.value.map(node => {
    if (node.parentNode === groupId) {
      // Calculate absolute position | 计算绝对位置
      return {
        ...node,
        parentNode: undefined,
        extent: undefined,
        selected: false,
        position: {
          x: groupNode.position.x + node.position.x,
          y: groupNode.position.y + node.position.y
        },
        positionAbsolute: undefined
      }
    }
    return { ...node, selected: false, positionAbsolute: undefined }
  })

  // Remove group node | 删除组合节点
  nodes.value = nodes.value.filter(n => n.id !== groupId)
  saveToHistory()
}

// Initialize with sample data | 使用示例数据初始化
export const initSampleData = () => {
  clearCanvas()
  
  // Add text node | 添加文本节点
  addNode('text', { x: 150, y: 150 }, {
    content: '一只金毛寻回犬在草地上奔跑，摇着尾巴，脸上带着快乐的表情。它的毛发在阳光下闪耀，眼神充满了对自由的渴望，全身散发着阳光、友善的气息。',
    label: '文本输入'
  })
  
  // Add image config node | 添加文生图配置节点
  addNode('imageConfig', { x: 450, y: 150 }, {
    prompt: '',
    model: 'gemini-2.5-flash-image',
    ratio: '16:9 | 4张 | 高清',
    label: '文生图'
  })
  
  // Add edge between nodes | 添加节点之间的边
  addEdge({
    source: 'node_0',
    target: 'node_1',
    sourceHandle: 'right',
    targetHandle: 'left'
  })
}

/**
 * Load project data | 加载项目数据
 * @param {string} projectId - Project ID | 项目ID
 */
export const loadProject = async (projectId) => {
  autoSaveEnabled = false
  isRestoring = true
  currentProjectId.value = projectId
  
  const canvasData = await getProjectCanvas(projectId)
  
  if (canvasData) {
    // Restore nodes | 恢复节点
    nodes.value = canvasData.nodes || []
    edges.value = (canvasData.edges || []).map(edge => ({
      ...edge,
      type: edge?.type || 'deletable'
    }))
    canvasViewport.value = canvasData.viewport || { x: 100, y: 50, zoom: 0.8 }
    
    // Update node ID counter | 更新节点ID计数器
    const maxId = nodes.value.reduce((max, node) => {
      const match = node.id.match(/node_(\d+)/)
      if (match) {
        return Math.max(max, parseInt(match[1], 10))
      }
      return max
    }, -1)
    nodeId = maxId + 1
  } else {
    // Empty project | 空项目
    clearCanvas()
  }
  
  // Initialize history with current state | 用当前状态初始化历史
  history.value = [{
    nodes: JSON.parse(JSON.stringify(nodes.value)),
    edges: JSON.parse(JSON.stringify(edges.value))
  }]
  historyIndex.value = 0
  
  // Enable auto-save after loading | 加载后启用自动保存
  setTimeout(() => {
    autoSaveEnabled = true
    isRestoring = false
  }, 100)
}

/**
 * Save current project | 保存当前项目
 */
export const saveProject = async () => {
  if (!currentProjectId.value) return
  await updateProjectCanvas(currentProjectId.value, {
    nodes: nodes.value,
    edges: edges.value,
    viewport: canvasViewport.value
  })
}

/**
 * Debounced auto-save | 防抖动自动保存
 */
const debouncedSave = () => {
  if (!autoSaveEnabled || !currentProjectId.value) return
  
  if (saveTimeout) {
    clearTimeout(saveTimeout)
  }
  
  saveTimeout = setTimeout(() => {
    saveProject()
  }, 500)
}

/**
 * Update viewport and save | 更新视口并保存
 */
export const updateViewport = (viewport) => {
  canvasViewport.value = viewport
  debouncedSave()
}

/**
 * Undo last action | 撤销上一步操作
 */
export const undo = () => {
  if (historyIndex.value <= 0) {
    window.$message?.info('没有可撤销的操作')
    return false
  }
  
  historyIndex.value--
  restoreState(history.value[historyIndex.value])
  return true
}

/**
 * Redo last undone action | 重做上一步撤销的操作
 */
export const redo = () => {
  if (historyIndex.value >= history.value.length - 1) {
    window.$message?.info('没有可重做的操作')
    return false
  }
  
  historyIndex.value++
  restoreState(history.value[historyIndex.value])
  return true
}

/**
 * Restore state from history | 从历史恢复状态
 */
const restoreState = (state) => {
  isRestoring = true
  nodes.value = JSON.parse(JSON.stringify(state.nodes))
  edges.value = JSON.parse(JSON.stringify(state.edges))
  setTimeout(() => {
    isRestoring = false
  }, 100)
}

/**
 * Check if can undo | 检查是否可以撤销
 */
export const canUndo = () => historyIndex.value > 0

/**
 * Check if can redo | 检查是否可以重做
 */
export const canRedo = () => historyIndex.value < history.value.length - 1

/**
 * Manually save current state to history | 手动保存当前状态到历史
 * Used for edge deletions and other operations not covered by automatic saves
 */
export const manualSaveHistory = () => {
  saveToHistory()
}

// Watch for changes and auto-save (only save to project, not history) | 监听变化并自动保存（仅保存项目，不保存历史）
watch([nodes, edges], () => {
  debouncedSave()
}, { deep: true })
