<template>
  <n-form ref="formRef" :model="formData" :rules="rules">
    <n-form-item path="mobile" label="手机号">
      <n-input
        v-model:value="formData.mobile"
        placeholder="请输入手机号"
        :maxlength="11"
        @keyup.enter="handleSubmit"
      />
    </n-form-item>
    
    <n-form-item path="code" label="验证码">
      <n-input-group>
        <n-input
          v-model:value="formData.code"
          placeholder="请输入验证码"
          :maxlength="6"
          style="flex: 1"
          @keyup.enter="handleSubmit"
        />
        <n-button
          :disabled="!canSendCode || countdown > 0"
          :loading="sendingCode"
          @click="handleSendCode"
        >
          {{ countdown > 0 ? `${countdown}s` : '获取验证码' }}
        </n-button>
      </n-input-group>
    </n-form-item>
    
    <n-form-item :show-label="false">
      <n-button
        type="primary"
        block
        :loading="loading"
        :disabled="!isFormValid"
        @click="handleSubmit"
      >
        登录
      </n-button>
    </n-form-item>
  </n-form>
</template>

<script setup>
import { ref, reactive, computed, onUnmounted } from 'vue'
import { NForm, NFormItem, NInput, NInputGroup, NButton } from 'naive-ui'
import { useAuth } from '@/hooks'
import { SMS_SCENE } from '@/utils/constants'

const emit = defineEmits(['success'])

const { loginBySms, sendSmsCode, loading } = useAuth()

const formRef = ref(null)
const sendingCode = ref(false)
const countdown = ref(0)
let countdownTimer = null

const formData = reactive({
  mobile: '',
  code: ''
})

const rules = {
  mobile: [
    { required: true, message: '请输入手机号', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号', trigger: 'blur' }
  ],
  code: [
    { required: true, message: '请输入验证码', trigger: 'blur' },
    { pattern: /^\d{4,6}$/, message: '请输入正确的验证码', trigger: 'blur' }
  ]
}

const canSendCode = computed(() => /^1[3-9]\d{9}$/.test(formData.mobile))

const isFormValid = computed(() => {
  return canSendCode.value && /^\d{4,6}$/.test(formData.code)
})

const startCountdown = () => {
  countdown.value = 60
  countdownTimer = setInterval(() => {
    countdown.value--
    if (countdown.value <= 0) {
      clearInterval(countdownTimer)
      countdownTimer = null
    }
  }, 1000)
}

const handleSendCode = async () => {
  if (!canSendCode.value || countdown.value > 0) return
  
  sendingCode.value = true
  try {
    await sendSmsCode(formData.mobile, SMS_SCENE.LOGIN)
    startCountdown()
  } catch (e) {
    // Send failed
  } finally {
    sendingCode.value = false
  }
}

const handleSubmit = async () => {
  try {
    await formRef.value?.validate()
    await loginBySms(formData.mobile, formData.code)
    emit('success')
  } catch (e) {
    // Validation or login failed
  }
}

onUnmounted(() => {
  if (countdownTimer) {
    clearInterval(countdownTimer)
  }
})
</script>

<style scoped>
:deep(.n-input) {
  background-color: transparent;
}
</style>
