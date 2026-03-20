<template>
  <!-- Image cards from search_images tool | 图片搜索结果卡片 -->
  <div class="image-card-grid">
    <div
      v-for="card in images"
      :key="card.id"
      class="image-card"
      @click="$emit('add-to-canvas', card)"
    >
      <!-- Thumbnail | 缩略图 -->
      <div class="image-card-cover">
        <img
          v-if="card.pic_url || card.picUrl"
          :src="card.pic_url || card.picUrl"
          :alt="card.prompt || '生成图片'"
          class="cover-img"
          loading="lazy"
        />
        <n-icon v-else :size="28" class="placeholder-icon">
          <ImageOutline />
        </n-icon>

        <!-- Hover overlay | 悬浮遮罩 -->
        <div class="image-card-overlay">
          <button class="add-btn" @click.stop="$emit('add-to-canvas', card)">
            <n-icon :size="16"><AddOutline /></n-icon>
            <span>添加到画布</span>
          </button>
        </div>
      </div>

      <!-- Card info | 卡片信息 -->
      <div class="image-card-info">
        <p class="image-card-prompt" :title="card.prompt">
          {{ card.prompt || '无提示词' }}
        </p>
        <span v-if="card.model" class="image-card-model">{{ card.model }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { NIcon } from 'naive-ui'
import { ImageOutline, AddOutline } from '@vicons/ionicons5'

// Props: receives tool_result data object | 接收 tool_result 数据对象
const props = defineProps({
  data: {
    type: Object,
    required: true
  }
})

// Extract images from tool result data | 从工具结果数据中提取图片列表
const images = computed(() => {
  return Array.isArray(props.data?.images) ? props.data.images : []
})

defineEmits(['add-to-canvas'])
</script>

<style scoped>
.image-card-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  padding: 4px 0;
}

.image-card {
  border-radius: 10px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  overflow: hidden;
  cursor: pointer;
  transition:
    transform 0.2s ease,
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}

.image-card:hover {
  transform: translateY(-2px);
  border-color: var(--accent-color);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

:global(.dark) .image-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
}

.image-card-cover {
  position: relative;
  aspect-ratio: 1;
  background: var(--bg-tertiary);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.cover-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.image-card:hover .cover-img {
  transform: scale(1.05);
}

.placeholder-icon {
  color: var(--text-secondary);
}

.image-card-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.image-card:hover .image-card-overlay {
  opacity: 1;
}

.add-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 8px;
  border: none;
  background: var(--accent-color);
  color: #fff;
  font-size: 13px;
  cursor: pointer;
  transition:
    background 0.2s ease,
    transform 0.15s ease;
}

.add-btn:hover {
  background: var(--accent-hover);
  transform: scale(1.05);
}

.image-card-info {
  padding: 8px 10px;
}

.image-card-prompt {
  margin: 0;
  font-size: 12px;
  line-height: 1.4;
  color: var(--text-primary);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  word-break: break-all;
}

.image-card-model {
  display: inline-block;
  margin-top: 4px;
  font-size: 11px;
  color: var(--text-secondary);
  background: var(--bg-tertiary);
  padding: 2px 6px;
  border-radius: 4px;
}
</style>
