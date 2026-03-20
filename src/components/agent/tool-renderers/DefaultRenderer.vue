<template>
  <!-- Default tool result renderer | 默认工具结果渲染器 -->
  <div class="default-tool-result">
    <pre class="result-json">{{ formattedJson }}</pre>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  data: {
    type: Object,
    required: true
  }
})

// Format data as readable JSON | 格式化数据为可读 JSON
const formattedJson = computed(() => {
  try {
    return JSON.stringify(props.data, null, 2)
  } catch {
    return String(props.data)
  }
})
</script>

<style scoped>
.default-tool-result {
  max-width: 100%;
  overflow: hidden;
}

.result-json {
  margin: 0;
  padding: 10px 12px;
  background: var(--bg-tertiary);
  border-radius: 8px;
  font-size: 12px;
  line-height: 1.5;
  color: var(--text-secondary);
  font-family: 'SF Mono', 'Fira Code', monospace;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 200px;
  overflow-y: auto;
}
</style>
