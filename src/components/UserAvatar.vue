<template>
  <div class="user-avatar">
    <template v-if="isLoggedIn">
      <div class="user-info-container">
        <!-- Points Display | 积分展示 -->
        <div class="points-badge" v-if="userInfo?.point !== undefined" @click="goToRecharge">
          <n-icon size="16" color="#f59e0b">
            <DiamondOutline />
          </n-icon>
          <span class="points-value">{{ userInfo.point }}</span>
        </div>
        
        <n-dropdown :options="menuOptions" @select="handleMenuSelect">
          <div class="avatar-wrapper">
            <img
              :src="userAvatar"
              @error="handleAvatarError"
              class="w-8 h-8 rounded-full object-cover"
              alt="avatar"
            />
            <span class="nickname">{{ userInfo?.nickname || '用户' }}</span>
          </div>
        </n-dropdown>
      </div>
    </template>
    <template v-else>
      <n-button type="primary" size="small" @click="handleLogin">
        登录
      </n-button>
    </template>
  </div>
</template>

<script setup>
import { h, computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { NButton, NDropdown, NIcon } from 'naive-ui'
import { PersonOutline, LogOutOutline, DiamondOutline, WalletOutline } from '@vicons/ionicons5'
import { useAuth } from '@/hooks'
import { DEFAULT_AVATAR_URL } from '@/utils/constants'

const emit = defineEmits(['login'])
const router = useRouter()

const { isLoggedIn, userInfo, logout } = useAuth()

const defaultAvatar = DEFAULT_AVATAR_URL
const avatarError = ref(false)

const userAvatar = computed(() => {
  if (avatarError.value || !userInfo.value?.avatar) return defaultAvatar
  // Clean up avatar URL (remove backticks and whitespace if present) | 清理头像 URL（移除可能存在的反引号和空格）
  const cleanUrl = userInfo.value.avatar.replace(/[`\s]/g, '')
  // console.log('Raw avatar:', userInfo.value.avatar, 'Cleaned:', cleanUrl)
  return cleanUrl || defaultAvatar
})

const handleAvatarError = () => {
  avatarError.value = true
}

const renderIcon = (icon) => {
  return () => h(NIcon, null, { default: () => h(icon) })
}

const menuOptions = [
  {
    label: '个人中心',
    key: 'profile',
    icon: renderIcon(PersonOutline)
  },
  {
    label: '积分充值',
    key: 'recharge',
    icon: renderIcon(WalletOutline)
  },
  {
    type: 'divider',
    key: 'd1'
  },
  {
    label: '退出登录',
    key: 'logout',
    icon: renderIcon(LogOutOutline)
  }
]

const handleLogin = () => {
  emit('login')
}

const handleMenuSelect = async (key) => {
  if (key === 'logout') {
    await logout()
  } else if (key === 'profile') {
    router.push('/profile')
  } else if (key === 'recharge') {
    router.push('/recharge')
  }
}

const goToRecharge = () => {
  router.push('/recharge')
}
</script>

<style scoped>
.user-avatar {
  display: flex;
  align-items: center;
}

.user-info-container {
  display: flex;
  align-items: center;
  gap: 12px;
}

.points-badge {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  background-color: var(--bg-secondary, rgba(0, 0, 0, 0.05));
  border-radius: 16px;
  font-size: 13px;
  color: var(--text-primary);
  border: 1px solid var(--border-color, rgba(0, 0, 0, 0.1));
  cursor: pointer;
  transition: all 0.2s;
}

.points-badge:hover {
  background-color: var(--bg-tertiary, rgba(0, 0, 0, 0.1));
  border-color: #f59e0b;
}

.points-value {
  font-weight: 600;
  font-family: monospace;
}

.avatar-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 20px;
  transition: background-color 0.2s;
}

.avatar-wrapper:hover {
  background-color: var(--bg-secondary, rgba(0, 0, 0, 0.05));
}

.nickname {
  font-size: 14px;
  color: var(--text-primary);
  max-width: 80px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
