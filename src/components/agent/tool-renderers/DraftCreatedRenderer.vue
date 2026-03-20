<template>
  <div class="draft-created-notice">
    <span class="notice-icon">📋</span>
    <span>已在画布创建草稿「{{ parsedLabel }}」，包含 {{ nodeCount }} 个节点</span>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  data: { type: [Object, String], default: () => ({}) },
})

const parsed = computed(() => {
  try {
    return typeof props.data === 'string' ? JSON.parse(props.data) : props.data
  } catch {
    return {}
  }
})

const parsedLabel = computed(() => parsed.value?.label || '工作流')
const nodeCount = computed(() => parsed.value?.node_count || '?')
</script>

<style scoped>
.draft-created-notice {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: rgba(245, 158, 11, 0.08);
  border-radius: 8px;
  font-size: 13px;
  color: var(--text-primary);
}
.notice-icon {
  font-size: 16px;
}
</style>
