<template>
  <!-- Review Page | 审核详情展示页面 -->
  <div class="review-page" :class="{ dark: isDark }">
    <!-- Loading state | 加载中 -->
    <div v-if="loading" class="review-center">
      <n-spin size="large" />
      <p class="mt-4 text-[var(--text-secondary)]">加载审核详情...</p>
    </div>

    <!-- Not found state | 未找到 -->
    <div v-else-if="!detail" class="review-center">
      <n-icon :size="48" class="text-[var(--text-secondary)]"><AlertCircleOutline /></n-icon>
      <p class="mt-4 text-[var(--text-secondary)]">未找到该审核记录</p>
    </div>

    <!-- Main content | 主内容 -->
    <template v-else>
      <!-- Header | 头部 -->
      <header class="review-header">
        <div class="flex items-center gap-3">
          <h1 class="text-xl font-semibold text-[var(--text-primary)]">工作流审核</h1>
          <span class="status-tag" :class="statusClass">{{ statusLabel }}</span>
        </div>
        <button class="theme-toggle" @click="toggleTheme" :title="isDark ? '切换浅色' : '切换深色'">
          <n-icon :size="18">
            <SunnyOutline v-if="isDark" />
            <MoonOutline v-else />
          </n-icon>
        </button>
      </header>

      <!-- Info section | 信息区 -->
      <section class="review-info">
        <div class="info-grid">
          <div class="info-item">
            <span class="info-label">工作流名称</span>
            <span class="info-value">{{ detail.name || '未命名' }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">提交人</span>
            <span class="info-value">{{ detail.userNickname || `用户${detail.userId || '未知'}` }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">提交时间</span>
            <span class="info-value">{{ formatTime(detail.createdAt) }}</span>
          </div>
          <div class="info-item" v-if="detail.tags && detail.tags.length > 0">
            <span class="info-label">标签</span>
            <div class="flex flex-wrap gap-1.5">
              <span v-for="tag in detail.tags" :key="tag" class="tag-chip">{{ tag }}</span>
            </div>
          </div>
          <div class="info-item" v-if="detail.remark">
            <span class="info-label">备注</span>
            <span class="info-value">{{ detail.remark }}</span>
          </div>
          <div class="info-item" v-if="detail.reviewComment">
            <span class="info-label">审核意见</span>
            <span class="info-value text-[#ef4444]">{{ detail.reviewComment }}</span>
          </div>
        </div>
        <div v-if="detail.cover" class="info-cover">
          <img :src="detail.cover" alt="封面" class="cover-img" />
        </div>
      </section>

      <!-- Canvas preview | 画布预览 -->
      <section class="review-canvas">
        <VueFlow
          v-model:nodes="flowNodes"
          v-model:edges="flowEdges"
          :node-types="nodeTypes"
          :edge-types="edgeTypes"
          :default-viewport="{ x: 0, y: 0, zoom: 0.8 }"
          :min-zoom="0.1"
          :max-zoom="2"
          :nodes-draggable="false"
          :nodes-connectable="false"
          :elements-selectable="false"
          :zoom-on-double-click="false"
          class="flow-preview"
        >
          <Background :gap="20" :size="1" />
          <MiniMap position="bottom-right" :pannable="true" :zoomable="true" />
        </VueFlow>
      </section>
    </template>
  </div>
</template>

<script setup>
/**
 * Review Page | 审核详情展示页面
 * No auth required, read-only workflow preview | 免登录，只读工作流预览
 */
import { computed, markRaw, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { NIcon, NSpin } from 'naive-ui'
import {
  AlertCircleOutline,
  MoonOutline,
  SunnyOutline
} from '@vicons/ionicons5'
import { VueFlow } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { MiniMap } from '@vue-flow/minimap'
import { isDark, toggleTheme } from '@/stores/theme'
import { promptFlowReviewGet } from '@/api/flow'

// Node components | 节点组件
import TextNode from '@/components/nodes/TextNode.vue'
import ImageConfigNode from '@/components/nodes/ImageConfigNode.vue'
import ImageNode from '@/components/nodes/ImageNode.vue'
import VideoNode from '@/components/nodes/VideoNode.vue'
import VideoConfigNode from '@/components/nodes/VideoConfigNode.vue'
import TextToImageNode from '@/components/nodes/TextToImageNode.vue'
import TextToVideoNode from '@/components/nodes/TextToVideoNode.vue'
import TextCombinationNode from '@/components/nodes/TextCombinationNode.vue'
import ConnectPlaceholderNode from '@/components/nodes/ConnectPlaceholderNode.vue'
import GroupNode from '@/components/nodes/GroupNode.vue'
import EnhanceNode from '@/components/nodes/EnhanceNode.vue'

// Edge components | 连线组件
import DeletableEdge from '@/components/edges/DeletableEdge.vue'
import ImageRoleEdge from '@/components/edges/ImageRoleEdge.vue'
import PromptOrderEdge from '@/components/edges/PromptOrderEdge.vue'

const route = useRoute()

// Node/Edge types | 节点/连线类型
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

const edgeTypes = {
  deletable: markRaw(DeletableEdge),
  imageRole: markRaw(ImageRoleEdge),
  promptOrder: markRaw(PromptOrderEdge)
}

// State | 状态
const loading = ref(true)
const detail = ref(null)
const flowNodes = ref([])
const flowEdges = ref([])

// Computed | 计算属性
const statusLabel = computed(() => {
  const s = detail.value?.status
  if (s === 1) return '待审核'
  if (s === 2) return '已通过'
  if (s === 3) return '已驳回'
  return '未知'
})

const statusClass = computed(() => {
  const s = detail.value?.status
  if (s === 1) return 'pending'
  if (s === 2) return 'approved'
  if (s === 3) return 'rejected'
  return ''
})

// Format timestamp | 格式化时间戳
const formatTime = (ts) => {
  if (!ts) return '-'
  const d = new Date(Number(ts))
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// Load review detail | 加载审核详情
const loadDetail = async () => {
  const id = route.params.id
  if (!id) {
    loading.value = false
    return
  }
  try {
    loading.value = true
    const res = await promptFlowReviewGet(id)
    detail.value = res
    if (res) {
      flowNodes.value = Array.isArray(res.nodes) ? res.nodes : []
      flowEdges.value = Array.isArray(res.edges) ? res.edges : []
    }
  } catch (err) {
    detail.value = null
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadDetail()
})
</script>

<style scoped>
.review-page {
  min-height: 100vh;
  background: var(--bg-primary);
  display: flex;
  flex-direction: column;
}

.review-center {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

/* Header | 头部 */
.review-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-secondary);
}

.theme-toggle {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
}

.theme-toggle:hover {
  color: var(--text-primary);
  border-color: var(--accent-color);
}

/* Status tag | 状态标签 */
.status-tag {
  padding: 4px 12px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 500;
}

.status-tag.pending {
  background: rgba(245, 158, 11, 0.15);
  color: #f59e0b;
}

.status-tag.approved {
  background: rgba(34, 197, 94, 0.15);
  color: #22c55e;
}

.status-tag.rejected {
  background: rgba(239, 68, 68, 0.15);
  color: #ef4444;
}

/* Info section | 信息区 */
.review-info {
  display: flex;
  gap: 24px;
  padding: 20px 24px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-color);
}

.info-grid {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.info-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.info-label {
  flex-shrink: 0;
  width: 80px;
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.6;
}

.info-value {
  font-size: 14px;
  color: var(--text-primary);
  line-height: 1.6;
  word-break: break-all;
}

.tag-chip {
  padding: 2px 10px;
  border-radius: 999px;
  font-size: 12px;
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  border: 1px solid var(--border-color);
}

.info-cover {
  flex-shrink: 0;
}

.cover-img {
  width: 96px;
  height: 96px;
  border-radius: 12px;
  object-fit: cover;
  border: 1px solid var(--border-color);
}

/* Canvas preview | 画布预览 */
.review-canvas {
  flex: 1;
  min-height: 400px;
  position: relative;
}

.flow-preview {
  width: 100%;
  height: 100%;
  min-height: 400px;
  background: var(--bg-primary);
}
</style>
