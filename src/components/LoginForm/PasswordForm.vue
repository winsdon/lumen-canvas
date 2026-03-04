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
    
    <n-form-item path="password" label="密码">
      <n-input
        v-model:value="formData.password"
        type="password"
        placeholder="请输入密码"
        show-password-on="click"
        @keyup.enter="handleSubmit"
      />
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
import { ref, reactive, computed } from 'vue'
import { NForm, NFormItem, NInput, NButton } from 'naive-ui'
import { useAuth } from '@/hooks'

const emit = defineEmits(['success'])

const { loginByPassword, loading } = useAuth()

const formRef = ref(null)

const formData = reactive({
  mobile: '',
  password: ''
})

const rules = {
  mobile: [
    { required: true, message: '请输入手机号', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码至少6位', trigger: 'blur' }
  ]
}

const isFormValid = computed(() => {
  return /^1[3-9]\d{9}$/.test(formData.mobile) && formData.password.length >= 6
})

const handleSubmit = async () => {
  try {
    await formRef.value?.validate()
    await loginByPassword(formData.mobile, formData.password)
    emit('success')
  } catch (e) {
    // 表单验证失败或登录失败（全局拦截器已处理 API 错误提示）
    if (e?.message) console.error('Login failed:', e.message)
  }
}
</script>

<style scoped>
:deep(.n-input) {
  background-color: transparent;
}
</style>
