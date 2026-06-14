import { authRequest } from '@/utils/request'

/**
 * Get file presigned URL for upload
 * 获取文件预签名地址（上传）
 * @param {string} name - File name / 文件名称
 * @param {string} [directory] - Directory / 文件目录
 */
export const getFilePresignedUrl = (name: string, directory?: string) => {
  return authRequest({
    url: '/infra/file/presigned-url',
    method: 'get',
    params: {
      name,
      directory
    }
  })
}

/**
 * Upload file to presigned URL
 * 上传文件到预签名地址
 * @param {string} uploadUrl - Presigned upload URL / 预签名上传地址
 * @param {File} file - File object / 文件对象
 */
export const uploadFileToUrl = (uploadUrl: string, file: File) => {
  // Use fetch to avoid any interceptors from axios
  // 使用 fetch 避免 axios 拦截器的干扰
  return fetch(uploadUrl, {
    method: 'PUT',
    body: file,
    headers: {
      // Ensure Content-Type matches what might be signed or expected
      'Content-Type': file.type || 'application/octet-stream'
    },
    mode: 'cors'
  }).then(response => {
    if (!response.ok) {
      throw new Error(`Upload failed with status: ${response.status}`)
    }
    return response
  })
}
