<template>
  <div 
    class="group-node-container relative w-full h-full rounded-lg border border-[var(--xy-selection-background-color,rgba(0,89,220,0.08))]"
    :style="{ backgroundColor: 'var(--xy-selection-background-color, rgba(0, 89, 220, 0.08))' }"
    @mouseenter="showUngroup = true"
    @mouseleave="showUngroup = false"
  >
    <!-- Ungroup Button | 解组按钮 -->
    <div 
      v-if="showUngroup"
      class="absolute -top-12 left-1/2 -translate-x-1/2 z-50 pt-2 pb-2 px-4 cursor-pointer"
      @mouseenter="showUngroup = true"
    >
      <div class="flex items-center gap-2">
        <button 
          @click.stop="handleUngroup"
          class="flex items-center gap-2 bg-[var(--bg-secondary)]/90 backdrop-blur-md rounded-full px-4 py-2 border border-[var(--border-color)] shadow-lg text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors whitespace-nowrap"
        >
          <n-icon :size="16"><UnlinkOutline /></n-icon>
          <span>解组</span>
        </button>
        <button
          @click.stop="openCreateWorkflowModal"
          class="flex items-center gap-2 bg-[var(--bg-secondary)]/90 backdrop-blur-md rounded-full px-4 py-2 border border-[var(--border-color)] shadow-lg text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors whitespace-nowrap"
        >
          <n-icon :size="16"><CreateOutline /></n-icon>
          <span>{{ isEditingExisting ? '更新工作流' : '创建工作流' }}</span>
        </button>
      </div>
    </div>
    
    <!-- Content slot (though children are rendered independently by Vue Flow) -->
    <slot></slot>
  </div>

  <n-modal v-model:show="showCreateWorkflowModal" preset="dialog" :title="isEditingExisting ? '更新工作流' : '创建工作流'">
    <div class="flex gap-4">
      <div class="w-[96px]">
        <div
          class="w-[96px] h-[96px] rounded-xl border border-dashed border-[var(--border-color)] bg-[var(--bg-tertiary)]/40 overflow-hidden cursor-pointer flex items-center justify-center relative"
          @click="triggerCoverSelect"
        >
          <img v-if="coverPreview" :src="coverPreview" class="w-full h-full object-cover" />
          <div v-else class="flex flex-col items-center gap-2 text-[var(--text-secondary)]">
            <n-icon :size="22"><ImageOutline /></n-icon>
            <span class="text-xs">上传图片</span>
          </div>
          <button
            v-if="coverPreview"
            class="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60 transition-colors"
            @click.stop="clearCover"
            title="移除"
          >
            <n-icon :size="14"><CloseOutline /></n-icon>
          </button>
        </div>
        <input
          ref="coverInputRef"
          type="file"
          accept="image/*"
          class="hidden"
          @change="handleCoverFileChange"
        />
      </div>

      <div class="flex-1 flex flex-col gap-3">
        <div class="flex flex-col gap-1">
          <div class="text-sm font-medium text-[var(--text-primary)]">名称</div>
          <n-input v-model:value="workflowName" placeholder="请输入工作流名称" />
        </div>

        <div class="flex flex-col gap-2">
          <div class="flex items-center justify-between">
            <div class="text-sm font-medium text-[var(--text-primary)]">标签</div>
            <div class="text-xs text-[var(--text-secondary)]">{{ tags.length }}/5</div>
          </div>
          <div class="flex items-center gap-2">
            <n-input v-model:value="tagInput" placeholder="输入标签后回车" size="small" @keyup.enter="addTag" />
            <n-button size="small" @click="addTag">+ 标签</n-button>
          </div>
          <div v-if="tags.length > 0" class="flex flex-wrap gap-2">
            <span
              v-for="(tag, idx) in tags"
              :key="tag + '_' + idx"
              class="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-[var(--bg-tertiary)] text-xs text-[var(--text-secondary)]"
            >
              <span class="max-w-[120px] truncate">{{ tag }}</span>
              <button
                class="w-4 h-4 rounded-full flex items-center justify-center hover:bg-[var(--border-color)] transition-colors"
                @click="removeTag(idx)"
                title="移除"
              >
                <n-icon :size="12"><CloseOutline /></n-icon>
              </button>
            </span>
          </div>
        </div>

        <div class="flex flex-col gap-1">
          <div class="text-sm font-medium text-[var(--text-primary)]">备注</div>
          <n-input
            v-model:value="remark"
            type="textarea"
            placeholder="请描述您的工作流，例如应用场景、使用步骤以及实用技巧"
            :autosize="{ minRows: 3, maxRows: 4 }"
          />
        </div>
      </div>
    </div>

    <template #action>
      <n-button @click="showCreateWorkflowModal = false">取消</n-button>
      <n-button type="primary" :disabled="!workflowName.trim()" @click="handleSaveWorkflow">{{ isEditingExisting ? '更新' : '保存' }}</n-button>
    </template>
  </n-modal>
</template>

<script setup>
import { computed, ref } from 'vue'
import { NButton, NIcon, NInput, NModal } from 'naive-ui'
import { CloseOutline, CreateOutline, ImageOutline, UnlinkOutline } from '@vicons/ionicons5'
import { myWorkflows, upsertMyWorkflow } from '@/stores/workflows'
import { edges, nodes, ungroupNodes, updateNode } from '@/stores/canvas'

const props = defineProps({
  id: {
    type: String,
    required: true
  },
  data: {
    type: Object,
    default: () => ({})
  }
})

const showUngroup = ref(false)

const showCreateWorkflowModal = ref(false)
const workflowName = ref('工作流')
const tagInput = ref('')
const tags = ref([])
const remark = ref('')
const coverInputRef = ref(null)
const coverPreview = ref('')

const groupNode = computed(() => (nodes.value || []).find(n => n.id === props.id))
const groupWorkflowId = computed(() => props.data?.workflowId || groupNode.value?.data?.workflowId || '')
const existingWorkflow = computed(() => (myWorkflows.value || []).find(w => w.id === groupWorkflowId.value) || null)
const editingWorkflowId = computed(() => existingWorkflow.value?.id || groupWorkflowId.value || '')
const isEditingExisting = computed(() => Boolean(editingWorkflowId.value))
const groupRect = computed(() => {
  const g = groupNode.value
  if (!g) return null
  const w = Number(g.width) || Number(String(g.style?.width || '').replace('px', '')) || 0
  const h = Number(g.height) || Number(String(g.style?.height || '').replace('px', '')) || 0
  return {
    x: Number(g.position?.x) || 0,
    y: Number(g.position?.y) || 0,
    w,
    h
  }
})

const isInsideRect = (x, y, rect, margin = 0) => {
  if (!rect) return false
  return (
    x >= rect.x + margin &&
    y >= rect.y + margin &&
    x <= rect.x + rect.w - margin &&
    y <= rect.y + rect.h - margin
  )
}

const nodesInGroup = computed(() => {
  const rect = groupRect.value
  const list = nodes.value || []
  if (!rect || !rect.w || !rect.h) {
    return list.filter(n => n.parentNode === props.id)
  }

  return list.filter(n => {
    if (n.id === props.id) return false
    if (n.parentNode && n.parentNode !== props.id) return false

    const absX = n.parentNode === props.id ? rect.x + (n.position?.x || 0) : (n.position?.x || 0)
    const absY = n.parentNode === props.id ? rect.y + (n.position?.y || 0) : (n.position?.y || 0)

    if (n.parentNode === props.id) return true
    return isInsideRect(absX, absY, rect, 2)
  })
})

const internalEdges = computed(() => {
  const ids = new Set((nodesInGroup.value || []).map(n => n.id))
  return (edges.value || []).filter(e => ids.has(e.source) && ids.has(e.target))
})

const handleUngroup = () => {
  ungroupNodes(props.id)
}

const isLikelyImageUrl = (url) => {
  if (!url || typeof url !== 'string') return false
  if (url.startsWith('data:image/')) return true
  return /\.(png|jpe?g|webp|gif|bmp|svg)(\?|#|$)/i.test(url)
}

const pickDefaultCover = () => {
  const list = [...(nodesInGroup.value || [])]
  list.sort((a, b) => {
    const ca = a?.data?.createdAt || 0
    const cb = b?.data?.createdAt || 0
    if (ca !== cb) return ca - cb
    const na = Number(String(a?.id || '').match(/(\d+)/)?.[1] || 0)
    const nb = Number(String(b?.id || '').match(/(\d+)/)?.[1] || 0)
    return na - nb
  })
  for (let i = list.length - 1; i >= 0; i--) {
    const url = list[i]?.data?.url
    if (isLikelyImageUrl(url)) return url
  }
  for (let i = list.length - 1; i >= 0; i--) {
    const base64 = list[i]?.data?.base64
    if (isLikelyImageUrl(base64)) return base64
  }
  return ''
}

const openCreateWorkflowModal = () => {
  const wf = existingWorkflow.value
  if (wf) {
    workflowName.value = wf.name || '工作流'
    tags.value = Array.isArray(wf.tags) ? [...wf.tags] : []
    remark.value = wf.remark || ''
    coverPreview.value = wf.cover || ''
  }
  if (!workflowName.value) workflowName.value = '工作流'
  if (!coverPreview.value) coverPreview.value = pickDefaultCover()
  tagInput.value = ''
  showCreateWorkflowModal.value = true
}

const triggerCoverSelect = () => {
  coverInputRef.value?.click?.()
}

const clearCover = () => {
  coverPreview.value = ''
  if (coverInputRef.value) coverInputRef.value.value = ''
}

const fileToDataUrl = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader()
  reader.onload = () => resolve(reader.result)
  reader.onerror = reject
  reader.readAsDataURL(file)
})

const resizeCover = (dataUrl, maxSize = 256, quality = 0.88) => new Promise((resolve) => {
  const img = new Image()
  img.onload = () => {
    const w = img.width || 1
    const h = img.height || 1
    const scale = Math.min(1, maxSize / Math.max(w, h))
    const cw = Math.max(1, Math.round(w * scale))
    const ch = Math.max(1, Math.round(h * scale))
    const canvas = document.createElement('canvas')
    canvas.width = cw
    canvas.height = ch
    const ctx = canvas.getContext('2d')
    ctx?.drawImage(img, 0, 0, cw, ch)
    resolve(canvas.toDataURL('image/jpeg', quality))
  }
  img.onerror = () => resolve(dataUrl)
  img.src = dataUrl
})

const handleCoverFileChange = async (e) => {
  const file = e?.target?.files?.[0]
  if (!file) return
  try {
    const dataUrl = await fileToDataUrl(file)
    coverPreview.value = await resizeCover(dataUrl)
  } catch (err) {
    window.$message?.error('读取图片失败')
  }
}

const addTag = () => {
  const t = String(tagInput.value || '').trim()
  if (!t) return
  if (tags.value.length >= 5) {
    window.$message?.warning('最多 5 个标签')
    return
  }
  if (tags.value.includes(t)) {
    tagInput.value = ''
    return
  }
  tags.value = [...tags.value, t]
  tagInput.value = ''
}

const removeTag = (idx) => {
  tags.value = tags.value.filter((_, i) => i !== idx)
}

const exportGroupWorkflow = () => {
  const g = groupNode.value
  const rect = groupRect.value
  const groupX = rect?.x || g?.position?.x || 0
  const groupY = rect?.y || g?.position?.y || 0
  const children = nodesInGroup.value || []

  const abs = children.map(n => {
    const x = n.parentNode === props.id ? groupX + (n.position?.x || 0) : (n.position?.x || 0)
    const y = n.parentNode === props.id ? groupY + (n.position?.y || 0) : (n.position?.y || 0)
    return {
      id: n.id,
      type: n.type,
      x,
      y,
      data: n.data || {}
    }
  })

  if (abs.length === 0) return { nodes: [], edges: [] }

  const minX = Math.min(...abs.map(n => n.x))
  const minY = Math.min(...abs.map(n => n.y))

  const exportedNodes = abs.map(n => ({
    type: n.type,
    position: { x: n.x - minX, y: n.y - minY },
    data: JSON.parse(JSON.stringify(n.data || {}))
  }))

  const idToIndex = new Map(abs.map((n, idx) => [n.id, idx]))
  const exportedEdges = (internalEdges.value || []).map(e => ({
    sourceIndex: idToIndex.get(e.source),
    targetIndex: idToIndex.get(e.target),
    sourceHandle: e.sourceHandle,
    targetHandle: e.targetHandle,
    type: e.type,
    data: e.data ? JSON.parse(JSON.stringify(e.data)) : undefined
  })).filter(e => Number.isInteger(e.sourceIndex) && Number.isInteger(e.targetIndex))

  return { nodes: exportedNodes, edges: exportedEdges }
}

const handleSaveWorkflow = () => {
  const name = String(workflowName.value || '').trim()
  if (!name) return

  const content = exportGroupWorkflow()
  if (!content.nodes || content.nodes.length === 0) {
    window.$message?.warning('当前组合没有可保存的节点')
    return
  }

  const isEditing = Boolean(editingWorkflowId.value)
  const payload = {
    ...(isEditing ? { id: String(editingWorkflowId.value) } : {}),
    name,
    tags: [...(tags.value || [])],
    remark: String(remark.value || ''),
    cover: coverPreview.value || '',
    nodes: content.nodes,
    edges: content.edges
  }

  Promise.resolve()
    .then(() => upsertMyWorkflow(payload))
    .then((saved) => {
      const savedId = saved?.id ? String(saved.id) : (payload.id || '')
      if (savedId) updateNode(props.id, { workflowId: savedId, label: name })
      showCreateWorkflowModal.value = false
      window.$message?.success(isEditing ? '工作流已更新' : '工作流已保存')
    })
    .catch(() => {})
}
</script>

<style scoped>
.group-node-container {
  /* Ensure it captures mouse events for dragging */
  pointer-events: all;
  min-width: 100px;
  min-height: 100px;
}
</style>
