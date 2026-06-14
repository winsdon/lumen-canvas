/**
 * Asset library store | 资产库状态管理
 * Manages list, pagination, filters, upload state.
 *
 * Note: Project convention uses plain module-level reactive refs (see projects.js, user.js)
 * rather than Pinia. We follow that convention here for consistency.
 */
import { ref, reactive } from 'vue'
import { getAssetPage, importAsset, deleteAsset, updateAssetTags } from '@/api/asset'
import { getFilePresignedUrl, uploadFileToUrl } from '@/api/file'

const USE_MOCK = import.meta.env.VITE_USE_ASSET_MOCK === 'true'

const PAGE_SIZE = 24

// State | 状态
export const list = ref([])
export const page = ref(1)
export const total = ref(0)
export const hasMore = ref(true)
export const loading = ref(false)
export const uploading = ref(false)

export const filters = reactive({
  source: null,
  assetType: null,
  keyword: '',
  tag: null
})

// Request sequence token: bumped on reload so an in-flight loadMore can be discarded
// 请求序号 token：reload 时自增，使进行中的 loadMore 响应作废
let requestToken = 0

/** Build a filters object with empty/null values pruned. */
const prunedFilters = () => {
  const out = {}
  for (const [k, v] of Object.entries(filters)) {
    if (v !== null && v !== '') out[k] = v
  }
  return out
}

/**
 * Load next page. No-op if already loading or no more pages.
 * 加载下一页
 */
export const loadMore = async () => {
  if (loading.value || !hasMore.value) return
  const token = requestToken
  loading.value = true
  try {
    const result = await getAssetPage({
      pageNo: page.value,
      pageSize: PAGE_SIZE,
      ...prunedFilters()
    })
    // A reload happened during the request — discard this stale response
    // 请求期间发生了 reload —— 丢弃过期响应
    if (token !== requestToken) return
    const newItems = result?.list || []
    list.value = [...list.value, ...newItems]
    total.value = result?.total ?? list.value.length
    hasMore.value = list.value.length < total.value
    page.value += 1
  } catch (error) {
    console.error('[assets] loadMore failed:', error)
    if (token === requestToken) throw error
  } finally {
    // Only clear loading if this request still owns the token
    // 仅当本请求仍持有 token 时才清除 loading
    if (token === requestToken) loading.value = false
  }
}

/**
 * Reset list and reload from page 1 with current filters.
 * 重置并从第一页重新加载。自增 token 使任何进行中的 loadMore 作废。
 */
export const reload = async () => {
  requestToken += 1
  list.value = []
  page.value = 1
  hasMore.value = true
  total.value = 0
  // Force-clear loading so the stale in-flight request can't block this reload
  // 强制清除 loading，避免进行中的过期请求阻塞本次 reload
  loading.value = false
  await loadMore()
}

/**
 * Local file upload — follows canvas image/video upload pattern.
 * 1) presigned URL  2) PUT to OSS  3) /asset/import with the URL.
 *
 * In mock mode, uses a blob URL so dev workflow doesn't hit the network.
 * 本地文件上传：参考画布图片/视频节点，先直传 OSS 再入库元数据。
 */
export const upload = async (file) => {
  uploading.value = true
  try {
    let imageUrl
    if (USE_MOCK) {
      imageUrl = URL.createObjectURL(file)
    } else {
      // 1. presigned URL
      const presigned = await getFilePresignedUrl(file.name)
      // 2. direct PUT to OSS
      await uploadFileToUrl(presigned.uploadUrl, file)
      imageUrl = presigned.url
    }
    // 3. metadata insert
    const resp = await importAsset({
      source: 'local',
      assetType: 'image',
      imageUrl,
      fileSize: file.size
    })
    // Refresh from page 1 to surface the new item at top.
    await reload()
    return resp
  } catch (error) {
    console.error('[assets] upload failed:', error)
    throw error
  } finally {
    uploading.value = false
  }
}

/**
 * Delete an asset and remove from local list (immutable update).
 * 删除资产
 */
export const remove = async (id) => {
  await deleteAsset(id)
  list.value = list.value.filter(a => a.id !== id)
  total.value = Math.max(0, total.value - 1)
}

/**
 * Update tags (full replace, immutable).
 * 更新标签
 */
export const updateTags = async (id, tags) => {
  await updateAssetTags(id, tags)
  list.value = list.value.map(a =>
    a.id === id ? { ...a, tags: [...tags] } : a
  )
}

/** Set a single filter value. */
export const setFilter = (name, value) => {
  if (name in filters) {
    filters[name] = value
  }
}

/** Reset all filters to defaults. */
export const resetFilters = () => {
  filters.source = null
  filters.assetType = null
  filters.keyword = ''
  filters.tag = null
}

/**
 * Composable wrapper — provides Pinia-like API surface for components/tests
 * that prefer a `useAssetsStore()` accessor.
 */
export const useAssetsStore = () => ({
  list,
  page,
  total,
  hasMore,
  loading,
  uploading,
  filters,
  reload,
  loadMore,
  upload,
  remove,
  updateTags,
  setFilter,
  resetFilters
})
