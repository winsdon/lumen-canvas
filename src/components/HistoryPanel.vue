<template>
  <div class="history-panel">
    <!-- Header | 头部 -->
    <div class="panel-header">
      <div class="panel-tabs">
        <span 
          class="tab-item" 
          :class="{ active: activeTab === 'image' }"
          @click="activeTab = 'image'"
        >图片历史</span>
        <span 
          class="tab-item" 
          :class="{ active: activeTab === 'video' }"
          @click="activeTab = 'video'"
        >视频历史</span>
      </div>
    </div>

    <!-- Content | 内容 -->
    <div class="panel-content">
      <!-- Image History | 图片历史 -->
      <div v-if="activeTab === 'image'">
        <div class="history-grid" v-if="images.length > 0">
          <div 
            v-for="item in images" 
            :key="item.id" 
            class="history-card"
            @click="handleSelectImage(item)"
          >
            <div class="card-cover">
              <img :src="item.url" loading="lazy" class="cover-img" />
            </div>
          </div>
        </div>
        
        <div v-if="loadingImage" class="loading-state">
          <n-spin size="small" />
        </div>
        
        <div v-else-if="images.length === 0" class="empty-state">
          <n-icon :size="36" class="text-gray-500"><ImageOutline /></n-icon>
          <p class="text-gray-500 text-sm mt-2">暂无图片记录</p>
        </div>
        
        <div v-if="!loadingImage && hasMoreImage && images.length > 0" class="load-more" @click="loadImages">
          加载更多
        </div>
      </div>
      
      <!-- Video History | 视频历史 -->
      <div v-if="activeTab === 'video'">
        <div class="history-grid" v-if="videos.length > 0">
          <div 
            v-for="item in videos" 
            :key="item.id" 
            class="history-card"
            @click="handleSelectVideo(item)"
          >
            <div class="card-cover">
              <video 
                :src="item.videoUrl || item.url" 
                muted 
                @mouseover="$event.target.play()" 
                @mouseout="$event.target.pause()" 
                loop
                class="cover-img"
              ></video>
              <div class="video-badge">
                <n-icon size="12"><VideocamOutline /></n-icon>
              </div>
            </div>
          </div>
        </div>
        
        <div v-if="loadingVideo" class="loading-state">
          <n-spin size="small" />
        </div>
        
        <div v-else-if="videos.length === 0" class="empty-state">
          <n-icon :size="36" class="text-gray-500"><VideocamOutline /></n-icon>
          <p class="text-gray-500 text-sm mt-2">暂无视频记录</p>
        </div>
        
        <div v-if="!loadingVideo && hasMoreVideo && videos.length > 0" class="load-more" @click="loadVideos">
          加载更多
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { NSpin, NIcon } from 'naive-ui'
import { ImageOutline, VideocamOutline } from '@vicons/ionicons5'
import { getAiImagePageMy } from '@/api/image'
import { getAiVideoPageMy } from '@/api/video'
import { addNode, canvasViewport } from '@/stores/canvas'

const activeTab = ref('image')
const images = ref([])
const videos = ref([])
const loadingImage = ref(false)
const loadingVideo = ref(false)
const imagePage = ref(1)
const videoPage = ref(1)
const hasMoreImage = ref(true)
const hasMoreVideo = ref(true)
const pageSize = 20

const loadImages = async () => {
  if (loadingImage.value) return
  loadingImage.value = true
  try {
    const res = await getAiImagePageMy({ pageNo: imagePage.value, pageSize })
    const list = res?.records || res?.list || []
    if (list.length < pageSize) {
      hasMoreImage.value = false
    }
    if (imagePage.value === 1) {
      images.value = list
    } else {
      images.value = [...images.value, ...list]
    }
    imagePage.value++
  } catch (err) {
    console.error('Failed to load images:', err)
  } finally {
    loadingImage.value = false
  }
}

const loadVideos = async () => {
  if (loadingVideo.value) return
  loadingVideo.value = true
  try {
    const res = await getAiVideoPageMy({ pageNo: videoPage.value, pageSize })
    const list = res?.records || res?.list || []
    if (list.length < pageSize) {
      hasMoreVideo.value = false
    }
    if (videoPage.value === 1) {
      videos.value = list
    } else {
      videos.value = [...videos.value, ...list]
    }
    videoPage.value++
  } catch (err) {
    console.error('Failed to load videos:', err)
  } finally {
    loadingVideo.value = false
  }
}

const getCenterPosition = () => {
  const x = -canvasViewport.value.x / canvasViewport.value.zoom + (window.innerWidth / 2) / canvasViewport.value.zoom
  const y = -canvasViewport.value.y / canvasViewport.value.zoom + (window.innerHeight / 2) / canvasViewport.value.zoom
  return { x: x - 100, y: y - 100 }
}

const handleSelectImage = (item) => {
  addNode('textToImage', getCenterPosition(), {
    url: item.url,
    label: '历史图片'
  })
  window.$message?.success('已添加到画布')
}

const handleSelectVideo = (item) => {
  addNode('textToVideo', getCenterPosition(), {
    url: item.videoUrl || item.url,
    label: '历史视频'
  })
  window.$message?.success('已添加到画布')
}

onMounted(() => {
  loadImages()
  loadVideos()
})
</script>

<style scoped>
.history-panel {
  width: 520px;
  max-height: 600px;
  display: flex;
  flex-direction: column;
  background-color: var(--bg-secondary);
  /* border-radius: 16px; handled by popover container in Canvas.vue but good to have if standalone */
  overflow: hidden;
}

/* Header | 头部 */
.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px 12px;
  border-bottom: 1px solid var(--border-color);
}

.panel-tabs {
  display: flex;
  gap: 24px;
}

.tab-item {
  font-size: 15px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: color 0.2s;
  padding-bottom: 4px;
}

.tab-item:hover {
  color: var(--text-primary);
}

.tab-item.active {
  color: var(--text-primary);
  font-weight: 500;
}

/* Content | 内容区 */
.panel-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

/* Grid | 网格 */
.history-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

/* Card | 卡片 */
.history-card {
  cursor: pointer;
  transition: transform 0.2s;
}

.history-card:hover {
  transform: translateY(-2px);
}

.history-card:hover .card-cover {
  border-color: var(--accent-color);
}

.card-cover {
  aspect-ratio: 1;
  border-radius: 12px;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  transition: border-color 0.2s;
  overflow: hidden;
}

.cover-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.video-badge {
  position: absolute;
  bottom: 6px;
  right: 6px;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  border-radius: 4px;
  padding: 4px;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* State Styles */
.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 24px;
  text-align: center;
  color: var(--text-secondary);
}

.load-more {
  text-align: center;
  padding: 12px;
  margin-top: 16px;
  cursor: pointer;
  color: var(--text-secondary);
  font-size: 13px;
  border-radius: 8px;
  background-color: var(--bg-tertiary);
  transition: all 0.2s;
}

.load-more:hover {
  background-color: var(--bg-primary);
  color: var(--text-primary);
}

/* Custom Scrollbar */
.panel-content::-webkit-scrollbar {
  width: 6px;
}
.panel-content::-webkit-scrollbar-track {
  background: transparent;
}
.panel-content::-webkit-scrollbar-thumb {
  background: var(--border-color);
  border-radius: 3px;
}
.panel-content::-webkit-scrollbar-thumb:hover {
  background: var(--text-secondary);
}
</style>
