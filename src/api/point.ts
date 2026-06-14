
import { authRequest } from '@/utils/request'

/**
 * 创建积分充值记录（发起充值）
 * @param {Object} data
 * @param {number} data.payPrice - 充值金额（单位：分）
 * @param {string} data.channelCode - 支付渠道编码
 */
export const createPointRecharge = (data: Record<string, unknown>) => {
  return authRequest.post('/member/point-recharge/create', data)
}

/**
 * 获得积分充值记录分页
 * @param {Object} params
 * @param {number} params.pageNo - 页码
 * @param {number} params.pageSize - 每页条数
 */
export const getPointRechargePage = (params: Record<string, unknown>) => {
  return authRequest.get('/member/point-recharge/page', { params })
}

/**
 * 提交支付订单（选择支付渠道并发起支付）
 * @param {Object} data
 * @param {number} data.id - 支付单编号（payOrderId）
 * @param {string} data.channelCode - 支付渠道编码（如 alipay_pc）
 * @param {string} [data.displayMode] - 展示模式（url/qr_code/form）
 * @param {string} [data.returnUrl] - 支付成功后的回跳地址
 */
export const submitPayOrder = (data: Record<string, unknown>) => {
  return authRequest.post('/pay/order/submit', data)
}

/**
 * 查询支付订单状态
 * @param {Object} params
 * @param {number} params.id - 支付单编号
 */
export const getPayOrder = (params: Record<string, unknown>) => {
  return authRequest.get('/pay/order/get', { params })
}

/**
 * 预估积分消耗
 * @param {number} modelId - 模型ID
 * @param {Object} params - 业务参数 (duration, resolution 等)
 */
export const estimatePoint = (modelId: number, params: Record<string, unknown>) => {
  return authRequest.get('/ai/point/estimate', {
    params: { modelId, ...params }
  })
}

/**
 * 获取模型积分规则
 * @param {number} modelId - 模型ID
 */
export const getPointRules = (modelId: number) => {
  return authRequest.get('/ai/point/rules', {
    params: { modelId }
  })
}
