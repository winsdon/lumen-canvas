/**
 * Model API | 模型 API
 */

import { request } from '@/utils'

// 分页查询模型列表
export const getModelPage = (params?: Record<string, unknown>) =>
  request({
    url: `/model/page`,
    method: 'get',
    params: { enable: true, size: 1000, current: 1, ...params }
  })

// 根据类型获取模型列表
export const getModelsByType = async (type: string) => {
  const rsp = (await getModelPage({ type, enable: true, size: 1000, current: 1 })) as
    | { data?: { records?: unknown[] } }
    | undefined
  return rsp?.data?.records || []
}

// 根据全称获取模型详情
export const getModelByFullName = (fullName: string) =>
  request({
    url: `/model/fullName`,
    method: 'get',
    params: { fullName }
  })

// 获取所有模型类型
export const getModelTypes = () =>
  request({
    url: `/model/types`,
    method: 'get'
  })
