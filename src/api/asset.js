/**
 * Asset Library API | 资产库 API
 */
import { authRequest } from '@/utils/request'
import { mockListPage, mockImport, mockDelete, mockUpdateTags } from '@/components/asset/_mock-data'

const USE_MOCK = import.meta.env.VITE_USE_ASSET_MOCK === 'true'

/**
 * Page list of assets.
 * @param {Object} params - { pageNo, pageSize, source, assetType, keyword, tag }
 */
export const getAssetPage = (params = {}) => {
  if (USE_MOCK) return mockListPage(params)
  return authRequest.get('/asset/page', { params })
}

/**
 * Import an asset (used for local upload here; collector plugin uses same endpoint).
 * @param {Object} fields - { source, sourceUrl, assetType, prompt, metadata, videoUrl }
 * @param {File} imageFile - Image file
 */
export const importAsset = (fields, imageFile) => {
  if (USE_MOCK) {
    return mockImport({ ...fields, imageUrl: URL.createObjectURL(imageFile) })
  }
  const fd = new FormData()
  Object.entries(fields).forEach(([k, v]) => {
    if (v !== undefined && v !== null) fd.append(k, v)
  })
  fd.append('image', imageFile)
  return authRequest.post('/asset/import', fd, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}

/**
 * Delete an asset.
 * @param {number} id
 */
export const deleteAsset = (id) => {
  if (USE_MOCK) return mockDelete(id)
  return authRequest.delete('/asset/delete', { params: { id } })
}

/**
 * Update tags (full replace).
 * @param {number} id
 * @param {string[]} tags
 */
export const updateAssetTags = (id, tags) => {
  if (USE_MOCK) return mockUpdateTags(id, tags)
  return authRequest.put('/asset/tags', { tags }, { params: { id } })
}
