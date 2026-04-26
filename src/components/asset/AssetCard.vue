<template>
  <div
    class="asset-card"
    draggable="true"
    @dragstart="onDragStart"
    @click="$emit('click', asset)"
  >
    <div class="card-cover">
      <img :src="asset.imageUrl" loading="lazy" :alt="asset.prompt || ''" />
      <div v-if="asset.assetType === 'video'" class="video-badge">▶</div>
    </div>
    <div v-if="asset.prompt" class="card-prompt" :title="asset.prompt">
      {{ truncated(asset.prompt) }}
    </div>
    <div class="card-meta">
      <span class="source-badge" :class="`source-${asset.source}`">{{ asset.source }}</span>
      <button class="delete-btn" @click.stop="$emit('delete', asset.id)" title="删除">×</button>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  asset: { type: Object, required: true }
})

defineEmits(['click', 'delete'])

function onDragStart(e) {
  const a = props.asset
  const payload = {
    id: a.id,
    assetType: a.assetType,
    imageUrl: a.imageUrl,
    videoUrl: a.videoUrl,
    prompt: a.prompt
  }
  e.dataTransfer.setData('application/x-lumeng-asset', JSON.stringify(payload))
  e.dataTransfer.effectAllowed = 'copy'
}

function truncated(s) {
  if (!s) return ''
  return s.length > 60 ? s.slice(0, 57) + '...' : s
}
</script>

<style scoped>
.asset-card {
  position: relative;
  border-radius: 8px;
  overflow: hidden;
  background: var(--bg-secondary);
  cursor: grab;
  transition: transform 0.15s, box-shadow 0.15s;
  user-select: none;
}
.asset-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}
.asset-card:active { cursor: grabbing; }
.card-cover {
  position: relative;
  aspect-ratio: 1 / 1;
  background: var(--bg-tertiary);
}
.card-cover img {
  width: 100%; height: 100%; object-fit: cover; display: block;
}
.video-badge {
  position: absolute; right: 6px; bottom: 6px;
  padding: 2px 6px; border-radius: 4px;
  background: rgba(0,0,0,0.6); color: white; font-size: 11px;
}
.card-prompt {
  padding: 6px 8px;
  font-size: 12px; line-height: 1.4;
  color: var(--text-secondary);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.card-meta {
  display: flex; align-items: center; justify-content: space-between;
  padding: 4px 8px 8px;
}
.source-badge {
  font-size: 10px; padding: 2px 6px; border-radius: 10px;
  background: var(--bg-tertiary); color: var(--text-secondary);
}
.source-jimeng { background: #ff6b6b22; color: #ff6b6b; }
.source-huaban { background: #4dabf722; color: #4dabf7; }
.source-local { background: #51cf6622; color: #51cf66; }
.delete-btn {
  width: 20px; height: 20px; border: none; background: transparent;
  font-size: 16px; line-height: 1; cursor: pointer;
  color: var(--text-secondary); opacity: 0;
  transition: opacity 0.15s, color 0.15s;
}
.asset-card:hover .delete-btn { opacity: 1; }
.delete-btn:hover { color: #ff6b6b; }
</style>
