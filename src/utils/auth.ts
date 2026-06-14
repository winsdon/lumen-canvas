import { AUTH_STORAGE_KEYS } from './constants'

export const getAccessToken = () => {
  try {
    return localStorage.getItem(AUTH_STORAGE_KEYS.ACCESS_TOKEN) || ''
  } catch {
    return ''
  }
}

export const getRefreshToken = () => {
  try {
    return localStorage.getItem(AUTH_STORAGE_KEYS.REFRESH_TOKEN) || ''
  } catch {
    return ''
  }
}

export const getExpiresTime = () => {
  try {
    return localStorage.getItem(AUTH_STORAGE_KEYS.EXPIRES_TIME) || ''
  } catch {
    return ''
  }
}

export const getUserInfo = () => {
  try {
    const info = localStorage.getItem(AUTH_STORAGE_KEYS.USER_INFO)
    return info ? JSON.parse(info) : null
  } catch {
    return null
  }
}

export const setAccessToken = (token) => {
  try {
    if (token) {
      localStorage.setItem(AUTH_STORAGE_KEYS.ACCESS_TOKEN, token)
    } else {
      localStorage.removeItem(AUTH_STORAGE_KEYS.ACCESS_TOKEN)
    }
  } catch {
    // Ignore storage errors
  }
}

export const setRefreshToken = (token) => {
  try {
    if (token) {
      localStorage.setItem(AUTH_STORAGE_KEYS.REFRESH_TOKEN, token)
    } else {
      localStorage.removeItem(AUTH_STORAGE_KEYS.REFRESH_TOKEN)
    }
  } catch {
    // Ignore storage errors
  }
}

export const setExpiresTime = (time) => {
  try {
    if (time) {
      localStorage.setItem(AUTH_STORAGE_KEYS.EXPIRES_TIME, time)
    } else {
      localStorage.removeItem(AUTH_STORAGE_KEYS.EXPIRES_TIME)
    }
  } catch {
    // Ignore storage errors
  }
}

export const setUserInfo = (info) => {
  try {
    if (info) {
      localStorage.setItem(AUTH_STORAGE_KEYS.USER_INFO, JSON.stringify(info))
    } else {
      localStorage.removeItem(AUTH_STORAGE_KEYS.USER_INFO)
    }
  } catch {
    // Ignore storage errors
  }
}

export const setTokens = ({ accessToken, refreshToken, expiresTime }) => {
  setAccessToken(accessToken)
  setRefreshToken(refreshToken)
  setExpiresTime(expiresTime)
}

export const clearAuth = () => {
  try {
    localStorage.removeItem(AUTH_STORAGE_KEYS.ACCESS_TOKEN)
    localStorage.removeItem(AUTH_STORAGE_KEYS.REFRESH_TOKEN)
    localStorage.removeItem(AUTH_STORAGE_KEYS.EXPIRES_TIME)
    localStorage.removeItem(AUTH_STORAGE_KEYS.USER_INFO)
    localStorage.removeItem(AUTH_STORAGE_KEYS.WECHAT_STATE)
  } catch {
    // Ignore storage errors
  }
}

export const isTokenExpired = () => {
  const expiresTime = getExpiresTime()
  if (!expiresTime) return true
  return new Date(expiresTime).getTime() < Date.now()
}

export const isLoggedIn = () => {
  const token = getAccessToken()
  return !!token && !isTokenExpired()
}

export const generateState = () => {
  const state = crypto.randomUUID ? crypto.randomUUID() : 
    'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0
      const v = c === 'x' ? r : (r & 0x3 | 0x8)
      return v.toString(16)
    })
  try {
    sessionStorage.setItem(AUTH_STORAGE_KEYS.WECHAT_STATE, state)
  } catch {
    // Ignore storage errors
  }
  return state
}

export const getStoredState = () => {
  try {
    return sessionStorage.getItem(AUTH_STORAGE_KEYS.WECHAT_STATE) || ''
  } catch {
    return ''
  }
}

export const clearStoredState = () => {
  try {
    sessionStorage.removeItem(AUTH_STORAGE_KEYS.WECHAT_STATE)
  } catch {
    // Ignore storage errors
  }
}

export const validateState = (state) => {
  const storedState = getStoredState()
  if (!storedState || !state) return false
  const isValid = storedState === state
  if (isValid) {
    clearStoredState()
  }
  return isValid
}
