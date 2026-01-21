import {
  getUserInfo as apiGetUserInfo,
  getWechatAuthUrl as apiGetWechatAuthUrl,
  loginByPassword as apiLoginByPassword,
  loginBySms as apiLoginBySms,
  logout as apiLogout,
  sendSmsCode as apiSendSmsCode,
  wechatLogin as apiWechatLogin
} from '@/api/auth'
import {
  clearUserAuth,
  initUserStore,
  isLoggedIn,
  setTokens,
  setUserInfo,
  userInfo
} from '@/stores/user'
import { generateState } from '@/utils/auth'
import { ref } from 'vue'

export const useAuth = () => {
  const loading = ref(false)
  const error = ref(null)

  const handleLoginSuccess = async (data) => {
    const { accessToken, refreshToken, expiresTime } = data
    setTokens({ accessToken, refreshToken, expiresTime })
    
    try {
      const info = await apiGetUserInfo()
      setUserInfo(info)
    } catch (e) {
      console.error('Failed to fetch user info:', e)
    }
  }

  const loginByPassword = async (mobile, password) => {
    loading.value = true
    error.value = null
    try {
      const data = await apiLoginByPassword(mobile, password)
      await handleLoginSuccess(data)
      window.$message?.success('登录成功')
      return data
    } catch (e) {
      error.value = e.message || '登录失败'
      throw e
    } finally {
      loading.value = false
    }
  }

  const loginBySms = async (mobile, code) => {
    loading.value = true
    error.value = null
    try {
      const data = await apiLoginBySms(mobile, code)
      await handleLoginSuccess(data)
      window.$message?.success('登录成功')
      return data
    } catch (e) {
      error.value = e.message || '登录失败'
      throw e
    } finally {
      loading.value = false
    }
  }

  const sendSmsCode = async (mobile, scene) => {
    loading.value = true
    error.value = null
    try {
      await apiSendSmsCode(mobile, scene)
      window.$message?.success('验证码已发送')
      return true
    } catch (e) {
      error.value = e.message || '发送失败'
      throw e
    } finally {
      loading.value = false
    }
  }

  const loginByWechat = async (code, state) => {
    loading.value = true
    error.value = null
    try {
      const data = await apiWechatLogin(code, state)
      await handleLoginSuccess(data)
      window.$message?.success('登录成功')
      return data
    } catch (e) {
      error.value = e.message || '微信登录失败'
      throw e
    } finally {
      loading.value = false
    }
  }

  const openWechatLogin = async () => {
    loading.value = true
    error.value = null
    try {
      const state = generateState()
      const redirectUri = `${window.location.origin}${window.location.pathname}#/auth/callback`
      const authUrl = await apiGetWechatAuthUrl(encodeURIComponent(redirectUri))
      
      const width = 600
      const height = 500
      const left = (window.screen.width - width) / 2
      const top = (window.screen.height - height) / 2
      
      window.open(
        authUrl,
        'wechat_login',
        `width=${width},height=${height},left=${left},top=${top},scrollbars=yes`
      )
      
      return { state, redirectUri }
    } catch (e) {
      error.value = e.message || '获取微信授权链接失败'
      throw e
    } finally {
      loading.value = false
    }
  }

  const logout = async () => {
    loading.value = true
    try {
      await apiLogout()
    } catch (e) {
      console.error('Logout API error:', e)
    } finally {
      clearUserAuth()
      loading.value = false
      window.$message?.success('已退出登录')
    }
  }

  const fetchUserInfo = async () => {
    if (!isLoggedIn.value) return null
    
    loading.value = true
    try {
      const info = await apiGetUserInfo()
      setUserInfo(info)
      return info
    } catch (e) {
      error.value = e.message || '获取用户信息失败'
      throw e
    } finally {
      loading.value = false
    }
  }

  const init = () => {
    initUserStore()
    // Always refresh user info if logged in to keep points and data up to date | 如果已登录，始终刷新用户信息以保持积分和数据最新
    if (isLoggedIn.value) {
      fetchUserInfo().catch(() => {})
    }
  }

  return {
    loading,
    error,
    isLoggedIn,
    userInfo,
    loginByPassword,
    loginBySms,
    sendSmsCode,
    loginByWechat,
    openWechatLogin,
    logout,
    fetchUserInfo,
    init
  }
}
