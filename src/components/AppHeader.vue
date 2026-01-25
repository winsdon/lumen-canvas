<template>
  <header class="flex items-center justify-between px-4 md:px-8 py-4 border-b border-[var(--border-color)]">
    <!-- 左侧内容 -->
    <div class="flex items-center gap-4">
      <slot name="left">
        <!-- 默认显示空白或 logo -->
      </slot>
    </div>

    <!-- 右侧操作 -->
    <div class="flex items-center gap-4">
      <!-- 主题切换按钮 -->
      <button
        @click="toggleTheme"
        class="p-2 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors"
        :title="isDark ? '切换到亮色主题' : '切换到暗色主题'"
      >
        <n-icon :size="20">
          <SunnyOutline v-if="isDark" />
          <MoonOutline v-else />
        </n-icon>
      </button>

      <!-- 用户头像 -->
      <UserAvatar @login="handleLogin" />
    </div>
  </header>
</template>

<script setup>
import { NIcon } from 'naive-ui'
import { SunnyOutline, MoonOutline } from '@vicons/ionicons5'
import { isDark, toggleTheme } from '@/stores/theme'
import UserAvatar from './UserAvatar.vue'

const emit = defineEmits(['login'])

const handleLogin = () => {
  emit('login')
  window.$showLoginModal?.()
}
</script>
