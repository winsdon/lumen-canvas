/**
 * Asset Library API | 资产库 API
 *
 * Upload pattern mirrors canvas image/video nodes (see ImageNode.vue):
 *   1. getFilePresignedUrl(name) → { uploadUrl, url }
 *   2. uploadFileToUrl(uploadUrl, file)  // PUT directly to OSS
 *   3. importAsset({ ..., imageUrl: url }) // backend stores metadata only
 *
 * 上传流程参考画布图片/视频节点：先取预签名地址直传 OSS，再调用入库接口。
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
 * Import an asset (metadata only — image must already be uploaded to OSS).
 * 入库（图片字节请先通过 /infra/file/presigned-url 直传 OSS，本接口只存元数据）。
 *
 * @param {Object} fields - {
 *   source, assetType, imageUrl,           // required
 *   sourceUrl, prompt, videoUrl,           // optional
 *   width, height, fileSize, contentHash,  // optional, frontend-precomputed
 *   metadata                               // optional JSON string
 * }
 */
export const importAsset = (fields) => {
  if (USE_MOCK) return mockImport(fields)
  return authRequest.post('/asset/import', fields)
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
