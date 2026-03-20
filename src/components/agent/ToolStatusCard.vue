<template>
  <!-- Tool call status indicator | 工具调用状态指示器 -->
  <div class="tool-status-card" :class="`status-${status}`">
    <!-- Spinner for running state | 运行中的旋转动画 -->
    <div v-if="status === 'running'" class="status-spinner"></div>
    <!-- Checkmark for completed | 完成时的对勾 -->
    <span v-else-if="status === 'completed'" class="status-icon completed">✓</span>
    <!-- X for error | 错误时的叉号 -->
    <span v-else class="status-icon error">✕</span>

    <div class="status-content">
      <div class="status-label">
        <span class="tool-icon">{{ icon }}</span>
        {{ statusText }}
      </div>
      <div class="status-detail">
        {{ toolName }}
        <template v-if="resultSummary"> · {{ resultSummary }}</template>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  toolName: {
    type: String,
    required: true
  },
  toolLabel: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    default: 'running',
    validator: (v) => ['running', 'completed', 'error'].includes(v)
  },
  icon: {
    type: String,
    default: '🔧'
  },
  resultSummary: {
    type: String,
    default: ''
  }
})

// Dynamic status text based on state | 根据状态动态显示文本
const statusText = computed(() => {
  const label = props.toolLabel || props.toolName
  if (props.status === 'running') return `正在${label}...`
  if (props.status === 'completed') return `${label}完成`
  return `${label}失败`
})
</script>

<style scoped>
.tool-status-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  max-width: 85%;
}

.status-completed {
  border-color: rgba(34, 197, 94, 0.3);
}

.status-error {
  border-color: rgba(239, 68, 68, 0.3);
}

/* Spinner animation | 旋转动画 */
.status-spinner {
  width: 18px;
  height: 18px;
  border: 2px solid var(--accent-color);
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  flex-shrink: 0;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.status-icon {
  font-size: 16px;
  flex-shrink: 0;
  width: 18px;
  text-align: center;
}

.status-icon.completed {
  color: #22c55e;
}

.status-icon.error {
  color: #ef4444;
}

.status-content {
  min-width: 0;
}

.status-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: 4px;
}

.tool-icon {
  font-size: 14px;
}

.status-detail {
  font-size: 11px;
  color: var(--text-secondary);
  margin-top: 2px;
}
</style>
