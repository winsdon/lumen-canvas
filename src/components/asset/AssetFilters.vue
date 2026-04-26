<template>
  <div class="asset-filters">
    <input
      class="filter-input"
      type="text"
      placeholder="搜索提示词..."
      v-model="keyword"
      @input="onKeywordInput"
    />
    <select class="filter-select" v-model="source" @change="emitChange">
      <option :value="null">全部来源</option>
      <option value="jimeng">即梦</option>
      <option value="huaban">花瓣</option>
      <option value="local">本地上传</option>
    </select>
    <select class="filter-select" v-model="assetType" @change="emitChange">
      <option :value="null">全部类型</option>
      <option value="image">图片</option>
      <option value="video">视频</option>
    </select>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
  initial: { type: Object, default: () => ({}) }
})
const emit = defineEmits(['change'])

const keyword = ref(props.initial.keyword || '')
const source = ref(props.initial.source ?? null)
const assetType = ref(props.initial.assetType ?? null)

let debounceTimer = null
function onKeywordInput() {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(emitChange, 300)
}

function emitChange() {
  emit('change', {
    keyword: keyword.value,
    source: source.value,
    assetType: assetType.value
  })
}
</script>

<style scoped>
.asset-filters {
  display: flex;
  gap: 8px;
  padding: 8px;
  border-bottom: 1px solid var(--border-color);
}
.filter-input, .filter-select {
  flex: 1;
  padding: 6px 10px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 13px;
}
.filter-input { flex: 2; }
.filter-input:focus, .filter-select:focus {
  outline: none;
  border-color: var(--accent-color);
}
</style>
