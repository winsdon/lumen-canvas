<template>
  <div class="templates-list">
    <div v-for="tpl in templates" :key="tpl.id" class="template-card">
      <div class="template-name">{{ tpl.name }}</div>
      <div class="template-desc">{{ tpl.description }}</div>
      <div class="template-category">{{ tpl.category }}</div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  data: { type: [Object, String, Array], default: () => ({}) },
})

const templates = computed(() => {
  try {
    const raw = typeof props.data === 'string' ? JSON.parse(props.data) : props.data
    // ToolResult.to_str() returns raw list (no wrapper) | to_str() 直接返回列表（无包装）
    return Array.isArray(raw) ? raw : []
  } catch {
    return []
  }
})
</script>

<style scoped>
.templates-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.template-card {
  padding: 10px 12px;
  background: var(--bg-secondary, rgba(255, 255, 255, 0.05));
  border-radius: 8px;
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
}
.template-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}
.template-desc {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 4px;
}
.template-category {
  font-size: 11px;
  color: var(--accent-color);
  margin-top: 4px;
}
</style>
