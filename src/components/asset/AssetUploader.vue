<template>
  <div
    class="asset-uploader"
    :class="{ 'is-dragging': isDragging }"
    @dragover.prevent="isDragging = true"
    @dragenter.prevent="isDragging = true"
    @dragleave.prevent="isDragging = false"
    @drop.prevent="onDrop"
  >
    <input
      ref="fileInput"
      type="file"
      accept="image/*"
      multiple
      style="display:none"
      @change="onSelect"
    />
    <div class="uploader-content" @click="fileInput.click()">
      <div class="uploader-icon">+</div>
      <div class="uploader-hint">
        {{ isUploading ? `上传中… (${doneCount}/${totalCount})` : '点击或拖入文件上传' }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { upload as storeUpload } from '@/stores/assets'

const fileInput = ref(null)
const isDragging = ref(false)
const isUploading = ref(false)
const totalCount = ref(0)
const doneCount = ref(0)

async function uploadAll(files) {
  if (!files || files.length === 0) return
  isUploading.value = true
  totalCount.value = files.length
  doneCount.value = 0
  try {
    for (const f of files) {
      if (!f.type.startsWith('image/')) continue
      try {
        await storeUpload(f)
      } catch (err) {
        console.error('Upload failed for', f.name, err)
        // continue with remaining files
      }
      doneCount.value += 1
    }
  } finally {
    isUploading.value = false
  }
}

function onSelect(e) {
  uploadAll(Array.from(e.target.files || []))
  e.target.value = ''  // reset so same file can be re-picked
}

function onDrop(e) {
  isDragging.value = false
  uploadAll(Array.from(e.dataTransfer.files || []))
}
</script>

<style scoped>
.asset-uploader {
  border: 2px dashed var(--border-color);
  border-radius: 8px;
  padding: 24px 16px;
  margin: 8px;
  text-align: center;
  transition: background 0.15s, border-color 0.15s;
  cursor: pointer;
}
.asset-uploader.is-dragging {
  border-color: var(--accent-color);
  background: var(--bg-tertiary);
}
.uploader-content { display: flex; flex-direction: column; align-items: center; gap: 8px; }
.uploader-icon {
  font-size: 32px; line-height: 1; color: var(--text-secondary);
}
.uploader-hint { font-size: 13px; color: var(--text-secondary); }
</style>
