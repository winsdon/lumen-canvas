<template>
  <!-- Generated image result | 生成图片结果 -->
  <div class="generated-image-card">
    <div class="generated-image-cover">
      <img
        v-if="imageUrl"
        :src="imageUrl"
        :alt="prompt"
        class="generated-img"
        loading="lazy"
      />
      <n-icon v-else :size="36" class="placeholder-icon">
        <ImageOutline />
      </n-icon>

      <!-- Hover overlay | 悬浮遮罩 -->
      <div class="generated-overlay">
        <button class="add-btn" @click.stop="handleAddToCanvas">
          <n-icon :size="16"><AddOutline /></n-icon>
          <span>添加到画布</span>
        </button>
      </div>
    </div>

    <div class="generated-info">
      <p class="generated-prompt" :title="prompt">{{ prompt || '无提示词' }}</p>
      <span v-if="data.model" class="generated-model">{{ data.model }}</span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { NIcon } from 'naive-ui'
import { ImageOutline, AddOutline } from '@vicons/ionicons5'

const props = defineProps({
  data: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['add-to-canvas'])

// Extract image URL from various possible field names | 从不同字段名提取图片 URL
const imageUrl = computed(() => {
  return props.data?.url || props.data?.pic_url || props.data?.picUrl || ''
})

const prompt = computed(() => {
  return props.data?.prompt || ''
})

const handleAddToCanvas = () => {
  emit('add-to-canvas', {
    pic_url: imageUrl.value,
    prompt: prompt.value,
    model: props.data?.model
  })
}
</script>

<style scoped>
.generated-image-card {
  border-radius: 10px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  overflow: hidden;
  max-width: 280px;
}

.generated-image-cover {
  position: relative;
  aspect-ratio: 1;
  background: var(--bg-tertiary);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.generated-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.generated-image-card:hover .generated-img {
  transform: scale(1.03);
}

.placeholder-icon {
  color: var(--text-secondary);
}

.generated-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s ease;
  cursor: pointer;
}

.generated-image-card:hover .generated-overlay {
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

.generated-info {
  padding: 10px 12px;
}

.generated-prompt {
  margin: 0;
  font-size: 13px;
  line-height: 1.4;
  color: var(--text-primary);
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.generated-model {
  display: inline-block;
  margin-top: 6px;
  font-size: 11px;
  color: var(--text-secondary);
  background: var(--bg-tertiary);
  padding: 2px 6px;
  border-radius: 4px;
}
</style>
