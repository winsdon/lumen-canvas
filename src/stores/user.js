import { ref, computed } from 'vue'
import {
  getAccessToken,
  getRefreshToken,
  getExpiresTime,
  getUserInfo as getStoredUserInfo,
  setTokens as saveTokens,
  setUserInfo as saveUserInfo,
  clearAuth,
  isTokenExpired
} from '@/utils/auth'
import { getUserInfo as apiGetUserInfo } from '@/api/auth'

export const accessToken = ref(getAccessToken())
export const refreshToken = ref(getRefreshToken())
export const expiresTime = ref(getExpiresTime())
export const userInfo = ref(getStoredUserInfo())

export const isLoggedIn = computed(() => {
  return !!accessToken.value && !isTokenExpired()
})

export const setTokens = ({ accessToken: at, refreshToken: rt, expiresTime: et }) => {
  accessToken.value = at
  refreshToken.value = rt
  expiresTime.value = et
  saveTokens({ accessToken: at, refreshToken: rt, expiresTime: et })
}

export const setUserInfo = (info) => {
  userInfo.value = info
  saveUserInfo(info)
}

export const clearUserAuth = () => {
  accessToken.value = ''
  refreshToken.value = ''
  expiresTime.value = ''
  userInfo.value = null
  clearAuth()
}

export const initUserStore = () => {
  accessToken.value = getAccessToken()
  refreshToken.value = getRefreshToken()
  expiresTime.value = getExpiresTime()
  userInfo.value = getStoredUserInfo()
}

export const fetchUserInfo = async () => {
  if (!isLoggedIn.value) return null
  try {
    const info = await apiGetUserInfo()
    setUserInfo(info)
    return info
  } catch (err) {
    console.error('Fetch user info failed:', err)
    throw err
  }
}
