import { authRequest } from '@/utils/request'
import { SOCIAL_TYPE, SMS_SCENE } from '@/utils/constants'

export const loginByPassword = (mobile, password) => {
  return authRequest.post('/member/auth/login', { mobile, password })
}

export const loginBySms = (mobile, code) => {
  return authRequest.post('/member/auth/sms-login', { mobile, code })
}

export const sendSmsCode = (mobile, scene = SMS_SCENE.LOGIN) => {
  return authRequest.post('/member/auth/send-sms-code', { mobile, scene })
}

export const socialLogin = (type, code, state) => {
  return authRequest.post('/member/auth/social-login', { type, code, state })
}

export const wechatLogin = (code, state) => {
  return socialLogin(SOCIAL_TYPE.WECHAT_OPEN, code, state)
}

export const getSocialAuthRedirect = (type, redirectUri) => {
  return authRequest.get('/member/auth/social-auth-redirect', {
    params: { type, redirectUri }
  })
}

export const getWechatAuthUrl = (redirectUri) => {
  return getSocialAuthRedirect(SOCIAL_TYPE.WECHAT_OPEN, redirectUri)
}

export const refreshToken = (refreshTokenValue) => {
  return authRequest.post('/member/auth/refresh-token', null, {
    params: { refreshToken: refreshTokenValue }
  })
}

export const logout = () => {
  return authRequest.post('/member/auth/logout')
}

export const getUserInfo = () => {
  return authRequest.get('/member/user/get')
}

export const validateSmsCode = (mobile, code, scene = SMS_SCENE.LOGIN) => {
  return authRequest.post('/member/auth/validate-sms-code', { mobile, code, scene })
}
