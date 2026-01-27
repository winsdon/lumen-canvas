
import { authRequest } from '@/utils/request'

/**
 * 创建积分充值记录（发起充值）
 * @param {Object} data
 * @param {number} data.payPrice - 充值金额（单位：分）
 * @param {string} data.channelCode - 支付渠道编码
 */
export const createPointRecharge = (data) => {
  return authRequest.post('/member/point-recharge/create', data)
}

/**
 * 获得积分充值记录分页
 * @param {Object} params
 * @param {number} params.pageNo - 页码
 * @param {number} params.pageSize - 每页条数
 */
export const getPointRechargePage = (params) => {
  return authRequest.get('/member/point-recharge/page', { params })
}
