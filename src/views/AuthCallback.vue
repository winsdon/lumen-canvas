<template>
  <div class="auth-callback">
    <n-spin :show="loading">
      <div class="callback-content">
        <template v-if="error">
          <n-result status="error" title="登录失败" :description="error">
            <template #footer>
              <n-button @click="handleClose">关闭窗口</n-button>
            </template>
          </n-result>
        </template>
        <template v-else-if="success">
          <n-result status="success" title="登录成功" description="正在跳转...">
          </n-result>
        </template>
        <template v-else>
          <p>正在处理登录...</p>
        </template>
      </div>
    </n-spin>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { NSpin, NResult, NButton } from 'naive-ui'
import { validateState } from '@/utils/auth'
import { useAuth } from '@/hooks'

const route = useRoute()
const { loginByWechat } = useAuth()

const loading = ref(true)
const error = ref('')
const success = ref(false)

const handleClose = () => {
  window.close()
}

const notifyParent = (data) => {
  if (window.opener) {
    window.opener.postMessage(data, '*')
    setTimeout(() => {
      window.close()
    }, 1500)
  }
}

onMounted(async () => {
  const { code, state } = route.query
  
  if (!code || !state) {
    error.value = '缺少授权参数'
    loading.value = false
    return
  }
  
  if (!validateState(state)) {
    error.value = '授权状态验证失败，请重新登录'
    loading.value = false
    return
  }
  
  try {
    await loginByWechat(code, state, false)
    success.value = true
    notifyParent({ type: 'wechat_login_callback', code, state, success: true })
  } catch (e) {
    error.value = e.message || '登录失败，请重试'
    notifyParent({ type: 'wechat_login_callback', success: false, error: error.value })
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.auth-callback {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 20px;
  background: var(--bg-primary, #fff);
}

.callback-content {
  text-align: center;
  padding: 40px;
}
</style>
