<template>
  <div class="user-avatar">
    <template v-if="isLoggedIn">
      <n-dropdown :options="menuOptions" @select="handleMenuSelect">
        <div class="avatar-wrapper">
          <n-avatar
            round
            :size="32"
            :src="userInfo?.avatar"
            :fallback-src="defaultAvatar"
          >
            {{ userInfo?.nickname?.charAt(0) || 'U' }}
          </n-avatar>
          <span class="nickname">{{ userInfo?.nickname || '用户' }}</span>
        </div>
      </n-dropdown>
    </template>
    <template v-else>
      <n-button type="primary" size="small" @click="handleLogin">
        登录
      </n-button>
    </template>
  </div>
</template>

<script setup>
import { h } from 'vue'
import { NButton, NAvatar, NDropdown, NIcon } from 'naive-ui'
import { PersonOutline, LogOutOutline } from '@vicons/ionicons5'
import { useAuth } from '@/hooks'

const emit = defineEmits(['login'])

const { isLoggedIn, userInfo, logout } = useAuth()

const defaultAvatar = 'https://api.dicebear.com/7.x/avataaars/svg?seed=default'

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
    window.$message?.info('个人中心功能开发中')
  }
}
</script>

<style scoped>
.user-avatar {
  display: flex;
  align-items: center;
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
