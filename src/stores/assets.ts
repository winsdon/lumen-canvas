import { reactive, ref } from 'vue'
import type { PageResult } from '@/types/api'
import { deleteAsset, getAssetPage, importAsset, updateAsset, updateAssetTags } from '@/api/asset'
import { getFilePresignedUrl, uploadFileToUrl } from '@/api/file'

const USE_MOCK = import.meta.env.VITE_USE_ASSET_MOCK === 'true'
const USE_LOCAL_FALLBACK = import.meta.env.DEV
const PAGE_SIZE = 24
const LOCAL_STORAGE_KEY = 'lumen:collector-assets'

export interface Asset {
  id: string | number
  source?: string
  sourceUrl?: string
  assetType?: string
  imageUrl?: string
  videoUrl?: string
  prompt?: string
  platform?: string
  model?: string
  category?: string
  notes?: string
  tags?: string[]
  fileSize?: number
  width?: number
  height?: number
  createTime?: string
  [key: string]: unknown
}

interface AssetFilters {
  source: string | null
  assetType: string | null
  keyword: string
  tag: string | null
  category: string | null
  platform: string | null
}

export interface SaveAssetFields {
  source?: string
  sourceUrl?: string
  assetType?: string
  imageUrl?: string
  videoUrl?: string
  prompt?: string
  platform?: string
  model?: string
  category?: string
  notes?: string
  tags?: string[]
  width?: number
  height?: number
  fileSize?: number
  contentHash?: string
  metadata?: Record<string, unknown> | string
}

interface PresignedUrl {
  uploadUrl: string
  url: string
}

export const list = ref<Asset[]>([])
export const page = ref(1)
export const total = ref(0)
export const hasMore = ref(true)
export const loading = ref(false)
export const uploading = ref(false)

export const filters = reactive<AssetFilters>({
  source: null,
  assetType: null,
  keyword: '',
  tag: null,
  category: null,
  platform: null
})

let requestToken = 0
let localFallbackActive = false

const prunedFilters = () => {
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(filters)) {
    if (value !== null && value !== '') out[key] = value
  }
  return out
}

export const loadMore = async () => {
  if (loading.value || !hasMore.value) return
  const token = requestToken
  loading.value = true
  try {
    let result: PageResult<Asset>
    try {
      result = (await getAssetPage({
        pageNo: page.value,
        pageSize: PAGE_SIZE,
        ...prunedFilters()
      })) as PageResult<Asset>
    } catch (error) {
      if (!USE_LOCAL_FALLBACK) throw error
      console.warn('[assets] remote page failed, using local fallback:', error)
      localFallbackActive = true
      result = getLocalAssetPage(page.value, PAGE_SIZE, prunedFilters())
    }
    if (USE_LOCAL_FALLBACK && localFallbackActive) {
      result = getLocalAssetPage(page.value, PAGE_SIZE, prunedFilters())
    }
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
    if (token === requestToken) loading.value = false
  }
}

export const loadMoreRemote = async () => {
  if (loading.value || !hasMore.value) return
  const token = requestToken
  loading.value = true
  try {
    const result = (await getAssetPage({
      pageNo: page.value,
      pageSize: PAGE_SIZE,
      ...prunedFilters()
    })) as PageResult<Asset>
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
    if (token === requestToken) loading.value = false
  }
}

export const reload = async () => {
  requestToken += 1
  list.value = []
  page.value = 1
  hasMore.value = true
  total.value = 0
  loading.value = false
  await loadMore()
}

const saveAssetInternal = async (fields: SaveAssetFields, file?: File, shouldReload = true) => {
  if (shouldReload) uploading.value = true
  try {
    const payload: SaveAssetFields = { ...fields }
    if (file) {
      let imageUrl: string
      if (USE_MOCK) {
        imageUrl = URL.createObjectURL(file)
      } else {
        try {
          const presigned = (await getFilePresignedUrl(file.name)) as PresignedUrl
          await uploadFileToUrl(presigned.uploadUrl, file)
          imageUrl = presigned.url
        } catch (error) {
          if (!USE_LOCAL_FALLBACK) throw error
          localFallbackActive = true
          console.warn('[assets] remote upload failed, using local preview fallback:', error)
          imageUrl = await fileToDataUrl(file)
        }
      }
      const size = await getImageSize(file).catch(() => null)
      payload.imageUrl = imageUrl
      payload.fileSize = file.size
      payload.width = payload.width ?? size?.width
      payload.height = payload.height ?? size?.height
    }

    const importPayload = {
      source: payload.source || 'manual',
      assetType: payload.assetType || 'image',
      ...payload
    }

    let resp
    try {
      resp = await importAsset(importPayload)
    } catch (error) {
      if (!USE_LOCAL_FALLBACK) throw error
      localFallbackActive = true
      console.warn('[assets] remote import failed, saving to local fallback:', error)
      resp = saveLocalAsset(importPayload)
    }
    if (shouldReload) await reload()
    return resp
  } finally {
    if (shouldReload) uploading.value = false
  }
}

export const saveAsset = async (fields: SaveAssetFields, file?: File) => {
  return saveAssetInternal(fields, file, true)
}

export const saveAssetsBatch = async (
  items: Array<{ fields: SaveAssetFields; file?: File }>,
  onProgress?: (finished: number, total: number) => void
) => {
  uploading.value = true
  const saved = []
  try {
    for (let index = 0; index < items.length; index += 1) {
      const item = items[index]
      saved.push(await saveAssetInternal(item.fields, item.file, false))
      onProgress?.(index + 1, items.length)
    }
    await reload()
    return saved
  } finally {
    uploading.value = false
  }
}

export const upload = async (file: File) => {
  try {
    return await saveAsset({ source: 'local', assetType: 'image' }, file)
  } catch (error) {
    console.error('[assets] upload failed:', error)
    throw error
  }
}

export const remove = async (id: string | number) => {
  await deleteAsset(id)
  deleteLocalAsset(id)
  list.value = list.value.filter(asset => asset.id !== id)
  total.value = Math.max(0, total.value - 1)
}

export const removeMany = async (ids: Array<string | number>) => {
  const idSet = new Set(ids.map(String))
  for (const id of ids) {
    await deleteAsset(id)
  }
  writeLocalAssets(readLocalAssets().filter(asset => !idSet.has(String(asset.id))))
  list.value = list.value.filter(asset => !idSet.has(String(asset.id)))
  total.value = Math.max(0, total.value - ids.length)
}

export const updateTags = async (id: string | number, tags: string[]) => {
  await updateAssetTags(id, tags)
  list.value = list.value.map(asset => (
    asset.id === id ? { ...asset, tags: [...tags] } : asset
  ))
}

export const update = async (id: string | number, fields: SaveAssetFields) => {
  try {
    await updateAsset(id, fields as Record<string, unknown>)
  } catch (error) {
    if (!USE_LOCAL_FALLBACK) throw error
    localFallbackActive = true
    console.warn('[assets] remote update failed, updating local fallback:', error)
  }
  updateLocalAsset(id, fields)
  list.value = list.value.map(asset => (
    String(asset.id) === String(id) ? { ...asset, ...fields, tags: fields.tags ? [...fields.tags] : asset.tags } : asset
  ))
}

export const setFilter = (name: keyof AssetFilters, value: AssetFilters[keyof AssetFilters]) => {
  filters[name] = value as never
}

export const resetFilters = () => {
  filters.source = null
  filters.assetType = null
  filters.keyword = ''
  filters.tag = null
  filters.category = null
  filters.platform = null
}

const getImageSize = (file: File): Promise<{ width: number; height: number }> => new Promise((resolve, reject) => {
  if (!file.type.startsWith('image/')) {
    reject(new Error('Not an image'))
    return
  }
  const url = URL.createObjectURL(file)
  const image = new Image()
  image.onload = () => {
    resolve({ width: image.naturalWidth, height: image.naturalHeight })
    URL.revokeObjectURL(url)
  }
  image.onerror = () => {
    URL.revokeObjectURL(url)
    reject(new Error('Image load failed'))
  }
  image.src = url
})

const fileToDataUrl = (file: File): Promise<string> => new Promise((resolve, reject) => {
  const reader = new FileReader()
  reader.onload = () => resolve(String(reader.result || ''))
  reader.onerror = () => reject(reader.error || new Error('File read failed'))
  reader.readAsDataURL(file)
})

const readLocalAssets = (): Asset[] => {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

const writeLocalAssets = (assets: Asset[]) => {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(assets))
  } catch (error) {
    console.warn('[assets] local fallback persist failed:', error)
  }
}

const deleteLocalAsset = (id: string | number) => {
  writeLocalAssets(readLocalAssets().filter(asset => String(asset.id) !== String(id)))
}

const updateLocalAsset = (id: string | number, fields: SaveAssetFields) => {
  const assets = readLocalAssets()
  const index = assets.findIndex(asset => String(asset.id) === String(id))
  if (index === -1) return
  assets[index] = {
    ...assets[index],
    ...fields,
    tags: fields.tags ? [...fields.tags] : assets[index].tags
  }
  writeLocalAssets(assets)
}

const saveLocalAsset = (payload: Record<string, unknown>) => {
  const asset: Asset = {
    id: `local-${Date.now()}`,
    source: String(payload.source || 'manual'),
    sourceUrl: payload.sourceUrl ? String(payload.sourceUrl) : undefined,
    assetType: String(payload.assetType || 'image'),
    imageUrl: payload.imageUrl ? String(payload.imageUrl) : undefined,
    videoUrl: payload.videoUrl ? String(payload.videoUrl) : undefined,
    prompt: payload.prompt ? String(payload.prompt) : undefined,
    platform: payload.platform ? String(payload.platform) : undefined,
    model: payload.model ? String(payload.model) : undefined,
    category: payload.category ? String(payload.category) : undefined,
    notes: payload.notes ? String(payload.notes) : undefined,
    tags: Array.isArray(payload.tags) ? payload.tags.map(String) : [],
    width: typeof payload.width === 'number' ? payload.width : undefined,
    height: typeof payload.height === 'number' ? payload.height : undefined,
    fileSize: typeof payload.fileSize === 'number' ? payload.fileSize : undefined,
    metadata: payload.metadata,
    createTime: new Date().toISOString()
  }
  writeLocalAssets([asset, ...readLocalAssets()])
  return {
    id: asset.id,
    imageUrl: asset.imageUrl,
    videoUrl: asset.videoUrl,
    duplicated: false
  }
}

const getLocalAssetPage = (
  pageNo: number,
  pageSize: number,
  params: Record<string, unknown>
): PageResult<Asset> => {
  const keyword = String(params.keyword || '').trim().toLowerCase()
  const filtered = readLocalAssets().filter(asset => {
    if (params.source && asset.source !== params.source) return false
    if (params.assetType && asset.assetType !== params.assetType) return false
    if (params.category && asset.category !== params.category) return false
    if (params.platform && asset.platform !== params.platform) return false
    if (params.tag && !asset.tags?.includes(String(params.tag))) return false
    if (keyword) {
      const haystack = [asset.prompt, asset.platform, asset.model, asset.category, asset.notes]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      if (!haystack.includes(keyword)) return false
    }
    return true
  })
  const start = (pageNo - 1) * pageSize
  return {
    list: filtered.slice(start, start + pageSize),
    total: filtered.length
  }
}

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
  saveAsset,
  saveAssetsBatch,
  remove,
  removeMany,
  update,
  updateTags,
  setFilter,
  resetFilters
})
