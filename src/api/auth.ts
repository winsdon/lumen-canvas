import { authRequest } from '@/utils/request'
import { SOCIAL_TYPE, SMS_SCENE } from '@/utils/constants'

export const loginByPassword = (mobile: string, password: string) => {
  return authRequest.post('/member/auth/login', { mobile, password })
}

export const loginBySms = (mobile: string, code: string) => {
  return authRequest.post('/member/auth/sms-login', { mobile, code })
}

export const sendSmsCode = (mobile: string, scene: number = SMS_SCENE.LOGIN) => {
  return authRequest.post('/member/auth/send-sms-code', { mobile, scene })
}

export const socialLogin = (type: number, code: string, state: string) => {
  return authRequest.post('/member/auth/social-login', { type, code, state })
}

export const wechatLogin = (code: string, state: string) => {
  return socialLogin(SOCIAL_TYPE.WECHAT_OPEN, code, state)
}

export const getSocialAuthRedirect = (type: number, redirectUri: string) => {
  return authRequest.get('/member/auth/social-auth-redirect', {
    params: { type, redirectUri }
  })
}

export const getWechatAuthUrl = (redirectUri: string) => {
  return getSocialAuthRedirect(SOCIAL_TYPE.WECHAT_OPEN, redirectUri)
}

export const refreshToken = (refreshTokenValue: string) => {
  return authRequest.post('/member/auth/refresh-token', { refreshToken: refreshTokenValue })
}

export const logout = () => {
  return authRequest.post('/member/auth/logout')
}

export const getUserInfo = () => {
  return authRequest.get('/member/user/get')
}

export const validateSmsCode = (mobile: string, code: string, scene: number = SMS_SCENE.LOGIN) => {
  return authRequest.post('/member/auth/validate-sms-code', { mobile, code, scene })
}
