<script setup>
import { computed, ref, onMounted } from 'vue'
import { NConfigProvider, NMessageProvider, NDialogProvider, darkTheme } from 'naive-ui'
import { isDark } from './stores/theme'
import { useAuth } from './hooks'
import { clearUserAuth } from './stores/user'
import LoginModal from './components/LoginModal.vue'
import MessageApi from './components/MessageApi.vue'

const { init: initAuth } = useAuth()

const theme = computed(() => isDark.value ? darkTheme : null)

const showLoginModal = ref(false)

window.$showLoginModal = () => {
  showLoginModal.value = true
}

window.$handleSessionExpire = () => {
  clearUserAuth()
  window.$message?.error('登录已过期，请重新登录')
  window.$showLoginModal?.()
}

const themeOverrides = {
  common: {
    borderRadius: '12px',
    borderRadiusSmall: '8px',
    primaryColor: '#32F08C',
    primaryColorHover: '#32F08C',
    primaryColorPressed: '#32F08C',
    primaryColorSuppl: '#32F08C'
  },
  Dialog: {
    borderRadius: '16px',
    padding: '24px'
  },
  Modal: {
    borderRadius: '16px',
    padding: '24px'
  },
  Card: {
    borderRadius: '16px',
    padding: '24px'
  },
  Button: {
    borderRadiusMedium: '10px',
    borderRadiusSmall: '8px',
    borderRadiusLarge: '12px',
    heightMedium: '36px',
    paddingMedium: '0 16px'
  },
  Input: {
    borderRadius: '10px',
    heightMedium: '36px',
    // Fix password input suffix background | 修复密码输入框后缀背景
    suffixTextColor: 'inherit'
  }
}

onMounted(() => {
  initAuth()
})
</script>

<template>
  <n-config-provider :theme="theme" :theme-overrides="themeOverrides">
    <n-message-provider>
      <MessageApi />
      <n-dialog-provider>
        <router-view />
        <LoginModal v-model:show="showLoginModal" />
      </n-dialog-provider>
    </n-message-provider>
  </n-config-provider>
</template>

<style>
/* Global app styles handled in style.css */

/* Fix password input suffix background | 修复密码输入框后缀背景 */
.n-input .n-input__suffix {
  background-color: transparent !important;
}

.n-input .n-input-wrapper {
  background-color: transparent !important;
}

.n-input .n-input__eye {
  background-color: transparent !important;
}
</style>
