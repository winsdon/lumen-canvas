<template>
  <div class="wechat-login">
    <n-button
      type="success"
      size="large"
      block
      :loading="loading"
      @click="handleWechatLogin"
    >
      <template #icon>
        <n-icon><LogoWechat /></n-icon>
      </template>
      微信扫码登录
    </n-button>
    <p class="wechat-tip">点击后将打开微信扫码窗口</p>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { NButton, NIcon } from 'naive-ui'
import { LogoWechat } from '@vicons/ionicons5'
import { useAuth } from '@/hooks'

const emit = defineEmits(['success'])

const { openWechatLogin, loginByWechat, loading } = useAuth()

let messageHandler = null

const handleWechatLogin = async () => {
  try {
    await openWechatLogin()
  } catch (e) {
    // Failed to open wechat login
  }
}

const handleMessage = async (event) => {
  if (event.data?.type === 'wechat_login_callback') {
    const { code, state } = event.data
    if (code && state) {
      try {
        await loginByWechat(code, state)
        emit('success')
      } catch (e) {
        // Login failed
      }
    }
  }
}

onMounted(() => {
  messageHandler = handleMessage
  window.addEventListener('message', messageHandler)
})

onUnmounted(() => {
  if (messageHandler) {
    window.removeEventListener('message', messageHandler)
  }
})
</script>

<style scoped>
.wechat-login {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px 0;
}

.wechat-tip {
  margin-top: 12px;
  font-size: 12px;
  color: var(--text-secondary, #999);
}
</style>
