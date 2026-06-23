<template>
  <aside v-if="show" class="canvas-asset-picker">
    <div class="picker-header">
      <div>
        <h3>素材库</h3>
        <p>点击添加到画布</p>
      </div>
      <button title="关闭" @click="$emit('update:show', false)">×</button>
    </div>

    <div class="picker-filters">
      <input v-model="keywordDraft" placeholder="搜索素材" @keyup.enter="applyFilters" />
      <div class="filter-row">
        <select v-model="categoryDraft" @change="applyFilters">
          <option :value="''">全部分类</option>
          <option v-for="category in categories" :key="category" :value="category">{{ category }}</option>
        </select>
        <select v-model="platformDraft" @change="applyFilters">
          <option :value="''">全部平台</option>
          <option v-for="platform in platforms" :key="platform" :value="platform">{{ platform }}</option>
        </select>
      </div>
    </div>

    <div v-if="list.length" class="picker-grid" @scroll="onScroll">
      <button
        v-for="asset in list"
        :key="asset.id"
        class="picker-card"
        :title="asset.prompt || '素材'"
        @click="$emit('select-asset', asset)"
      >
        <img v-if="asset.imageUrl" :src="asset.imageUrl" :alt="asset.prompt || '素材图片'" loading="lazy" />
        <span v-else>无预览</span>
      </button>
    </div>

    <div v-else class="picker-empty">
      {{ loading ? '加载中' : '暂无素材' }}
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  type Asset,
  filters,
  hasMore,
  list,
  loadMore,
  loading,
  reload,
  setFilter
} from '@/stores/assets'

const props = defineProps<{
  show: boolean
}>()

defineEmits<{
  'update:show': [value: boolean]
  'select-asset': [asset: Asset]
}>()

const keywordDraft = ref(filters.keyword)
const categoryDraft = ref(filters.category || '')
const platformDraft = ref(filters.platform || '')

const categories = computed(() => Array.from(new Set(list.value.map(asset => asset.category).filter(Boolean))) as string[])
const platforms = computed(() => Array.from(new Set(list.value.map(asset => asset.platform).filter(Boolean))) as string[])

watch(() => props.show, async value => {
  if (!value) return
  setFilter('assetType', 'image')
  if (!list.value.length) {
    await reload().catch(error => console.error('[asset-picker] reload failed:', error))
  }
})

const applyFilters = async () => {
  setFilter('keyword', keywordDraft.value)
  setFilter('category', categoryDraft.value || null)
  setFilter('platform', platformDraft.value || null)
  setFilter('assetType', 'image')
  await reload().catch(error => console.error('[asset-picker] filter failed:', error))
}

const onScroll = (event: Event) => {
  const el = event.target as HTMLElement
  if (!hasMore.value || loading.value) return
  if (el.scrollTop + el.clientHeight >= el.scrollHeight - 160) {
    loadMore().catch(error => console.error('[asset-picker] load more failed:', error))
  }
}
</script>

<style scoped>
.canvas-asset-picker {
  position: fixed;
  left: 76px;
  top: 88px;
  z-index: 30;
  width: 292px;
  max-height: calc(100vh - 120px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-secondary);
  box-shadow: 0 16px 42px rgb(0 0 0 / 0.18);
}

.picker-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 14px;
  border-bottom: 1px solid var(--border-color);
}

.picker-header h3,
.picker-header p {
  margin: 0;
}

.picker-header h3 {
  font-size: 15px;
}

.picker-header p {
  margin-top: 3px;
  font-size: 12px;
  color: var(--text-secondary);
}

.picker-header button {
  width: 26px;
  height: 26px;
  border-radius: 6px;
  color: var(--text-secondary);
}

.picker-header button:hover {
  background: var(--bg-tertiary);
}

.picker-filters {
  display: grid;
  gap: 8px;
  padding: 12px;
  border-bottom: 1px solid var(--border-color);
}

.picker-filters input,
.picker-filters select {
  width: 100%;
  min-width: 0;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 12px;
  padding: 7px 9px;
}

.filter-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.picker-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  padding: 12px;
  overflow-y: auto;
}

.picker-card {
  aspect-ratio: 1 / 1;
  overflow: hidden;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-tertiary);
}

.picker-card:hover {
  border-color: var(--accent-color);
}

.picker-card img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.picker-card span,
.picker-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  font-size: 12px;
}

.picker-empty {
  min-height: 220px;
}
</style>
