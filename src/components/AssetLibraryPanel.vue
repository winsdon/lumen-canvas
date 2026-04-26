<template>
  <n-drawer v-model:show="showInner" :width="380" placement="right">
    <n-drawer-content title="资产库" :native-scrollbar="false" closable>
      <AssetFilters
        :initial="{ source: filters.source, assetType: filters.assetType, keyword: filters.keyword }"
        @change="onFiltersChange"
      />
      <AssetUploader />

      <div v-if="list.length > 0" class="asset-grid" @scroll="onScroll">
        <AssetCard
          v-for="asset in list"
          :key="asset.id"
          :asset="asset"
          @click="onCardClick"
          @delete="onCardDelete"
        />
      </div>

      <div v-if="loading" class="state-row">加载中…</div>
      <div v-else-if="list.length === 0" class="state-row empty">
        暂无资产，可拖入文件上传或使用采集插件采集
      </div>
      <div v-else-if="!hasMore" class="state-row dim">— 没有更多 —</div>
    </n-drawer-content>
  </n-drawer>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import { NDrawer, NDrawerContent } from 'naive-ui'
import {
  list, hasMore, loading, filters,
  reload, loadMore, remove, setFilter
} from '@/stores/assets'
import AssetCard from './asset/AssetCard.vue'
import AssetUploader from './asset/AssetUploader.vue'
import AssetFilters from './asset/AssetFilters.vue'

const props = defineProps({
  show: { type: Boolean, default: false }
})
const emit = defineEmits(['update:show'])

const showInner = ref(props.show)

watch(() => props.show, async (v) => {
  showInner.value = v
  if (v && list.value.length === 0) {
    try {
      await reload()
    } catch (err) {
      console.error('Failed to load assets', err)
    }
  }
  if (v) localStorage.setItem('assetLibrary.open', '1')
  else localStorage.removeItem('assetLibrary.open')
})

watch(showInner, (v) => emit('update:show', v))

onMounted(() => {
  // Restore drawer state on mount (only when parent has not set it)
  if (localStorage.getItem('assetLibrary.open') === '1' && !props.show) {
    emit('update:show', true)
  }
})

function onScroll(e) {
  const el = e.target
  if (el.scrollTop + el.clientHeight >= el.scrollHeight - 200) {
    loadMore().catch(err => console.error('loadMore failed', err))
  }
}

function onFiltersChange(newFilters) {
  setFilter('source', newFilters.source)
  setFilter('assetType', newFilters.assetType)
  setFilter('keyword', newFilters.keyword)
  reload().catch(err => console.error('reload after filter change failed', err))
}

function onCardClick(_asset) {
  // Future: open detail modal. For now drag is the main interaction.
}

async function onCardDelete(id) {
  if (!confirm('确定删除该资产？')) return
  try {
    await remove(id)
  } catch (err) {
    console.error('Delete failed', err)
    alert('删除失败')
  }
}
</script>

<style scoped>
.asset-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  padding: 8px;
  max-height: calc(100vh - 240px);
  overflow-y: auto;
}
.state-row {
  text-align: center;
  padding: 16px;
  font-size: 13px;
  color: var(--text-secondary);
}
.state-row.empty { padding: 32px 16px; }
.state-row.dim { opacity: 0.6; }
</style>
