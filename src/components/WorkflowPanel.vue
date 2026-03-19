<template>
  <!-- Workflow panel | 工作流浮动面板 -->
  <Transition name="panel-slide">
    <div v-if="visible" class="workflow-panel" v-click-outside="handleClickOutside">
      <!-- Header | 头部 -->
      <div class="panel-header">
        <div class="panel-tabs">
          <span 
            class="tab-item" 
            :class="{ active: activeTab === 'public' }"
            @click="activeTab = 'public'"
          >公共工作流</span>
          <span 
            class="tab-item" 
            :class="{ active: activeTab === 'my' }"
            @click="activeTab = 'my'"
          >我的工作流</span>
        </div>
        <button class="expand-btn" @click="visible = false">
          <n-icon :size="16"><CloseOutline /></n-icon>
        </button>
      </div>
      
      <!-- Content | 内容 -->
      <div class="panel-content">
        <!-- Public workflows | 公共工作流 -->
        <div v-if="activeTab === 'public'" class="workflow-grid">
          <div 
            v-for="workflow in publicWorkflows" 
            :key="workflow.id"
            class="workflow-card"
            @click="handleAddWorkflow(workflow)"
          >
            <div class="card-cover">
              <img v-if="workflow.cover" :src="workflow.cover" :alt="workflow.name" class="cover-img" />
              <n-icon v-else :size="36" class="cover-icon">
                <component :is="getIcon(workflow.icon)" />
              </n-icon>
            </div>
            <div class="card-title">{{ workflow.name }}</div>
          </div>
        </div>
        
        <!-- My workflows | 我的工作流 -->
        <div v-else>
          <div v-if="myWorkflowTemplates.length > 0" class="workflow-grid">
            <div
              v-for="workflow in myWorkflowTemplates"
              :key="workflow.id"
              class="workflow-card"
              @click="handleAddWorkflow(workflow)"
            >
              <div class="card-cover">
                <img v-if="workflow.cover" :src="workflow.cover" :alt="workflow.name" class="cover-img" />
                <n-icon v-else :size="36" class="cover-icon">
                  <FolderOpenOutline />
                </n-icon>
                <div
                  v-if="workflow.publishStatus"
                  class="my-workflow-status-badge"
                  :class="getPublishBadgeClass(workflow.publishStatus)"
                >{{ getPublishStatusLabel(workflow.publishStatus) }}</div>
                <div class="my-workflow-mask"></div>
                <div class="my-workflow-action-row">
                  <button
                    class="my-workflow-action-btn"
                    :disabled="isPublishActionDisabled(workflow)"
                    @click.stop="openPublishModal(workflow)"
                    :title="getPublishActionTitle(workflow)"
                  >
                    <n-icon :size="22"><CloudUploadOutline /></n-icon>
                  </button>
                  <button class="my-workflow-action-btn danger" @click.stop="openDeleteConfirm(workflow)" title="删除">
                    <n-icon :size="22"><TrashOutline /></n-icon>
                  </button>
                </div>
              </div>
              <div class="card-title">{{ workflow.name }}</div>
            </div>
          </div>
          <div v-else class="empty-state">
            <n-icon :size="36" class="text-gray-500">
              <FolderOpenOutline />
            </n-icon>
            <p class="text-gray-500 text-sm mt-2">暂无自定义工作流</p>
          </div>
        </div>
      </div>
    </div>
  </Transition>

  <n-modal v-model:show="showDeleteModal" preset="dialog" title="删除工作流" type="warning">
    <p>确定要删除工作流「{{ pendingDeleteWorkflow?.name || '未命名' }}」吗？此操作不可恢复。</p>
    <template #action>
      <n-button :disabled="isDeleting" @click="showDeleteModal = false">取消</n-button>
      <n-button type="error" :loading="isDeleting" @click="confirmDeleteWorkflow">删除</n-button>
    </template>
  </n-modal>

  <n-modal v-model:show="showPublishModal" preset="dialog" :title="publishDialogTitle">
    <div class="flex gap-4">
      <div class="w-[96px]">
        <div
          class="w-[96px] h-[96px] rounded-xl border border-dashed border-[var(--border-color)] bg-[var(--bg-tertiary)]/40 overflow-hidden cursor-pointer flex items-center justify-center relative"
          @click="triggerPublishCoverSelect"
        >
          <img v-if="publishCoverPreview" :src="publishCoverPreview" class="w-full h-full object-cover" />
          <div v-else class="flex flex-col items-center gap-2 text-[var(--text-secondary)]">
            <n-icon :size="22"><ImageOutline /></n-icon>
            <span class="text-xs">上传图片</span>
          </div>
          <button
            v-if="publishCoverPreview"
            class="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60 transition-colors"
            @click.stop="clearPublishCover"
            title="移除"
          >
            <n-icon :size="14"><CloseOutline /></n-icon>
          </button>
        </div>
        <input
          ref="publishCoverInputRef"
          type="file"
          accept="image/*"
          class="hidden"
          @change="handlePublishCoverFileChange"
        />
      </div>

      <div class="flex-1 flex flex-col gap-3">
        <div v-if="publishRejectReason" class="text-xs text-[#ef4444]">
          驳回原因：{{ publishRejectReason }}
        </div>
        <div class="flex flex-col gap-1">
          <div class="text-sm font-medium text-[var(--text-primary)]">名称</div>
          <n-input v-model:value="publishName" placeholder="请输入工作流名称" />
        </div>

        <div class="flex flex-col gap-2">
          <div class="flex items-center justify-between">
            <div class="text-sm font-medium text-[var(--text-primary)]">标签</div>
            <div class="text-xs text-[var(--text-secondary)]">{{ publishTags.length }}/5</div>
          </div>
          <div class="flex items-center gap-2">
            <n-input v-model:value="publishTagInput" placeholder="输入标签后回车" size="small" @keyup.enter="addPublishTag" />
            <n-button size="small" @click="addPublishTag">+ 标签</n-button>
          </div>
          <div v-if="publishTags.length > 0" class="flex flex-wrap gap-2">
            <span
              v-for="(tag, idx) in publishTags"
              :key="tag + '_' + idx"
              class="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-[var(--bg-tertiary)] text-xs text-[var(--text-secondary)]"
            >
              <span class="max-w-[120px] truncate">{{ tag }}</span>
              <button
                class="w-4 h-4 rounded-full flex items-center justify-center hover:bg-[var(--border-color)] transition-colors"
                @click="removePublishTag(idx)"
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
            v-model:value="publishRemark"
            type="textarea"
            placeholder="请描述您的工作流，例如应用场景、使用步骤以及实用技巧"
            :autosize="{ minRows: 3, maxRows: 4 }"
          />
        </div>
      </div>
    </div>

    <template #action>
      <n-button :disabled="isPublishing" @click="showPublishModal = false">取消</n-button>
      <n-button type="primary" :loading="isPublishing" :disabled="!publishName.trim()" @click="submitPublishRequest">提交审核</n-button>
    </template>
  </n-modal>
</template>

<script setup>
/**
 * Workflow Panel Component | 工作流面板组件
 * 显示工作流模板列表，支持一键添加到画布
 */
import { computed, onMounted, ref } from 'vue'
import { NButton, NIcon, NInput, NModal } from 'naive-ui'
import { 
  CloseOutline,
  GridOutline, 
  ImageOutline, 
  VideocamOutline,
  FolderOpenOutline,
  TrashOutline,
  CloudUploadOutline
} from '@vicons/ionicons5'
import { WORKFLOW_TEMPLATES } from '../config/workflows'
import { myWorkflows, removeMyWorkflow } from '@/stores/workflows'
import { promptFlowPublishSubmit, promptFlowPublicPage } from '@/api/flow'

const props = defineProps({
  show: Boolean
})

const emit = defineEmits(['update:show', 'add-workflow'])

// Active tab | 当前标签
const activeTab = ref('public')

// Visible state | 显示状态
const visible = computed({
  get: () => props.show,
  set: (val) => emit('update:show', val)
})

// Public workflows | 公共工作流
const publicWorkflowList = ref([])
const publicWorkflowsLoading = ref(false)

const loadPublicWorkflows = async () => {
  try {
    publicWorkflowsLoading.value = true
    const res = await promptFlowPublicPage({ pageNo: 1, pageSize: 200 })
    const list = Array.isArray(res?.list) ? res.list : []
    publicWorkflowList.value = list.map(w => {
      const nodes = Array.isArray(w.nodes) ? w.nodes : []
      const edges = Array.isArray(w.edges) ? w.edges : []
      const tempIds = nodes.map((_, idx) => `pub_${w.id}_${idx}`)
      return {
        ...w,
        id: w.id == null ? '' : String(w.id),
        createNodes: (startPosition) => {
          const newNodes = nodes.map((n, idx) => ({
            id: tempIds[idx],
            type: n.type,
            position: {
              x: (startPosition?.x || 0) + (n.position?.x || 0),
              y: (startPosition?.y || 0) + (n.position?.y || 0)
            },
            data: n.data || {}
          }))
          const newEdges = edges
            .filter(e => Number.isInteger(e.sourceIndex) && Number.isInteger(e.targetIndex))
            .map((e, idx) => ({
              id: `edge_${tempIds[e.sourceIndex]}_${tempIds[e.targetIndex]}_${idx}`,
              source: tempIds[e.sourceIndex],
              target: tempIds[e.targetIndex],
              sourceHandle: e.sourceHandle || 'right',
              targetHandle: e.targetHandle || 'left',
              type: e.type,
              data: e.data
            }))
          return { nodes: newNodes, edges: newEdges }
        }
      }
    })
  } catch (err) {
    publicWorkflowList.value = []
  } finally {
    publicWorkflowsLoading.value = false
  }
}

// Fallback to templates if API returns empty | API 为空时回退到本地模板
const publicWorkflows = computed(() => {
  return publicWorkflowList.value.length > 0 ? publicWorkflowList.value : WORKFLOW_TEMPLATES
})

onMounted(() => {
  loadPublicWorkflows()
})

const myWorkflowTemplates = computed(() => {
  const workflows = myWorkflows.value || []
  return workflows.map(workflow => {
    const nodes = Array.isArray(workflow.nodes) ? workflow.nodes : []
    const edges = Array.isArray(workflow.edges) ? workflow.edges : []
    const tempIds = nodes.map((_, idx) => `mywf_${workflow.id}_${idx}`)

    return {
      ...workflow,
      createNodes: (startPosition) => {
        const newNodes = nodes.map((n, idx) => ({
          id: tempIds[idx],
          type: n.type,
          position: {
            x: (startPosition?.x || 0) + (n.position?.x || 0),
            y: (startPosition?.y || 0) + (n.position?.y || 0)
          },
          data: n.data || {}
        }))

        const newEdges = edges
          .filter(e => Number.isInteger(e.sourceIndex) && Number.isInteger(e.targetIndex))
          .map((e, idx) => ({
            id: `edge_${tempIds[e.sourceIndex]}_${tempIds[e.targetIndex]}_${idx}`,
            source: tempIds[e.sourceIndex],
            target: tempIds[e.targetIndex],
            sourceHandle: e.sourceHandle || 'right',
            targetHandle: e.targetHandle || 'left',
            type: e.type,
            data: e.data
          }))

        return { nodes: newNodes, edges: newEdges }
      }
    }
  })
})

// Icon mapping | 图标映射
const iconMap = {
  GridOutline,
  ImageOutline,
  VideocamOutline
}

const getIcon = (iconName) => {
  return iconMap[iconName] || GridOutline
}

// Handle add workflow | 处理添加工作流
const handleAddWorkflow = (workflow) => {
  // 直接添加工作流，节点内容由用户自己填写
  emit('add-workflow', { workflow, options: {} })
  visible.value = false
}

const showDeleteModal = ref(false)
const pendingDeleteWorkflow = ref(null)
const isDeleting = ref(false)

const showPublishModal = ref(false)
const pendingPublishWorkflow = ref(null)
const isPublishing = ref(false)
const publishName = ref('')
const publishTagInput = ref('')
const publishTags = ref([])
const publishRemark = ref('')
const publishCoverInputRef = ref(null)
const publishCoverPreview = ref('')
const publishRejectReason = ref('')

const publishDialogTitle = computed(() => {
  if (!pendingPublishWorkflow.value) return '发布为公共工作流'
  return '发布为公共工作流'
})

const openDeleteConfirm = (workflow) => {
  pendingDeleteWorkflow.value = workflow || null
  showDeleteModal.value = true
}

const getPublishStatusLabel = (status) => {
  const s = String(status || '').toUpperCase()
  if (s === 'PENDING') return '待审核'
  if (s === 'APPROVED') return '已通过'
  if (s === 'REJECTED') return '已驳回'
  return ''
}

const getPublishBadgeClass = (status) => {
  const s = String(status || '').toUpperCase()
  if (s === 'PENDING') return 'pending'
  if (s === 'APPROVED') return 'approved'
  if (s === 'REJECTED') return 'rejected'
  return ''
}

const isPublishActionDisabled = (workflow) => {
  const s = String(workflow?.publishStatus || '').toUpperCase()
  return s === 'PENDING' || s === 'APPROVED'
}

const getPublishActionTitle = (workflow) => {
  const s = String(workflow?.publishStatus || '').toUpperCase()
  if (s === 'PENDING') return '审核中'
  if (s === 'APPROVED') return '已通过'
  if (s === 'REJECTED') return '重新提交'
  return '发布'
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

const triggerPublishCoverSelect = () => {
  publishCoverInputRef.value?.click?.()
}

const clearPublishCover = () => {
  publishCoverPreview.value = ''
  if (publishCoverInputRef.value) publishCoverInputRef.value.value = ''
}

const handlePublishCoverFileChange = async (e) => {
  const file = e?.target?.files?.[0]
  if (!file) return
  try {
    const dataUrl = await fileToDataUrl(file)
    publishCoverPreview.value = await resizeCover(dataUrl)
  } catch (err) {
    window.$message?.error('读取图片失败')
  }
}

const addPublishTag = () => {
  const t = String(publishTagInput.value || '').trim()
  if (!t) return
  if (publishTags.value.length >= 5) {
    window.$message?.warning('最多 5 个标签')
    return
  }
  if (publishTags.value.includes(t)) {
    publishTagInput.value = ''
    return
  }
  publishTags.value = [...publishTags.value, t]
  publishTagInput.value = ''
}

const removePublishTag = (idx) => {
  publishTags.value = publishTags.value.filter((_, i) => i !== idx)
}

const openPublishModal = (workflow) => {
  if (!workflow?.id) return
  if (isPublishActionDisabled(workflow)) {
    const s = String(workflow?.publishStatus || '').toUpperCase()
    if (s === 'PENDING') window.$message?.info('审核中')
    if (s === 'APPROVED') window.$message?.info('已通过')
    return
  }
  pendingPublishWorkflow.value = workflow
  publishName.value = workflow.name || '工作流'
  publishTags.value = Array.isArray(workflow.tags) ? [...workflow.tags] : []
  publishRemark.value = workflow.remark || ''
  publishCoverPreview.value = workflow.cover || ''
  publishTagInput.value = ''
  publishRejectReason.value = String(workflow.publishStatus || '').toUpperCase() === 'REJECTED' ? (workflow.publishReviewComment || '') : ''
  showPublishModal.value = true
}

const submitPublishRequest = async () => {
  const workflow = pendingPublishWorkflow.value
  const name = String(publishName.value || '').trim()
  if (!workflow?.id || !name) return

  try {
    isPublishing.value = true
    await promptFlowPublishSubmit({
      flowId: String(workflow.id),
      name,
      cover: publishCoverPreview.value || '',
      tags: [...(publishTags.value || [])],
      remark: String(publishRemark.value || '')
    })

    const list = myWorkflows.value || []
    const idx = list.findIndex(w => String(w.id) === String(workflow.id))
    if (idx !== -1) {
      const next = [...list]
      next[idx] = {
        ...next[idx],
        name,
        tags: [...(publishTags.value || [])],
        remark: String(publishRemark.value || ''),
        cover: publishCoverPreview.value || '',
        publishStatus: 'PENDING',
        publishReviewComment: ''
      }
      myWorkflows.value = next
    }

    showPublishModal.value = false
    window.$message?.success('已提交审核')
  } catch (err) {
  } finally {
    isPublishing.value = false
  }
}

const confirmDeleteWorkflow = async () => {
  const workflow = pendingDeleteWorkflow.value
  if (!workflow?.id) {
    showDeleteModal.value = false
    pendingDeleteWorkflow.value = null
    return
  }

  try {
    isDeleting.value = true
    await removeMyWorkflow(workflow.id)
    window.$message?.success('已删除工作流')
    showDeleteModal.value = false
    pendingDeleteWorkflow.value = null
  } catch (err) {
    window.$message?.error(err?.message || '删除失败')
  } finally {
    isDeleting.value = false
  }
}

// Handle click outside | 点击外部关闭
const handleClickOutside = () => {
  visible.value = false
}

// Custom directive | 自定义指令
const vClickOutside = {
  mounted(el, binding) {
    el._clickOutside = (e) => {
      if (!el.contains(e.target)) {
        binding.value()
      }
    }
    setTimeout(() => {
      document.addEventListener('click', el._clickOutside)
    }, 0)
  },
  unmounted(el) {
    document.removeEventListener('click', el._clickOutside)
  }
}
</script>

<style scoped>
/* Panel container | 面板容器 */
.workflow-panel {
  position: fixed;
  left: 72px;
  top: 100px;
  width: 520px;
  max-height: 70vh;
  background: var(--bg-secondary);
  backdrop-filter: blur(12px);
  border-radius: 16px;
  border: 1px solid var(--border-color);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
  z-index: 100;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

:global(.dark) .workflow-panel {
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
}

/* Header | 头部 */
.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px 12px;
  border-bottom: 1px solid var(--border-color);
}

.panel-tabs {
  display: flex;
  gap: 24px;
}

.tab-item {
  font-size: 15px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: color 0.2s;
  padding-bottom: 4px;
}

.tab-item:hover {
  color: var(--text-primary);
}

.tab-item.active {
  color: var(--text-primary);
  font-weight: 500;
}

.expand-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-tertiary);
  border: none;
  border-radius: 6px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
}

.expand-btn:hover {
  background: var(--border-color);
  color: var(--text-primary);
}

/* Content | 内容区 */
.panel-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

/* Workflow grid | 工作流网格 */
.workflow-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

/* Workflow card | 工作流卡片 */
.workflow-card {
  cursor: pointer;
  transition: transform 0.2s;
}

.workflow-card:hover {
  transform: translateY(-2px);
}

.workflow-card:hover .card-cover {
  border-color: var(--accent-color);
}

.card-cover {
  aspect-ratio: 1;
  border-radius: 12px;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  transition: border-color 0.2s;
  overflow: hidden;
}

.my-workflow-mask {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  opacity: 0;
  transition: opacity 0.15s ease;
  pointer-events: none;
}

.my-workflow-action-row {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  gap: 12px;
  opacity: 0;
  transition: opacity 0.15s ease;
}

.my-workflow-action-btn {
  width: 44px;
  height: 44px;
  border-radius: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.95);
  transition: color 0.15s ease, opacity 0.15s ease;
  cursor: pointer;
}

.my-workflow-action-btn:hover {
  color: var(--accent-color);
}

.my-workflow-action-btn.danger:hover {
  color: #ef4444;
}

.my-workflow-action-btn:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.workflow-card:hover .my-workflow-mask,
.workflow-card:hover .my-workflow-action-row {
  opacity: 1;
}

.my-workflow-status-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 2;
  padding: 4px 8px;
  border-radius: 999px;
  font-size: 12px;
  line-height: 1;
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.25);
}

.my-workflow-status-badge.pending {
  background: rgba(245, 158, 11, 0.75);
  color: rgba(255, 255, 255, 0.95);
}

.my-workflow-status-badge.approved {
  background: rgba(34, 197, 94, 0.75);
  color: rgba(255, 255, 255, 0.95);
}

.my-workflow-status-badge.rejected {
  background: rgba(239, 68, 68, 0.75);
  color: rgba(255, 255, 255, 0.95);
}

.cover-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cover-icon {
  color: var(--text-secondary);
}

.card-title {
  margin-top: 10px;
  font-size: 13px;
  color: var(--text-primary);
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Empty state | 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 24px;
  text-align: center;
  color: var(--text-secondary);
}

/* Transition | 过渡动画 */
.panel-slide-enter-active,
.panel-slide-leave-active {
  transition: all 0.25s ease;
}

.panel-slide-enter-from,
.panel-slide-leave-to {
  opacity: 0;
  transform: translateX(-12px);
}

/* Scrollbar | 滚动条 */
.panel-content::-webkit-scrollbar {
  width: 6px;
}

.panel-content::-webkit-scrollbar-track {
  background: transparent;
}

.panel-content::-webkit-scrollbar-thumb {
  background: var(--border-color);
  border-radius: 3px;
}

.panel-content::-webkit-scrollbar-thumb:hover {
  background: var(--text-secondary);
}
</style>
