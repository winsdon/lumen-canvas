<template>
  <Transition name="panel-slide">
    <div
      v-if="visible"
      class="history-panel"
      v-click-outside="handleClickOutside"
      @mousedown.stop
      @click.stop
    >
      <div class="panel-header">
        <div class="panel-tabs">
          <span
            class="tab-item"
            :class="{ active: activeTab === 'image' }"
            @click="activeTab = 'image'"
            >AI绘画记录</span
          >
          <span
            class="tab-item"
            :class="{ active: activeTab === 'video' }"
            @click="activeTab = 'video'"
            >AI视频记录</span
          >
        </div>
        <button class="expand-btn" @click="visible = false">
          <n-icon :size="16"><CloseOutline /></n-icon>
        </button>
      </div>
      <div class="panel-content">
        <div v-if="!loggedIn" class="empty-state">
          <n-icon :size="36" class="cover-icon">
            <PersonOutline />
          </n-icon>
          <p class="text-sm mt-2">登录后可查看历史记录</p>
        </div>
        <template v-else>
          <div v-if="activeTab === 'image'">
            <div v-if="imageGroups.length > 0">
              <div
                v-for="group in imageGroups"
                :key="group.date"
                class="date-group"
              >
                <div class="date-label">{{ group.date }}</div>
                <div class="workflow-grid">
                  <div
                    v-for="item in group.items"
                    :key="item.id"
                    class="workflow-card"
                    @click="handleSelectImage(item)"
                  >
                    <div class="card-cover">
                      <img
                        v-if="getImageUrl(item)"
                        :src="getImageUrl(item)"
                        class="cover-img"
                        loading="lazy"
                      />
                      <n-icon v-else :size="36" class="cover-icon">
                        <ImageOutline />
                      </n-icon>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div v-else-if="loadingImage" class="loading-state">
              <n-spin size="small" />
            </div>
            <div v-else class="empty-state">
              <n-icon :size="36" class="cover-icon">
                <ImageOutline />
              </n-icon>
              <p class="text-sm mt-2">暂无绘画记录</p>
            </div>
            <div
              v-if="!loadingImage && hasMoreImage && images.length > 0"
              class="load-more"
              @click="loadImages()"
            >
              加载更多
            </div>
          </div>
          <div v-else>
            <div v-if="videoGroups.length > 0">
              <div
                v-for="group in videoGroups"
                :key="group.date"
                class="date-group"
              >
                <div class="date-label">{{ group.date }}</div>
                <div class="workflow-grid">
                  <div
                    v-for="item in group.items"
                    :key="item.id"
                    class="workflow-card"
                    @click="handleSelectVideo(item)"
                  >
                    <div class="card-cover">
                      <video
                        v-if="getVideoUrl(item)"
                        :src="getVideoUrl(item)"
                        muted
                        playsinline
                        preload="metadata"
                        class="cover-img"
                      ></video>
                      <n-icon v-else :size="36" class="cover-icon">
                        <VideocamOutline />
                      </n-icon>
                      <div class="video-badge">
                        <n-icon :size="12"><VideocamOutline /></n-icon>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div v-else-if="loadingVideo" class="loading-state">
              <n-spin size="small" />
            </div>
            <div v-else class="empty-state">
              <n-icon :size="36" class="cover-icon">
                <VideocamOutline />
              </n-icon>
              <p class="text-sm mt-2">暂无视频记录</p>
            </div>
            <div
              v-if="!loadingVideo && hasMoreVideo && videos.length > 0"
              class="load-more"
              @click="loadVideos()"
            >
              加载更多
            </div>
          </div>
        </template>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { computed, ref, watch } from "vue";
import { NIcon, NSpin } from "naive-ui";
import {
  CloseOutline,
  ImageOutline,
  PersonOutline,
  VideocamOutline,
} from "@vicons/ionicons5";
import { getAiImagePageMy } from "@/api/image";
import { getAiVideoPageMy } from "@/api/video";
import { isLoggedIn } from "@/utils/auth";

const props = defineProps({
  show: Boolean,
});

const emit = defineEmits(["update:show", "select-image", "select-video"]);

const visible = computed({
  get: () => props.show,
  set: (val) => emit("update:show", val),
});

const activeTab = ref("image");

const pageSize = 20;

const images = ref([]);
const videos = ref([]);
const imagePage = ref(1);
const videoPage = ref(1);
const hasMoreImage = ref(true);
const hasMoreVideo = ref(true);
const loadingImage = ref(false);
const loadingVideo = ref(false);
const imageLoaded = ref(false);
const videoLoaded = ref(false);

const loggedIn = computed(() => isLoggedIn());

const normalizeUrl = (url) =>
  String(url || "")
    .trim()
    .replace(/^`|`$/g, "");
const getImageUrl = (item) => normalizeUrl(item?.picUrl || item?.url);
const getVideoUrl = (item) => normalizeUrl(item?.videoUrl || item?.url);

const formatDate = (value) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const getItemDate = (item) => {
  return formatDate(
    item?.createTime ||
      item?.finishTime ||
      item?.submitTime ||
      item?.scheduledTime,
  );
};

const groupByDate = (items) => {
  const groups = [];
  const map = new Map();
  for (const item of items || []) {
    const date = getItemDate(item) || "未知日期";
    let group = map.get(date);
    if (!group) {
      group = { date, items: [] };
      map.set(date, group);
      groups.push(group);
    }
    group.items.push(item);
  }
  return groups;
};

const imageGroups = computed(() => groupByDate(images.value));
const videoGroups = computed(() => groupByDate(videos.value));

const loadImages = async ({ reset = false } = {}) => {
  if (!loggedIn.value) return;
  if (loadingImage.value) return;
  if (!hasMoreImage.value && !reset) return;
  loadingImage.value = true;
  try {
    if (reset) {
      imagePage.value = 1;
      hasMoreImage.value = true;
      images.value = [];
    }
    const res = await getAiImagePageMy({ pageNo: imagePage.value, pageSize });
    const list = res?.records || res?.list || [];
    if (list.length < pageSize) hasMoreImage.value = false;
    const successList = list.filter((item) => !!getImageUrl(item));
    images.value = [...images.value, ...successList];
    imagePage.value += 1;
    imageLoaded.value = true;
  } finally {
    loadingImage.value = false;
  }
};

const loadVideos = async ({ reset = false } = {}) => {
  if (!loggedIn.value) return;
  if (loadingVideo.value) return;
  if (!hasMoreVideo.value && !reset) return;
  loadingVideo.value = true;
  try {
    if (reset) {
      videoPage.value = 1;
      hasMoreVideo.value = true;
      videos.value = [];
    }
    const res = await getAiVideoPageMy({ pageNo: videoPage.value, pageSize });
    const list = res?.records || res?.list || [];
    if (list.length < pageSize) hasMoreVideo.value = false;
    const successList = list.filter((item) => !!getVideoUrl(item));
    videos.value = [...videos.value, ...successList];
    videoPage.value += 1;
    videoLoaded.value = true;
  } finally {
    loadingVideo.value = false;
  }
};

watch(
  () => visible.value,
  (val) => {
    if (!val) return;
    if (activeTab.value === "image" && !imageLoaded.value)
      loadImages({ reset: true });
    if (activeTab.value === "video" && !videoLoaded.value)
      loadVideos({ reset: true });
  },
);

watch(
  () => activeTab.value,
  (tab) => {
    if (!visible.value) return;
    if (tab === "image" && !imageLoaded.value) loadImages({ reset: true });
    if (tab === "video" && !videoLoaded.value) loadVideos({ reset: true });
  },
);

watch(
  () => loggedIn.value,
  (val) => {
    if (!val) return;
    if (!visible.value) return;
    if (activeTab.value === "image" && !imageLoaded.value)
      loadImages({ reset: true });
    if (activeTab.value === "video" && !videoLoaded.value)
      loadVideos({ reset: true });
  },
);

const handleSelectImage = (item) => {
  emit("select-image", item);
  visible.value = false;
};

const handleSelectVideo = (item) => {
  emit("select-video", item);
  visible.value = false;
};

const handleClickOutside = () => {
  visible.value = false;
};

const vClickOutside = {
  mounted(el, binding) {
    el._clickOutside = (e) => {
      if (!el.contains(e.target)) binding.value();
    };
    setTimeout(() => {
      document.addEventListener("click", el._clickOutside);
    }, 0);
  },
  unmounted(el) {
    document.removeEventListener("click", el._clickOutside);
  },
};
</script>

<style scoped>
.history-panel {
  position: fixed;
  left: 72px;
  top: 100px;
  width: 520px;
  max-height: 70vh;
  background: var(--bg-secondary);
  backdrop-filter: blur(12px);
  border-radius: 16px;
  border: 1px solid var(--border-color);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
  z-index: 100;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

:global(.dark) .history-panel {
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
}

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

.expand-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--text-secondary);
  transition:
    background 0.2s,
    color 0.2s;
}

.expand-btn:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.panel-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.workflow-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.date-group + .date-group {
  margin-top: 18px;
}

.date-label {
  font-size: 14px;
  color: var(--text-primary);
  opacity: 0.9;
  padding-left: 2px;
  margin: 2px 0 12px;
}

.workflow-card {
  cursor: pointer;
  transition: transform 0.2s;
}

.workflow-card:hover {
  transform: translateY(-2px);
}

.workflow-card:hover .card-cover {
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

.cover-icon {
  color: var(--text-secondary);
}

.loading-state {
  display: flex;
  justify-content: center;
  padding: 24px 0;
}

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
  margin-top: 16px;
  padding: 10px 0;
  text-align: center;
  color: var(--text-secondary);
  cursor: pointer;
  border-radius: 10px;
  background: var(--bg-tertiary);
  transition:
    background 0.2s,
    color 0.2s;
}

.load-more:hover {
  background: var(--bg-primary);
  color: var(--text-primary);
}

.video-badge {
  position: absolute;
  right: 8px;
  bottom: 8px;
  display: flex;
  align-items: center;
  gap: 4px;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  border-radius: 9999px;
  padding: 4px 8px;
}

.panel-slide-enter-active,
.panel-slide-leave-active {
  transition: all 0.25s ease;
}

.panel-slide-enter-from,
.panel-slide-leave-to {
  opacity: 0;
  transform: translateX(-12px);
}

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
  background: rgba(120, 120, 120, 0.5);
}
</style>
