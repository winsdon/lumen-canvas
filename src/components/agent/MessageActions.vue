<template>
  <!-- Hover action bar for assistant messages | 消息悬浮操作栏 -->
  <div class="message-actions">
    <button class="action-btn" @click="handleCopy" :title="'复制'">
      <n-icon :size="14"><CopyOutline /></n-icon>
      <span>复制</span>
    </button>
    <button class="action-btn" @click="$emit('regenerate')" :title="'重新生成'">
      <n-icon :size="14"><RefreshOutline /></n-icon>
      <span>重新生成</span>
    </button>
  </div>
</template>

<script setup>
import { NIcon } from 'naive-ui'
import { CopyOutline, RefreshOutline } from '@vicons/ionicons5'

const props = defineProps({
  content: {
    type: String,
    default: ''
  }
})

defineEmits(['regenerate'])

const handleCopy = async () => {
  try {
    await navigator.clipboard.writeText(props.content)
    window.$message?.success('已复制')
  } catch {
    window.$message?.error('复制失败')
  }
}
</script>

<style scoped>
.message-actions {
  display: flex;
  gap: 4px;
  padding: 2px 0;
  opacity: 0;
  transition: opacity 0.15s ease;
  pointer-events: none;
}

/* Parent hover shows actions — controlled via parent class | 父元素悬浮显示操作 */
:global(.message-hover-container:hover) .message-actions {
  opacity: 1;
  pointer-events: auto;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: 6px;
  border: 1px solid var(--border-color);
  background: var(--bg-secondary);
  color: var(--text-secondary);
  font-size: 11px;
  cursor: pointer;
  transition:
    background 0.15s,
    color 0.15s,
    border-color 0.15s;
}

.action-btn:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
  border-color: var(--accent-color);
}
</style>
