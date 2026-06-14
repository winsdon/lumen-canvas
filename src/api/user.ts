import { authRequest } from '@/utils/request'

/**
 * 获取用户基本信息
 */
export const getUserInfo = () => {
  return authRequest.get('/member/user/get')
}

/**
 * 修改用户基本信息
 * @param {Object} data - 用户信息
 * @param {string} data.nickname - 用户昵称
 * @param {string} data.avatar - 用户头像
 * @param {number} data.sex - 用户性别 (1: 男, 2: 女)
 */
export const updateUserInfo = (data) => {
  return authRequest.put('/member/user/update', data)
}

/**
 * 修改用户密码
 * @param {Object} data
 * @param {string} data.password - 新密码
 * @param {string} data.code - 手机验证码
 */
export const updatePassword = (data) => {
  return authRequest.put('/member/user/update-password', data)
}

/**
 * 修改用户手机号
 * @param {Object} data
 * @param {string} data.mobile - 新手机号
 * @param {string} data.code - 新手机验证码
 * @param {string} [data.oldCode] - 原手机验证码（可选）
 */
export const updateMobile = (data) => {
  return authRequest.put('/member/user/update-mobile', data)
}
