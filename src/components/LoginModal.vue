<template>
  <n-modal v-model:show="showModal" preset="card" title="登录" style="width: 420px; max-width: 90vw;">
    <n-tabs v-model:value="activeTab" type="line" animated>
      <n-tab-pane name="password" tab="密码登录">
        <PasswordForm @success="handleSuccess" />
      </n-tab-pane>
      
      <n-tab-pane name="sms" tab="验证码登录">
        <SmsForm @success="handleSuccess" />
      </n-tab-pane>
      
      <n-tab-pane name="wechat" tab="微信登录">
        <WechatLogin @success="handleSuccess" />
      </n-tab-pane>
    </n-tabs>
    
    <div class="login-footer">
      <p class="agreement">
        登录即表示同意
        <a href="javascript:void(0)" @click.stop>用户协议</a>
        和
        <a href="javascript:void(0)" @click.stop>隐私政策</a>
      </p>
    </div>
  </n-modal>
</template>

<script setup>
import { ref, watch } from 'vue'
import { NModal, NTabs, NTabPane } from 'naive-ui'
import PasswordForm from './LoginForm/PasswordForm.vue'
import SmsForm from './LoginForm/SmsForm.vue'
import WechatLogin from './LoginForm/WechatLogin.vue'

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:show', 'success'])

const showModal = ref(props.show)
const activeTab = ref('password')

watch(() => props.show, (val) => {
  showModal.value = val
})

watch(showModal, (val) => {
  emit('update:show', val)
})

const handleSuccess = () => {
  showModal.value = false
  emit('success')
}
</script>

<style scoped>
.login-footer {
  margin-top: 16px;
  text-align: center;
}

.agreement {
  font-size: 12px;
  color: var(--text-secondary, #999);
}

.agreement a {
  color: var(--accent-color, #18a058);
  text-decoration: none;
}

.agreement a:hover {
  text-decoration: underline;
}
</style>
