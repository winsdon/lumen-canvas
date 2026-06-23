<template>
  <div class="collector-page">
    <AppHeader @login="handleShowLogin">
      <template #left>
        <button class="nav-back" @click="router.push('/')">
          <n-icon :size="18"><ArrowBackOutline /></n-icon>
          首页
        </button>
      </template>
    </AppHeader>

    <main class="collector-shell" :class="{ 'upload-focus': uploadFocus }">
      <aside class="filter-panel">
        <div class="collector-brand">
          <div class="brand-mark">
            <img :src="collectorIpCharacter" alt="素材行动站 IP" />
          </div>
          <div>
            <h1>素材行动站</h1>
            <p>截图、Prompt、平台、分类</p>
          </div>
        </div>

        <div class="sidebar-card category-card">
          <div class="sidebar-card-head">
            <strong>分类</strong>
            <button class="sidebar-add-btn" type="button" title="新增分类" @click="addCategory">+</button>
          </div>
          <button
            v-for="category in sidebarCategories"
            :key="category.value"
            class="category-row"
            :class="{ active: sidebarCategoryValue === category.value }"
            type="button"
            @click="selectCategory(category.value)"
          >
            <span>{{ category.label }}</span>
            <span>{{ category.count }}</span>
          </button>
        </div>

        <div class="sidebar-card">
          <label class="sidebar-label">平台</label>
          <n-select
            :value="sidebarPlatformValue"
            clearable
            :options="sidebarPlatformOptions"
            placeholder="全部平台"
            @update:value="selectPlatform"
          />
        </div>

        <button class="sidebar-theme-btn" type="button" title="主题" />
      </aside>

      <section class="asset-panel">
        <div class="collector-hero-banner" :style="{ '--ip-pop-image': `url(${collectorIpPop})` }">
          <div>
            <span>素材采集挑战</span>
            <strong>正在进行中</strong>
          </div>
          <div class="banner-ip-wrap" aria-hidden="true">
            <img class="banner-ip-character" :src="collectorIpCharacter" alt="" />
          </div>
        </div>

        <div class="panel-header">
          <div>
            <h2>我的素材</h2>
            <p>{{ total }} 个素材</p>
          </div>
          <div class="library-actions">
            <n-button secondary size="small" :disabled="!list.length" @click="enterSelectionMode('move')">移动</n-button>
            <div v-if="batchMode === 'move'" class="move-controls">
              <n-select v-model:value="moveCategory" tag size="small" :options="categoryOptions" />
              <n-button secondary size="small" :disabled="!checkedCount" @click="moveSelectedAssets">
                确认移动{{ checkedCount ? `(${checkedCount})` : '' }}
              </n-button>
            </div>
            <n-button
              size="small"
              type="error"
              secondary
              :disabled="batchMode === 'delete' ? !checkedCount : !list.length"
              @click="deleteCheckedAssets"
            >
              {{ batchMode === 'delete' ? `确认删除${checkedCount ? `(${checkedCount})` : ''}` : '批量删除' }}
            </n-button>
            <n-button v-if="batchMode" size="small" quaternary @click="exitSelectionMode">取消</n-button>
            <n-button size="small" quaternary @click="clearFilters">清除筛选</n-button>
            <n-button quaternary size="small" @click="reloadAssets">
              <template #icon><n-icon><RefreshOutline /></n-icon></template>
              刷新
            </n-button>
          </div>
        </div>

        <div v-if="list.length" class="asset-grid">
          <article
            v-for="asset in list"
            :key="asset.id"
            class="asset-card"
            :class="{ selected: selectedAsset?.id === asset.id, selectable: Boolean(batchMode), checked: isAssetChecked(asset.id) }"
            @click="handleAssetCardClick(asset)"
          >
            <label v-if="batchMode" class="asset-check" @click.stop>
              <input type="checkbox" :checked="isAssetChecked(asset.id)" @change="toggleAssetChecked(asset.id, ($event.target as HTMLInputElement).checked)" />
            </label>
            <div class="asset-cover">
              <img v-if="asset.imageUrl" :src="asset.imageUrl" :alt="asset.prompt || '素材图片'" loading="lazy" />
              <div v-else class="asset-placeholder">无预览</div>
            </div>
            <div class="asset-info">
              <p class="asset-prompt">{{ asset.prompt || '未填写 prompt' }}</p>
              <div class="asset-meta">
                <span>{{ asset.category || '未分类' }}</span>
                <span>{{ asset.platform || '手动' }}</span>
              </div>
              <div v-if="asset.tags?.length" class="tag-row">
                <n-tag v-for="tag in asset.tags.slice(0, 3)" :key="tag" size="small" round>{{ tag }}</n-tag>
              </div>
            </div>
            <button class="edit-button" title="编辑素材" @click.stop="openEditAsset(asset)">
              <n-icon :size="16"><CreateOutline /></n-icon>
            </button>
            <button class="delete-button" title="删除素材" @click.stop="deleteCurrent(asset.id)">
              <n-icon :size="16"><TrashOutline /></n-icon>
            </button>
          </article>
        </div>

        <div v-else class="empty-state">
          <img v-if="!loading" :src="collectorEmptyPreview" alt="暂无数据" />
          <p>{{ loading ? '素材加载中' : '还没有采集素材' }}</p>
        </div>

        <div v-if="hasMore" class="load-row">
          <n-button :loading="loading" @click="loadMoreAssets">加载更多</n-button>
        </div>
      </section>

      <aside class="form-panel capture-panel">
        <div class="capture-top">
          <div class="capture-head">
            <h2>采集确认</h2>
            <div class="capture-head-actions">
              <button
                class="capture-icon-btn collapse-btn"
                type="button"
                :title="uploadFocus ? '显示完整素材库' : '只显示上传面板'"
                :aria-label="uploadFocus ? '显示完整素材库' : '只显示上传面板'"
                @click="toggleUploadFocus"
              />
              <span class="capture-status">{{ selectedFile ? '已选择' : '待上传' }}</span>
            </div>
          </div>

          <div class="capture-ip-card">
            <img :src="collectorIpCharacter" alt="采集助手" />
            <div>
              <strong>小鹿助手待命</strong>
              <span>上传截图后自动记录灵感线索</span>
            </div>
          </div>
        </div>

        <div class="capture-scroll">
          <input ref="fileInput" type="file" accept="image/*" hidden @change="onFileChange" />
          <n-button class="upload-primary" block :disabled="importing" @click="fileInput?.click()">上传截图</n-button>

          <div class="import-actions">
            <input ref="batchImageInput" type="file" accept="image/*" multiple hidden @change="onBatchImageChange" />
            <input ref="docxInput" type="file" accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" multiple hidden @change="onDocxChange" />
            <n-button class="outline-action" :disabled="importing" @click="batchImageInput?.click()">批量导入</n-button>
            <n-button class="outline-action" :disabled="importing || docxParsing" @click="docxInput?.click()">导入 Docx</n-button>
            <n-button class="outline-action clipboard-action" :disabled="importing" @click="readClipboardImage">读取剪贴板</n-button>
          </div>

          <div v-if="importProgress.active" class="import-progress">
            <span>{{ importProgress.text }}</span>
            <span>{{ importProgress.finished }}/{{ importProgress.total }}</span>
          </div>

          <div class="upload-box" :class="{ active: previewUrl }" @click="fileInput?.click()">
            <img v-if="previewUrl" :src="previewUrl" alt="素材预览" />
            <div v-else class="preview-empty">截图预览</div>
          </div>

          <button class="use-full-button" type="button" @click="handleUseFullImage">使用全图</button>

          <p class="capture-hint">默认保存整张截图；需要只保存局部时，可在预览上拖拽框选。</p>

          <n-form label-placement="top" class="collector-form">
            <n-form-item label="Prompt">
              <n-input v-model:value="form.prompt" type="textarea" :autosize="{ minRows: 4, maxRows: 8 }" />
            </n-form-item>
            <div class="two-col">
              <n-form-item label="平台">
                <n-select
                  v-model:value="form.platform"
                  tag
                  filterable
                  clearable
                  :options="platformOptions"
                  placeholder="例如 即梦"
                />
              </n-form-item>
              <n-form-item label="模型">
                <n-select v-model:value="form.model" tag filterable clearable :options="modelOptions" placeholder="可选" />
              </n-form-item>
            </div>
            <div class="two-col">
              <n-form-item label="分类">
                <n-select v-model:value="form.category" tag :options="categoryOptions" placeholder="其他" />
              </n-form-item>
              <n-form-item label="标签">
                <n-input v-model:value="tagInput" placeholder="用逗号分隔，例如 海报, 国风" />
              </n-form-item>
            </div>
            <n-form-item label="备注">
              <n-input v-model:value="form.notes" type="textarea" :autosize="{ minRows: 4, maxRows: 4 }" />
            </n-form-item>
          </n-form>

          <n-button class="save-asset-button" :disabled="!selectedFile" :loading="uploading" @click="submitAsset">
            保存素材
          </n-button>
        </div>
      </aside>
    </main>

    <n-modal v-model:show="showDocxModal" preset="card" title="导入 Docx" class="docx-modal">
      <div class="docx-modal-body">
        <div class="docx-modal-toolbar">
          <div>
            <strong>{{ docxAssets.length }} 个素材</strong>
            <p>确认前可调整 prompt、平台、模型、分类、标签和备注。</p>
          </div>
          <n-button secondary :loading="docxParsing" @click="docxInput?.click()">重新选择</n-button>
        </div>

        <div v-if="!docxAssets.length" class="docx-empty">
          <n-icon :size="40"><DocumentTextOutline /></n-icon>
          <p>{{ docxParsing ? 'Docx 解析中' : '未解析到素材' }}</p>
        </div>

        <div v-else class="docx-table-wrap">
          <table class="docx-table">
            <thead>
              <tr>
                <th>预览</th>
                <th>Prompt</th>
                <th>平台/模型</th>
                <th>分类</th>
                <th>标签</th>
                <th>备注</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(asset, index) in docxAssets" :key="asset.id">
                <td>
                  <img class="docx-thumb" :src="asset.previewUrl" :alt="asset.sourceName" />
                </td>
                <td>
                  <n-input v-model:value="asset.prompt" type="textarea" :autosize="{ minRows: 3, maxRows: 8 }" />
                </td>
                <td>
                  <div class="docx-stack">
                    <n-input v-model:value="asset.platform" placeholder="平台" />
                    <n-input v-model:value="asset.model" placeholder="模型" />
                  </div>
                </td>
                <td>
                  <n-select v-model:value="asset.category" tag :options="categoryOptions" />
                </td>
                <td>
                  <n-input :value="asset.tags.join(', ')" placeholder="逗号分隔" @update:value="value => updateDocxTags(index, value)" />
                </td>
                <td>
                  <n-input v-model:value="asset.notes" type="textarea" :autosize="{ minRows: 2, maxRows: 5 }" />
                </td>
                <td>
                  <n-button quaternary circle title="删除" @click="removeDocxAsset(index)">
                    <template #icon><n-icon><TrashOutline /></n-icon></template>
                  </n-button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="docx-footer">
          <n-button @click="showDocxModal = false">取消</n-button>
          <n-button type="primary" :disabled="!docxAssets.length" :loading="importing" @click="confirmDocxImport">
            确认导入素材
          </n-button>
        </div>
      </div>
    </n-modal>

    <n-modal v-model:show="showEditModal" preset="card" title="编辑素材" class="edit-asset-modal">
      <div class="edit-asset-body">
        <button v-if="editingAsset?.imageUrl" class="edit-preview" type="button" title="点击放大预览" @click="openImagePreview">
          <img :src="editingAsset.imageUrl" :alt="editForm.prompt || '素材图片'" />
        </button>
        <n-form label-placement="top" class="collector-form">
          <n-form-item label="Prompt">
            <n-input v-model:value="editForm.prompt" type="textarea" :autosize="{ minRows: 4, maxRows: 8 }" />
          </n-form-item>
          <div class="edit-prompt-actions">
            <n-button quaternary size="small" :loading="reversePromptLoading" :disabled="!editingAsset?.imageUrl || reversePromptLoading" @click="reversePromptFromImage">
              <template #icon><n-icon><SparklesOutline /></n-icon></template>
              反推提示词
            </n-button>
          </div>
          <div class="two-col">
            <n-form-item label="平台">
              <n-select v-model:value="editForm.platform" tag filterable clearable :options="platformOptions" />
            </n-form-item>
            <n-form-item label="模型">
              <n-select v-model:value="editForm.model" tag filterable clearable :options="editModelOptions" />
            </n-form-item>
          </div>
          <div class="two-col">
            <n-form-item label="分类">
              <n-select v-model:value="editForm.category" tag :options="categoryOptions" />
            </n-form-item>
            <n-form-item label="标签">
              <n-dynamic-tags v-model:value="editForm.tags" />
            </n-form-item>
          </div>
          <n-form-item label="备注">
            <n-input v-model:value="editForm.notes" type="textarea" :autosize="{ minRows: 2, maxRows: 5 }" />
          </n-form-item>
        </n-form>
        <div class="edit-footer">
          <n-button @click="showEditModal = false">取消</n-button>
          <n-button type="primary" :loading="savingEdit" @click="saveEditAsset">保存修改</n-button>
        </div>
      </div>
    </n-modal>

    <n-modal v-model:show="showImagePreviewModal" class="image-preview-modal" :mask-closable="true">
      <div class="image-preview-panel">
        <div class="image-preview-head">
          <span>图片预览</span>
          <button type="button" class="image-preview-close" @click="showImagePreviewModal = false">×</button>
        </div>
        <div class="image-preview-modal-body">
          <img v-if="previewImageUrl" :src="previewImageUrl" alt="放大预览" />
        </div>
      </div>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { NButton, NDynamicTags, NForm, NFormItem, NIcon, NInput, NModal, NSelect, NTag } from 'naive-ui'
import {
  ArrowBackOutline,
  CreateOutline,
  DocumentTextOutline,
  RefreshOutline,
  SparklesOutline,
  TrashOutline
} from '@vicons/ionicons5'
import AppHeader from '@/components/AppHeader.vue'
import collectorEmptyPreview from '@/assets/collector-empty-preview.jpg'
import collectorIpCharacter from '@/assets/collector-ip-character.jpg'
import collectorIpPop from '@/assets/collector-ip-pop.jpg'
import { DEFAULT_CHAT_MODEL } from '@/config/models'
import { parseDocxAssets, type ParsedDocxAsset } from '@/utils/docxAssetParser'
import { useChat } from '@/hooks/useApi'
import {
  type Asset,
  type SaveAssetFields,
  filters,
  hasMore,
  list,
  loadMore,
  loading,
  remove,
  removeMany,
  reload,
  resetFilters,
  saveAssetsBatch,
  saveAsset,
  setFilter,
  total,
  update,
  uploading
} from '@/stores/assets'

const router = useRouter()
const selectedAsset = ref<Asset | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const batchImageInput = ref<HTMLInputElement | null>(null)
const docxInput = ref<HTMLInputElement | null>(null)
const selectedFile = ref<File | null>(null)
const previewUrl = ref('')
const tagInput = ref('')
const importing = ref(false)
const docxParsing = ref(false)
const showDocxModal = ref(false)
const docxAssets = ref<ParsedDocxAsset[]>([])
const uploadFocus = ref(false)
const uploadFocusStorageKey = 'sucaiku-upload-focus'
const customCategoryStorageKey = 'sucaiku-custom-categories'
const customCategories = ref<string[]>([])
const batchMode = ref<'move' | 'delete' | null>(null)
const checkedAssetIds = ref<Array<string | number>>([])
const moveCategory = ref('其他')
const showEditModal = ref(false)
const showImagePreviewModal = ref(false)
const previewImageUrl = ref('')
const savingEdit = ref(false)
const editingAsset = ref<Asset | null>(null)
const reversePromptLoading = ref(false)

const reversePromptSystemPrompt = '你是一个专业的图片提示词反推助手。请根据用户提供的图片，快速反推适合用于图像生成的中文提示词。只输出可直接用于生成的提示词，不要解释，不要分点，不要添加多余前缀。'
const { send: sendReversePrompt } = useChat({ systemPrompt: reversePromptSystemPrompt, model: DEFAULT_CHAT_MODEL })

const importProgress = reactive({
  active: false,
  finished: 0,
  total: 0,
  text: ''
})

const form = reactive({
  prompt: '',
  platform: '',
  model: '',
  category: '其他',
  tags: [] as string[],
  notes: ''
})
const editForm = reactive({
  prompt: '',
  platform: '',
  model: '',
  category: '其他',
  tags: [] as string[],
  notes: ''
})

const ALL_FILTER_VALUE = '__all__'
const platformModelMap: Record<string, string[]> = {
  即梦: ['图片3.0', '图片4.0', '图片4.5', '图片5.0 Lite'],
  ChatGPT: ['gpt-image-2', 'gpt-image-1'],
  'Google Gemini': ['Nano Banana 2', 'Nano Banana Pro', 'Nano Banana']
}
const baseCategories = ['UI', '平面', '电商', '国漫', '摄影', '插画', '产品', '空间', '角色', '其他']

const categoryOptions = computed(() => {
  const fromAssets = list.value.map(asset => asset.category).filter(Boolean) as string[]
  return Array.from(new Set([...baseCategories, ...customCategories.value, ...fromAssets])).map(value => ({ label: value, value }))
})
const sidebarCategories = computed(() => {
  const counts = new Map<string, number>()
  for (const asset of list.value) {
    const category = asset.category || '其他'
    counts.set(category, (counts.get(category) || 0) + 1)
  }
  return [
    { label: '全部', value: ALL_FILTER_VALUE, count: total.value || list.value.length },
    ...categoryOptions.value.map(item => ({ label: item.label, value: item.value, count: counts.get(item.value) || 0 }))
  ]
})
const sidebarCategoryValue = computed(() => filters.category || ALL_FILTER_VALUE)
const sidebarPlatformValue = computed(() => filters.platform || ALL_FILTER_VALUE)
const platformOptions = computed(() => {
  const fromAssets = list.value.map(asset => asset.platform).filter(Boolean) as string[]
  return Array.from(new Set([...Object.keys(platformModelMap), ...fromAssets])).map(value => ({ label: value, value }))
})
const sidebarPlatformOptions = computed(() => [
  { label: '全部平台', value: ALL_FILTER_VALUE },
  ...platformOptions.value
])
const modelOptions = computed(() => {
  const preset = platformModelMap[form.platform] || []
  const fromAssets = list.value.filter(asset => !form.platform || asset.platform === form.platform).map(asset => asset.model).filter(Boolean) as string[]
  return Array.from(new Set([...preset, ...fromAssets])).map(value => ({ label: value, value }))
})
const editModelOptions = computed(() => {
  const preset = platformModelMap[editForm.platform] || []
  const fromAssets = list.value.filter(asset => !editForm.platform || asset.platform === editForm.platform).map(asset => asset.model).filter(Boolean) as string[]
  return Array.from(new Set([...preset, ...fromAssets])).map(value => ({ label: value, value }))
})
const checkedCount = computed(() => checkedAssetIds.value.length)

watch(() => form.platform, () => { form.model = '' })
watch(() => editForm.platform, () => { editForm.model = '' })

const handleShowLogin = () => {
  window.$showLoginModal?.()
}

const handleUseFullImage = () => {
  window.$message?.info('默认保存整张截图')
}

const loadCustomCategories = () => {
  try {
    const raw = localStorage.getItem(customCategoryStorageKey)
    if (!raw) return
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      customCategories.value = Array.from(new Set(parsed.map(item => String(item).trim()).filter(Boolean)))
    }
  } catch (error) {
    console.warn('[collector] load custom categories failed:', error)
  }
}
const saveCustomCategories = () => {
  localStorage.setItem(customCategoryStorageKey, JSON.stringify(customCategories.value))
}

const toggleUploadFocus = () => {
  uploadFocus.value = !uploadFocus.value
  localStorage.setItem(uploadFocusStorageKey, uploadFocus.value ? '1' : '0')
}

const selectCategory = async (value: string) => {
  setFilter('category', value === ALL_FILTER_VALUE ? null : value)
  setFilter('assetType', 'image')
  await reloadAssets()
}

const selectPlatform = async (value: string | null) => {
  setFilter('platform', !value || value === ALL_FILTER_VALUE ? null : value)
  setFilter('assetType', 'image')
  await reloadAssets()
}

const addCategory = async () => {
  const name = window.prompt('请输入分类名称')
  if (name === null) return
  const category = name.trim().replace(/\s+/g, ' ')
  if (!category) {
    window.$message?.warning('分类名称不能为空')
    return
  }
  const exists = categoryOptions.value.some(item => item.value === category)
  if (!exists) {
    customCategories.value = [...customCategories.value, category]
    saveCustomCategories()
  }
  form.category = category
  moveCategory.value = category
  await selectCategory(category)
  window.$message?.[exists ? 'info' : 'success'](exists ? '分类已存在，已切换到该分类' : '分类已添加')
}

const reloadAssets = async () => {
  try {
    await reload()
  } catch (error) {
    console.error('[collector] reload failed:', error)
    window.$message?.error('素材加载失败')
  }
}

const loadMoreAssets = async () => {
  try {
    await loadMore()
  } catch (error) {
    console.error('[collector] load more failed:', error)
    window.$message?.error('加载更多失败')
  }
}

const clearFilters = async () => {
  resetFilters()
  form.platform = ''
  form.model = ''
  tagInput.value = ''
  await reloadAssets()
}

const enterSelectionMode = (mode: 'move' | 'delete') => {
  batchMode.value = mode
  checkedAssetIds.value = []
  moveCategory.value = categoryOptions.value[0]?.value || '其他'
}
const exitSelectionMode = () => {
  batchMode.value = null
  checkedAssetIds.value = []
}
const isAssetChecked = (id: string | number) => checkedAssetIds.value.some(item => String(item) === String(id))
const toggleAssetChecked = (id: string | number, checked: boolean) => {
  checkedAssetIds.value = checked
    ? Array.from(new Set([...checkedAssetIds.value, id]))
    : checkedAssetIds.value.filter(item => String(item) !== String(id))
}

const handleAssetCardClick = (asset: Asset) => {
  if (batchMode.value) {
    toggleAssetChecked(asset.id, !isAssetChecked(asset.id))
    return
  }
  selectedAsset.value = asset
}

const buildEditableFields = (asset: Asset, overrides: Partial<SaveAssetFields> = {}): SaveAssetFields => ({
  prompt: asset.prompt || '',
  platform: asset.platform || '',
  model: asset.model || '',
  category: asset.category || '其他',
  tags: [...(asset.tags || [])],
  notes: asset.notes || '',
  metadata: asset.metadata as SaveAssetFields['metadata'],
  ...overrides
})

const moveSelectedAssets = async () => {
  if (!checkedAssetIds.value.length) return
  try {
    const ids = [...checkedAssetIds.value]
    for (const id of ids) {
      const asset = list.value.find(item => String(item.id) === String(id))
      if (!asset) continue
      await update(id, buildEditableFields(asset, { category: moveCategory.value }))
    }
    if (selectedAsset.value && ids.some(id => String(id) === String(selectedAsset.value?.id))) {
      selectedAsset.value = { ...selectedAsset.value, category: moveCategory.value }
    }
    exitSelectionMode()
    window.$message?.success('素材已移动')
  } catch (error) {
    console.error('[collector] move failed:', error)
    window.$message?.error('移动失败')
  }
}

const deleteCheckedAssets = async () => {
  if (batchMode.value !== 'delete') {
    enterSelectionMode('delete')
    return
  }
  if (!checkedAssetIds.value.length) return
  const ok = window.confirm(`确定删除选中的 ${checkedAssetIds.value.length} 个素材吗？`)
  if (!ok) return
  try {
    const ids = [...checkedAssetIds.value]
    await removeMany(ids)
    if (selectedAsset.value && ids.some(id => String(id) === String(selectedAsset.value?.id))) {
      selectedAsset.value = null
    }
    exitSelectionMode()
    window.$message?.success('素材已批量删除')
  } catch (error) {
    console.error('[collector] batch delete failed:', error)
    window.$message?.error('批量删除失败')
  }
}

const deleteCurrent = async (id: string | number) => {
  try {
    await remove(id)
    if (selectedAsset.value?.id === id) selectedAsset.value = null
    window.$message?.success('素材已删除')
  } catch (error) {
    console.error('[collector] delete failed:', error)
    window.$message?.error('删除失败')
  }
}

const parseTagInput = (value: string) => value
  .split(/[,，;；、\n]/)
  .map(item => item.trim())
  .filter(Boolean)
  .slice(0, 12)

const currentFormFields = (): SaveAssetFields => ({
  source: 'manual',
  assetType: 'image',
  prompt: form.prompt.trim(),
  platform: form.platform.trim(),
  model: form.model.trim(),
  category: form.category,
  tags: parseTagInput(tagInput.value),
  notes: form.notes.trim(),
  metadata: { collector: 'sucaiku' }
})

const clearForm = () => {
  selectedFile.value = null
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
  previewUrl.value = ''
  if (fileInput.value) fileInput.value.value = ''
  form.prompt = ''
  form.platform = ''
  form.model = ''
  form.category = '其他'
  form.tags = []
  tagInput.value = ''
  form.notes = ''
}

const setSelectedFile = (file: File) => {
  selectedFile.value = file
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
  previewUrl.value = URL.createObjectURL(file)
}

const onFileChange = (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) setSelectedFile(file)
}

const onBatchImageChange = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const files = Array.from(input.files || []).filter(file => file.type.startsWith('image/'))
  input.value = ''
  if (!files.length) {
    window.$message?.warning('请选择图片文件')
    return
  }
  importing.value = true
  importProgress.active = true
  importProgress.finished = 0
  importProgress.total = files.length
  importProgress.text = '批量导入中'
  try {
    const baseFields = currentFormFields()
    const items = files.map(file => ({
      file,
      fields: {
        ...baseFields,
        metadata: { collector: 'sucaiku', importMode: 'batch-image', sourceName: file.name }
      }
    }))
    const saved = await saveAssetsBatch(items, (finished, totalCount) => {
      importProgress.finished = finished
      importProgress.total = totalCount
    })
    selectedAsset.value = list.value.find(asset => asset.id === (saved[0] as { id?: string | number })?.id) || list.value[0] || null
    window.$message?.success(`已导入 ${saved.length} 个素材`)
  } catch (error) {
    console.error('[collector] batch import failed:', error)
    window.$message?.error('批量导入失败')
  } finally {
    importing.value = false
    importProgress.active = false
  }
}

const onDocxChange = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const files = Array.from(input.files || [])
  input.value = ''
  if (!files.length) return
  docxParsing.value = true
  showDocxModal.value = true
  docxAssets.value = []
  try {
    docxAssets.value = await parseDocxAssets(files)
    if (!docxAssets.value.length) {
      window.$message?.warning('Docx 未解析到素材')
    }
  } catch (error) {
    console.error('[collector] docx parse failed:', error)
    window.$message?.error('Docx 解析失败')
  } finally {
    docxParsing.value = false
  }
}

const updateDocxTags = (index: number, value: string) => {
  const asset = docxAssets.value[index]
  if (!asset) return
  asset.tags = value.split(/[,，;；、\n]/).map(item => item.trim()).filter(Boolean).slice(0, 12)
}

const removeDocxAsset = (index: number) => {
  docxAssets.value.splice(index, 1)
}

const confirmDocxImport = async () => {
  if (!docxAssets.value.length) return
  importing.value = true
  importProgress.active = true
  importProgress.finished = 0
  importProgress.total = docxAssets.value.length
  importProgress.text = 'Docx 导入中'
  try {
    const items = docxAssets.value.map(asset => ({
      file: asset.imageFile,
      fields: {
        source: 'docx',
        assetType: 'image',
        prompt: asset.prompt.trim(),
        platform: asset.platform.trim(),
        model: asset.model.trim(),
        category: asset.category || '其他',
        tags: asset.tags,
        notes: asset.notes.trim(),
        metadata: {
          collector: 'sucaiku',
          importMode: 'docx',
          sourceName: asset.sourceName
        }
      }
    }))
    const saved = await saveAssetsBatch(items, (finished, totalCount) => {
      importProgress.finished = finished
      importProgress.total = totalCount
    })
    selectedAsset.value = list.value.find(asset => asset.id === (saved[0] as { id?: string | number })?.id) || list.value[0] || null
    window.$message?.success(`Docx 已导入 ${saved.length} 个素材`)
    showDocxModal.value = false
    docxAssets.value = []
  } catch (error) {
    console.error('[collector] docx import failed:', error)
    window.$message?.error('Docx 导入失败')
  } finally {
    importing.value = false
    importProgress.active = false
  }
}

const readClipboardImage = async () => {
  try {
    const items = await navigator.clipboard.read()
    for (const item of items) {
      const imageType = item.types.find(type => type.startsWith('image/'))
      if (!imageType) continue
      const blob = await item.getType(imageType)
      const file = new File([blob], `clipboard-${Date.now()}.${imageType.split('/')[1] || 'png'}`, { type: imageType })
      setSelectedFile(file)
      window.$message?.success('已读取剪贴板图片')
      return
    }
    window.$message?.warning('剪贴板里没有图片')
  } catch (error) {
    console.error('[collector] clipboard read failed:', error)
    window.$message?.error('读取剪贴板失败')
  }
}

const openEditAsset = (asset: Asset) => {
  editingAsset.value = asset
  previewImageUrl.value = asset.imageUrl || ''
  editForm.prompt = asset.prompt || ''
  editForm.platform = asset.platform || ''
  editForm.model = asset.model || ''
  editForm.category = asset.category || '其他'
  editForm.tags = [...(asset.tags || [])]
  editForm.notes = asset.notes || ''
  showEditModal.value = true
}

const openImagePreview = () => {
  if (!editingAsset.value?.imageUrl) return
  previewImageUrl.value = editingAsset.value.imageUrl
  showImagePreviewModal.value = true
}

const saveEditAsset = async () => {
  if (!editingAsset.value) return
  savingEdit.value = true
  try {
    const fields = {
      prompt: editForm.prompt.trim(),
      platform: editForm.platform.trim(),
      model: editForm.model.trim(),
      category: editForm.category || '其他',
      tags: [...editForm.tags],
      notes: editForm.notes.trim()
    }
    await update(editingAsset.value.id, fields)
    selectedAsset.value = selectedAsset.value?.id === editingAsset.value.id ? { ...selectedAsset.value, ...fields } : selectedAsset.value
    editingAsset.value = { ...editingAsset.value, ...fields }
    showEditModal.value = false
    window.$message?.success('素材已更新')
  } catch (error) {
    console.error('[collector] edit failed:', error)
    window.$message?.error('素材更新失败')
  } finally {
    savingEdit.value = false
  }
}

const reversePromptFromImage = async () => {
  if (!editingAsset.value?.imageUrl) return
  reversePromptLoading.value = true
  try {
    const result = await sendReversePrompt(
      '请根据图片快速反推适合用于图像生成的中文提示词，只输出可直接使用的提示词，不要解释，不要分点。',
      true,
      DEFAULT_CHAT_MODEL,
      [editingAsset.value.imageUrl],
      { deductPoint: true }
    )
    if (result?.trim()) {
      editForm.prompt = result.trim()
    }
    window.$message?.success('已反推提示词')
  } catch (error) {
    console.error('[collector] reverse prompt failed:', error)
    const message = error instanceof Error ? error.message : '反推提示词失败'
    window.$message?.error(message)
  } finally {
    reversePromptLoading.value = false
  }
}

const submitAsset = async () => {
  if (!selectedFile.value) return
  try {
    const resp = await saveAsset(currentFormFields(), selectedFile.value)
    selectedAsset.value = list.value.find(asset => asset.id === (resp as { id?: string | number }).id) || list.value[0] || null
    clearForm()
    window.$message?.success('素材已保存')
  } catch (error) {
    console.error('[collector] save failed:', error)
    window.$message?.error('素材保存失败')
  }
}

onMounted(async () => {
  uploadFocus.value = localStorage.getItem(uploadFocusStorageKey) === '1'
  loadCustomCategories()
  setFilter('assetType', 'image')
  await reloadAssets()
})
</script>

<style scoped>
.collector-page {
  min-height: 100vh;
  --station-lime: #bfff00;
  --station-lime-deep: #9be000;
  --station-black: #050505;
  --station-ink: #111111;
  --station-muted: #6f747d;
  --station-soft: #f2f3f5;
  --station-line: #e7e9ee;
  background: #eef0f2;
  color: var(--station-ink);
}

.nav-back {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--station-ink);
  font-weight: 800;
}

.collector-shell {
  display: grid;
  grid-template-columns: 244px minmax(0, 1fr) 320px;
  gap: 18px;
  width: min(100%, calc(100vw - 36px));
  max-width: none;
  margin: 0 auto;
  padding: 18px 0 28px;
}

.collector-shell.upload-focus {
  grid-template-columns: 320px;
  max-width: none;
  min-height: calc(100vh - 72px);
  justify-content: end;
}

.collector-shell.upload-focus .filter-panel,
.collector-shell.upload-focus .asset-panel {
  display: none;
}

.collector-shell.upload-focus .form-panel {
  width: min(320px, calc(100vw - 48px));
}

.asset-panel,
.form-panel {
  border: 0;
  border-radius: 28px;
  background: #fff;
  box-shadow: 0 18px 44px rgb(17 17 17 / 0.08);
}

.form-panel {
  align-self: start;
  display: flex;
  flex-direction: column;
  gap: 12px;
  position: sticky;
  top: 12px;
  height: calc(100vh - 88px);
  overflow: hidden;
  padding: 18px;
}

.filter-panel {
  position: sticky;
  top: 12px;
  display: flex;
  min-height: calc(100vh - 88px);
  flex-direction: column;
  gap: 14px;
  overflow: hidden;
  border: 0;
  border-radius: 32px;
  background:
    radial-gradient(circle at 18% 12%, rgb(5 5 5 / 0.045) 0 9%, transparent 9.4%),
    radial-gradient(circle at 88% 28%, rgb(5 5 5 / 0.04) 0 8%, transparent 8.4%),
    radial-gradient(circle at 28% 74%, rgb(5 5 5 / 0.035) 0 10%, transparent 10.5%),
    var(--station-lime);
  padding: 22px 18px;
  box-shadow: 0 20px 48px rgb(134 189 0 / 0.22);
}

.capture-panel { gap: 12px; }
.capture-top {
  display: flex;
  flex: 0 0 auto;
  flex-direction: column;
  gap: 12px;
}
.capture-scroll {
  display: flex;
  min-height: 0;
  flex: 1 1 auto;
  flex-direction: column;
  gap: 12px;
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 2px;
  scrollbar-gutter: stable;
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.capture-scroll::-webkit-scrollbar { width: 0; height: 0; }
.capture-head { display: flex; align-items: center; justify-content: space-between; min-height: 30px; }
.capture-head h2 { color: var(--station-black); font-size: 20px; font-weight: 900; letter-spacing: 0; }
.capture-head-actions { display: flex; align-items: center; gap: 8px; }
.capture-icon-btn {
  position: relative;
  display: inline-flex;
  width: 28px;
  height: 28px;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--station-black);
  border-radius: 999px;
  background: #fff;
  color: var(--station-black);
}
.capture-icon-btn:hover { background: #f8fafc; }
.collapse-btn::before,
.collapse-btn::after { position: absolute; content: ''; border-color: currentColor; }
.collapse-btn::before { width: 12px; height: 12px; border: 2px solid currentColor; }
.collapse-btn::after { width: 7px; height: 7px; border-top: 2px solid currentColor; border-left: 2px solid currentColor; transform: translate(4px, 4px); }
.collector-shell.upload-focus .collapse-btn::after { transform: translate(-4px, -4px) rotate(180deg); }
.capture-status {
  min-width: 58px;
  border: 0;
  border-radius: 999px;
  padding: 5px 10px;
  background: var(--station-soft);
  color: var(--station-muted);
  font-size: 13px;
  line-height: 1;
  text-align: center;
}

h1,
h2,
p { margin: 0; }
h1 { font-size: 22px; line-height: 1.25; }
h2 { font-size: 17px; }
.panel-header p { font-size: 12px; color: var(--station-muted); }

.collector-brand { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 20px; }
.brand-mark {
  width: 52px;
  height: 52px;
  flex: 0 0 auto;
  overflow: hidden;
  border: 4px solid var(--station-black);
  border-radius: 16px;
  background: #fff;
  transform: rotate(-4deg);
  box-shadow: 6px 6px 0 rgb(0 0 0 / 0.16);
}
.brand-mark img { width: 100%; height: 100%; object-fit: cover; object-position: 50% 18%; display: block; transform: scale(1.22); }
.collector-brand h1 { color: var(--station-black); font-size: 22px; font-weight: 950; line-height: 1.15; }
.collector-brand p { max-width: 142px; margin-top: 4px; color: rgb(5 5 5 / 0.62); font-size: 13px; line-height: 1.45; font-weight: 700; }

.sidebar-card {
  border: 0;
  border-radius: 22px;
  background: rgb(255 255 255 / 0.94);
  padding: 12px;
  box-shadow: 0 12px 26px rgb(5 5 5 / 0.08);
}
.sidebar-card-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 12px; }
.sidebar-card-head strong,
.sidebar-label { color: var(--station-black); font-size: 16px; font-weight: 950; }
.sidebar-add-btn {
  display: grid;
  width: 32px;
  height: 32px;
  place-items: center;
  border: 0;
  border-radius: 12px;
  background: var(--station-black);
  color: #fff;
  font-size: 18px;
  font-weight: 950;
  line-height: 1;
}
.category-card { padding-bottom: 14px; }
.category-row {
  display: flex;
  width: 100%;
  min-height: 40px;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border-radius: 14px;
  padding: 0 12px;
  color: var(--station-ink);
  font-size: 14px;
  font-weight: 800;
  text-align: left;
}
.category-row span:last-child {
  min-width: 24px;
  border-radius: 999px;
  background: var(--station-soft);
  color: var(--station-ink);
  font-size: 12px;
  line-height: 24px;
  text-align: center;
}
.category-row.active { background: var(--station-black); color: #fff; }
.category-row.active span:last-child { background: var(--station-lime); color: var(--station-black); }
.sidebar-card :deep(.n-base-selection) { margin-top: 12px; border-radius: 16px; }
.sidebar-theme-btn {
  position: relative;
  display: grid;
  width: 36px;
  height: 36px;
  margin-top: auto;
  place-items: center;
  border: 0;
  border-radius: 999px;
  background: #fff;
  box-shadow: 0 10px 24px rgb(5 5 5 / 0.1);
}
.sidebar-theme-btn::before { width: 12px; height: 12px; border: 2px solid var(--station-black); border-radius: 50%; content: ''; }
.sidebar-theme-btn::after { position: absolute; width: 22px; height: 22px; border: 2px solid var(--station-black); border-radius: 50%; clip-path: polygon(43% 0, 57% 0, 57% 100%, 43% 100%); content: ''; }

.asset-panel { min-height: calc(100vh - 120px); margin-top: 0; padding: 18px; }
.form-panel { margin-top: 0; }

.collector-hero-banner {
  position: relative;
  display: flex;
  min-height: 148px;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  overflow: hidden;
  border-radius: 16px;
  margin-bottom: 28px;
  padding: 24px 28px;
  background:
    linear-gradient(90deg, rgb(5 5 5 / 0.94) 0%, rgb(5 5 5 / 0.88) 47%, rgb(5 5 5 / 0.32) 72%, rgb(5 5 5 / 0.06) 100%),
    var(--ip-pop-image) right 38% / 54% auto no-repeat,
    linear-gradient(135deg, #111 0%, #060606 54%, #1d2b00 100%);
  color: #fff;
}
.collector-hero-banner::before {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(110deg, rgb(191 255 0 / 0.2) 0 8%, transparent 8% 16%, rgb(191 255 0 / 0.12) 16% 24%, transparent 24%);
  content: '';
}
.collector-hero-banner > div:first-child { position: relative; z-index: 1; display: grid; gap: 6px; }
.collector-hero-banner span { color: rgb(255 255 255 / 0.72); font-size: 22px; font-weight: 800; }
.collector-hero-banner strong { font-size: clamp(28px, 4vw, 44px); font-weight: 950; line-height: 1; }
.banner-ip-wrap {
  position: relative;
  z-index: 1;
  width: min(28vw, 190px);
  height: 122px;
  flex: 0 0 auto;
  align-self: stretch;
  overflow: hidden;
  border: 5px solid var(--station-black);
  border-radius: 28px;
  background:
    radial-gradient(circle at 72% 20%, rgb(191 255 0 / 0.42), transparent 32%),
    #fff;
  box-shadow: 10px 10px 0 rgb(191 255 0 / 0.88), 0 18px 30px rgb(0 0 0 / 0.28);
  transform: rotate(3deg);
}
.banner-ip-character { position: absolute; right: -24px; bottom: -78px; width: 236px; max-width: none; filter: drop-shadow(0 12px 14px rgb(0 0 0 / 0.18)); transform: rotate(-3deg); }

.capture-ip-card {
  display: grid;
  grid-template-columns: 48px minmax(0, 1fr);
  align-items: start;
  gap: 10px;
  overflow: hidden;
  border-radius: 16px;
  padding: 8px 10px 8px 6px;
  background:
    radial-gradient(circle at 18% 18%, rgb(191 255 0 / 0.58), transparent 34%),
    linear-gradient(135deg, #f6ffe1, #fff);
}
.capture-ip-card img { width: 48px; height: 48px; border: 2px solid var(--station-black); border-radius: 14px; object-fit: cover; object-position: 50% 16%; background: #fff; transform: rotate(-4deg) scale(1.03); box-shadow: 4px 4px 0 rgb(5 5 5 / 0.12); }
.capture-ip-card strong,
.capture-ip-card span { display: block; }
.capture-ip-card strong { color: var(--station-black); font-size: 13px; font-weight: 950; line-height: 1.2; }
.capture-ip-card span { margin-top: 2px; color: var(--station-muted); font-size: 11px; line-height: 1.25; font-weight: 700; }

.panel-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 16px; }
.panel-header h2 { color: var(--station-black); font-size: 26px; font-weight: 950; }
.library-actions,
.move-controls { display: flex; align-items: center; flex-wrap: wrap; justify-content: flex-end; gap: 8px; }
.library-actions :deep(.n-button) { --n-border-radius: 999px !important; --n-font-weight: 800 !important; }
.library-actions :deep(.n-button:not(.n-button--error-type)) { --n-text-color: var(--station-black) !important; --n-border: 1px solid transparent !important; --n-border-hover: 1px solid var(--station-lime) !important; --n-color-hover: rgb(191 255 0 / 0.22) !important; }
.move-controls { flex-wrap: nowrap; }
.move-controls :deep(.n-base-selection) { min-width: 138px; }

.asset-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 14px; }
.asset-card {
  position: relative;
  overflow: hidden;
  border: 0;
  border-radius: 18px;
  background: #fff;
  box-shadow: 0 10px 26px rgb(5 5 5 / 0.07);
  cursor: pointer;
  transition: transform 0.16s ease, box-shadow 0.16s ease;
}
.asset-card::before {
  position: absolute;
  z-index: 2;
  inset: 0 0 auto;
  height: 18px;
  background: linear-gradient(180deg, rgb(191 255 0 / 0.86), rgb(191 255 0 / 0));
  content: '';
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.16s ease;
}
.asset-card:hover { transform: translateY(-2px); box-shadow: 0 16px 34px rgb(5 5 5 / 0.11); }
.asset-card:hover::before { opacity: 1; }
.asset-card.selected { box-shadow: 0 0 0 3px var(--station-lime), 0 16px 34px rgb(5 5 5 / 0.12); }
.asset-card.checked { box-shadow: inset 0 0 0 3px var(--station-lime), 0 12px 30px rgb(5 5 5 / 0.1); }
.asset-card.selectable { cursor: default; }
.asset-check {
  position: absolute;
  z-index: 4;
  top: 8px;
  left: 8px;
  display: grid;
  width: 28px;
  height: 28px;
  place-items: center;
  border: 0;
  border-radius: 999px;
  background: rgb(0 0 0 / 0.76);
  box-shadow: 0 8px 20px rgb(5 5 5 / 0.16);
  cursor: pointer;
}
.asset-check input { width: 15px; height: 15px; accent-color: var(--station-black); border-radius: 4px; background: #fff; }
.asset-cover { aspect-ratio: 1 / 1; background: var(--station-soft); }
.asset-cover img { width: 100%; height: 100%; object-fit: cover; display: block; }
.asset-placeholder,
.empty-state { height: 100%; display: flex; align-items: center; justify-content: center; color: var(--station-muted); }
.asset-info { padding: 12px; }
.asset-prompt {
  min-height: 38px;
  display: -webkit-box;
  overflow: hidden;
  color: var(--station-black);
  font-size: 13px;
  font-weight: 800;
  line-height: 1.45;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}
.asset-meta,
.tag-row { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; font-size: 12px; color: var(--station-muted); }
.asset-meta span { border-radius: 999px; background: var(--station-soft); padding: 4px 8px; font-weight: 700; }
.edit-button,
.delete-button {
  position: absolute;
  top: 8px;
  display: flex;
  width: 28px;
  height: 28px;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: rgb(0 0 0 / 0.76);
  color: white;
  opacity: 0;
  transition: opacity 0.15s;
}
.edit-button { right: 44px; }
.delete-button { right: 8px; }
.asset-card:hover .edit-button,
.asset-card:hover .delete-button,
.asset-card.selectable .delete-button { opacity: 1; }
.asset-card.selectable .edit-button { display: none; }

.empty-state {
  min-height: 420px;
  flex-direction: column;
  gap: 10px;
  border: 2px dashed rgb(5 5 5 / 0.1);
  border-radius: 22px;
  background: linear-gradient(180deg, rgb(191 255 0 / 0.18), #fff 32%);
}
.empty-state img { width: min(260px, 64%); max-height: 220px; object-fit: contain; display: block; }
.empty-state p { color: var(--station-muted); font-size: 13px; font-weight: 800; }
.load-row { display: flex; justify-content: center; padding-top: 18px; }

.upload-box {
  min-height: 210px;
  overflow: hidden;
  border: 2px dashed rgb(5 5 5 / 0.12);
  border-radius: 22px;
  background: var(--station-soft);
  cursor: pointer;
}
.upload-box,
.upload-box > div { display: flex; align-items: center; justify-content: center; }
.upload-box > div { flex-direction: column; gap: 10px; color: var(--station-muted); }
.preview-empty { min-height: 210px; color: var(--station-muted); background: var(--station-soft); font-size: 13px; font-weight: 800; }
.upload-box img { width: 100%; height: 100%; max-height: 320px; object-fit: contain; display: block; }

.import-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.clipboard-action { grid-column: 1 / 2; }
.upload-primary {
  --n-color: var(--station-black) !important;
  --n-color-hover: #1b1b1b !important;
  --n-color-pressed: #000 !important;
  --n-color-focus: var(--station-black) !important;
  --n-text-color: #fff !important;
  --n-border: 1px solid var(--station-black) !important;
  --n-border-hover: 1px solid #1b1b1b !important;
  --n-border-pressed: 1px solid #000 !important;
  --n-border-focus: 1px solid var(--station-black) !important;
  height: 48px;
  border-radius: 999px;
  font-weight: 900;
}
.outline-action { height: 40px; border-radius: 999px; border-color: transparent; background: var(--station-soft); font-weight: 800; }
.use-full-button { align-self: flex-end; border-radius: 999px; padding: 6px 12px; background: rgb(191 255 0 / 0.32); color: var(--station-black); font-size: 13px; font-weight: 950; }
.capture-hint { color: var(--station-ink); font-size: 12px; line-height: 1.55; }
.import-progress {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border: 0;
  border-radius: 16px;
  padding: 10px 12px;
  background: rgb(191 255 0 / 0.22);
  color: var(--station-black);
  font-size: 13px;
  font-weight: 800;
}
.collector-form { display: grid; gap: 0; }
.two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.collector-form :deep(.n-form-item) { margin-bottom: 8px; }
.collector-form :deep(.n-form-item-label) { min-height: 20px; padding-bottom: 4px; color: var(--station-black); font-size: 14px; font-weight: 900; }
.collector-form :deep(.n-input),
.collector-form :deep(.n-base-selection) { border-radius: 14px; background: #f5f7fa; border: 1px solid rgb(17 17 17 / 0.08); }
.collector-form :deep(.n-input),
.collector-form :deep(.n-base-selection) { --n-height: 38px !important; }
.collector-form :deep(.n-input__input-el),
.collector-form :deep(.n-input__textarea-el),
.collector-form :deep(.n-base-selection-placeholder),
.collector-form :deep(.n-base-selection-label) { color: var(--station-black); font-size: 13px; font-weight: 800; }
.collector-form :deep(.n-input__placeholder),
.collector-form :deep(.n-base-selection-placeholder) { color: rgb(17 17 17 / 0.58); }
.collector-form :deep(.n-base-selection-label__placeholder) { color: rgb(17 17 17 / 0.58); }
.collector-form :deep(.n-base-selection-input__content) { color: var(--station-black); }
.edit-prompt-actions { display: flex; justify-content: flex-end; margin: -4px 0 4px; }
.edit-prompt-actions :deep(.n-button) { --n-padding-left: 0 !important; --n-padding-right: 0 !important; }
.save-asset-button {
  --n-color: var(--station-lime) !important;
  --n-color-hover: var(--station-lime-deep) !important;
  --n-color-pressed: #90d600 !important;
  --n-color-focus: var(--station-lime) !important;
  --n-text-color: var(--station-black) !important;
  --n-border: 1px solid var(--station-lime) !important;
  --n-border-hover: 1px solid var(--station-lime-deep) !important;
  --n-border-pressed: 1px solid #90d600 !important;
  --n-border-focus: 1px solid var(--station-lime) !important;
  align-self: stretch;
  min-width: 84px;
  height: 48px;
  border-radius: 999px;
  padding: 0 18px;
  font-size: 14px;
  font-weight: 950;
}

.outline-action {
  --n-text-color: var(--station-ink) !important;
  --n-text-color-hover: var(--station-black) !important;
  --n-text-color-pressed: var(--station-black) !important;
  --n-border-hover: 1px solid rgb(17 17 17 / 0.08) !important;
  --n-border-pressed: 1px solid rgb(17 17 17 / 0.12) !important;
}

.collector-form :deep(.n-base-selection .n-base-selection-label__placeholder),
.collector-form :deep(.n-input .n-input__placeholder) {
  color: rgb(17 17 17 / 0.42) !important;
}

@media (max-width: 1120px) {
  .collector-shell { grid-template-columns: 244px minmax(0, 1fr); }
  .form-panel { grid-column: 1 / -1; }
}

@media (max-width: 760px) {
  .collector-page { background: #eef0f2; }
  .collector-shell {
    grid-template-columns: 1fr;
    width: min(100%, calc(100vw - 24px));
    padding: 12px 0 24px;
  }
  .filter-panel { position: static; min-height: auto; border-radius: 28px; }
  .asset-panel,
  .form-panel {
    position: static;
    height: auto;
    overflow: visible;
    border-radius: 24px;
  }
  .collector-hero-banner {
    min-height: 112px;
    margin-bottom: 22px;
    padding: 20px;
    background:
      linear-gradient(90deg, rgb(5 5 5 / 0.95) 0%, rgb(5 5 5 / 0.86) 58%, rgb(5 5 5 / 0.18) 100%),
      var(--ip-pop-image) right 44% / auto 100% no-repeat,
      linear-gradient(135deg, #111 0%, #060606 54%, #1d2b00 100%);
  }
  .collector-hero-banner span { font-size: 18px; }
  .banner-ip-wrap {
    width: 96px;
    height: 86px;
    border-width: 4px;
    border-radius: 22px;
    box-shadow: 6px 6px 0 rgb(191 255 0 / 0.88), 0 14px 22px rgb(0 0 0 / 0.22);
  }
  .banner-ip-character { right: -30px; bottom: -54px; width: 148px; }
  .panel-header { align-items: flex-start; flex-direction: column; }
  .library-actions { justify-content: flex-start; }
  .asset-grid { grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); }
  .two-col { grid-template-columns: 1fr; }
}

:global(.docx-modal) { width: min(1180px, 94vw); }
:global(.edit-asset-modal) { width: min(720px, 94vw); }
.edit-asset-body { display: grid; gap: 16px; }
.edit-preview {
  display: block;
  width: fit-content;
  max-width: 100%;
  overflow: hidden;
  border: 0;
  border-radius: 18px;
  background: var(--station-soft);
  padding: 0;
  cursor: zoom-in;
}
.edit-preview img {
  width: auto;
  max-width: min(100%, 280px);
  max-height: min(40vh, 260px);
  object-fit: contain;
  display: block;
}
.image-preview-modal :deep(.n-modal-body-wrapper) {
  display: flex;
  align-items: flex-start;
  justify-content: flex-start;
  padding: 16px;
}
.image-preview-panel {
  display: grid;
  gap: 12px;
  width: fit-content;
  max-width: calc(100vw - 32px);
}
.image-preview-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: var(--station-black);
  font-size: 14px;
  font-weight: 700;
}
.image-preview-close {
  width: 28px;
  height: 28px;
  border: 0;
  border-radius: 999px;
  background: var(--station-soft);
  color: var(--station-ink);
  font-size: 18px;
  line-height: 1;
}
.image-preview-modal-body {
  display: flex;
  align-items: center;
  justify-content: center;
  background: #111;
  border-radius: 18px;
  padding: 16px;
  width: fit-content;
  min-width: 0;
  max-width: fit-content;
}
.image-preview-modal-body img {
  width: auto;
  max-width: min(78vw, 920px);
  max-height: min(82vh, 920px);
  object-fit: contain;
  display: block;
}
.edit-footer { display: flex; justify-content: flex-end; gap: 10px; }
.docx-modal-body { display: grid; gap: 16px; }
.docx-modal-toolbar,
.docx-footer { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.docx-modal-toolbar p { margin-top: 4px; color: var(--station-muted); font-size: 13px; }
.docx-empty {
  display: flex;
  min-height: 260px;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 10px;
  border: 2px dashed rgb(5 5 5 / 0.12);
  border-radius: 18px;
  color: var(--station-muted);
}
.docx-table-wrap { max-height: 60vh; overflow: auto; border: 1px solid var(--station-line); border-radius: 18px; }
.docx-table { width: 100%; min-width: 1040px; border-collapse: collapse; }
.docx-table th,
.docx-table td { border-bottom: 1px solid var(--station-line); padding: 10px; text-align: left; vertical-align: top; }
.docx-table th { position: sticky; top: 0; z-index: 1; background: var(--station-soft); color: var(--station-muted); font-size: 12px; font-weight: 600; }
.docx-thumb { width: 92px; height: 92px; border-radius: 14px; object-fit: cover; background: var(--station-soft); }
.docx-stack { display: grid; gap: 8px; }
.docx-footer { justify-content: flex-end; }
</style>
