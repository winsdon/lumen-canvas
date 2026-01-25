<template>
  <div class="min-h-screen h-screen overflow-y-auto bg-[var(--bg-primary)]">
    <!-- Header | 顶部导航 -->
    <AppHeader @login="handleShowLogin">
      <template #left>
        <!-- 返回按钮 -->
        <button
          @click="goBack"
          class="p-2 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors"
          title="返回"
        >
          <n-icon :size="20">
            <ArrowBackOutline />
          </n-icon>
        </button>
        <h1 class="text-lg font-bold text-[var(--text-primary)]">个人中心</h1>
      </template>
    </AppHeader>

    <!-- Main content | 主要内容 -->
    <div class="max-w-4xl mx-auto px-4 py-8">

      <!-- 用户信息卡片 -->
      <div class="bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-color)] p-6 mb-6">
        <div class="flex items-center mb-6">
          <img
            :src="userInfo?.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=default'"
            alt="头像"
            class="w-20 h-20 rounded-full object-cover mr-4"
          />
          <div>
            <h2 class="text-xl font-semibold text-[var(--text-primary)]">{{ userInfo?.nickname || '未设置昵称' }}</h2>
            <p class="text-[var(--text-secondary)]">{{ userInfo?.mobile || '未绑定手机' }}</p>
          </div>
        </div>

        <!-- Tab 切换 -->
        <div class="border-b border-[var(--border-color)] mb-6">
          <nav class="-mb-px flex space-x-8">
            <button
              v-for="tab in tabs"
              :key="tab.key"
              @click="activeTab = tab.key"
              :class="[
                activeTab === tab.key
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-color)]',
                'whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm'
              ]"
            >
              {{ tab.label }}
            </button>
          </nav>
        </div>

        <!-- 基本信息编辑 -->
        <div v-if="activeTab === 'info'" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-[var(--text-primary)] mb-2">昵称</label>
            <input
              v-model="formData.nickname"
              type="text"
              class="w-full px-4 py-2 border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="请输入昵称"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-[var(--text-primary)] mb-2">头像</label>
            <div class="flex items-center space-x-4">
              <!-- 头像预览 -->
              <div class="relative">
                <img
                  :src="formData.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=default'"
                  alt="头像预览"
                  class="w-24 h-24 rounded-full object-cover border-2 border-[var(--border-color)]"
                />
                <div v-if="isUploadingAvatar" class="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-full">
                  <div class="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                </div>
              </div>

              <!-- 上传按钮 -->
              <div class="flex-1">
                <input
                  ref="avatarInput"
                  type="file"
                  accept="image/*"
                  class="hidden"
                  @change="handleAvatarUpload"
                />
                <button
                  type="button"
                  @click="$refs.avatarInput.click()"
                  :disabled="isUploadingAvatar"
                  class="px-4 py-2 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg text-sm font-medium text-[var(--text-primary)] hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {{ isUploadingAvatar ? '上传中...' : '选择图片' }}
                </button>
                <p class="text-xs text-[var(--text-secondary)] mt-2">支持 JPG、PNG、GIF 格式，建议尺寸 200x200 像素</p>
              </div>
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-[var(--text-primary)] mb-2">性别</label>
            <div class="flex space-x-4">
              <label class="inline-flex items-center">
                <input
                  v-model="formData.sex"
                  type="radio"
                  :value="1"
                  class="form-radio text-blue-600"
                />
                <span class="ml-2">男</span>
              </label>
              <label class="inline-flex items-center">
                <input
                  v-model="formData.sex"
                  type="radio"
                  :value="2"
                  class="form-radio text-blue-600"
                />
                <span class="ml-2">女</span>
              </label>
            </div>
          </div>

          <button
            @click="handleUpdateInfo"
            :disabled="isSubmitting"
            class="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {{ isSubmitting ? '保存中...' : '保存修改' }}
          </button>
        </div>

        <!-- 修改密码 -->
        <div v-if="activeTab === 'password'" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-[var(--text-primary)] mb-2">新密码</label>
            <input
              v-model="passwordForm.password"
              type="password"
              class="w-full px-4 py-2 border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="请输入新密码"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-[var(--text-primary)] mb-2">确认密码</label>
            <input
              v-model="passwordForm.confirmPassword"
              type="password"
              class="w-full px-4 py-2 border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="请再次输入新密码"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-[var(--text-primary)] mb-2">手机验证码</label>
            <div class="flex space-x-2">
              <input
                v-model="passwordForm.code"
                type="text"
                class="flex-1 px-4 py-2 border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="请输入验证码"
              />
              <button
                @click="sendPasswordSmsCode"
                :disabled="passwordSmsCountdown > 0"
                class="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {{ passwordSmsCountdown > 0 ? `${passwordSmsCountdown}秒后重试` : '发送验证码' }}
              </button>
            </div>
          </div>

          <button
            @click="handleUpdatePassword"
            :disabled="isSubmitting"
            class="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {{ isSubmitting ? '修改中...' : '修改密码' }}
          </button>
        </div>

        <!-- 修改手机号 -->
        <div v-if="activeTab === 'mobile'" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-[var(--text-primary)] mb-2">当前手机号</label>
            <input
              :value="userInfo?.mobile"
              type="text"
              disabled
              class="w-full px-4 py-2 border border-[var(--border-color)] rounded-lg bg-gray-100 text-[var(--text-secondary)]"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-[var(--text-primary)] mb-2">新手机号</label>
            <input
              v-model="mobileForm.mobile"
              type="text"
              class="w-full px-4 py-2 border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="请输入新手机号"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-[var(--text-primary)] mb-2">新手机验证码</label>
            <div class="flex space-x-2">
              <input
                v-model="mobileForm.code"
                type="text"
                class="flex-1 px-4 py-2 border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="请输入新手机验证码"
              />
              <button
                @click="sendMobileSmsCode"
                :disabled="mobileSmsCountdown > 0"
                class="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {{ mobileSmsCountdown > 0 ? `${mobileSmsCountdown}秒后重试` : '发送验证码' }}
              </button>
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-[var(--text-primary)] mb-2">原手机验证码（可选）</label>
            <div class="flex space-x-2">
              <input
                v-model="mobileForm.oldCode"
                type="text"
                class="flex-1 px-4 py-2 border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="请输入原手机验证码"
              />
              <button
                @click="sendOldMobileSmsCode"
                :disabled="oldMobileSmsCountdown > 0"
                class="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {{ oldMobileSmsCountdown > 0 ? `${oldMobileSmsCountdown}秒后重试` : '发送验证码' }}
              </button>
            </div>
          </div>

          <button
            @click="handleUpdateMobile"
            :disabled="isSubmitting"
            class="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {{ isSubmitting ? '修改中...' : '修改手机号' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { NIcon } from 'naive-ui'
import { ArrowBackOutline } from '@vicons/ionicons5'
import { userInfo as storeUserInfo, fetchUserInfo } from '@/stores/user'
import { updateUserInfo, updatePassword, updateMobile } from '@/api/user'
import { sendSmsCode } from '@/api/auth'
import { getFilePresignedUrl, uploadFileToUrl } from '@/api/file'
import { SMS_SCENE } from '@/utils/constants'
import AppHeader from '@/components/AppHeader.vue'

const router = useRouter()

const activeTab = ref('info')
const isSubmitting = ref(false)
const isUploadingAvatar = ref(false)
const userInfo = ref(null)
const avatarInput = ref(null)

const tabs = [
  { key: 'info', label: '基本信息' },
  { key: 'password', label: '修改密码' },
  { key: 'mobile', label: '修改手机' }
]

// 基本信息表单
const formData = reactive({
  nickname: '',
  avatar: '',
  sex: 1
})

// 密码表单
const passwordForm = reactive({
  password: '',
  confirmPassword: '',
  code: ''
})

const passwordSmsCountdown = ref(0)

// 手机号表单
const mobileForm = reactive({
  mobile: '',
  code: '',
  oldCode: ''
})

const mobileSmsCountdown = ref(0)
const oldMobileSmsCountdown = ref(0)

// 返回上一页
const goBack = () => {
  router.back()
}

// 显示登录弹窗
const handleShowLogin = () => {
  window.$showLoginModal?.()
}

// 加载用户信息
const loadUserInfo = async () => {
  try {
    await fetchUserInfo()
    userInfo.value = storeUserInfo.value

    if (userInfo.value) {
      formData.nickname = userInfo.value.nickname || ''
      formData.avatar = userInfo.value.avatar || ''
      formData.sex = userInfo.value.sex || 1
    }
  } catch (error) {
    console.error('加载用户信息失败:', error)
    window.$message?.error('加载用户信息失败')
  }
}

// 头像上传处理
const handleAvatarUpload = async (event) => {
  const file = event.target.files?.[0]
  if (!file) return

  // 验证文件类型
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
  if (!allowedTypes.includes(file.type)) {
    window.$message?.warning('只支持 JPG、PNG、GIF、WEBP 格式的图片')
    return
  }

  // 验证文件大小 (最大 5MB)
  const maxSize = 5 * 1024 * 1024
  if (file.size > maxSize) {
    window.$message?.warning('图片大小不能超过 5MB')
    return
  }

  isUploadingAvatar.value = true

  try {
    // 1. 获取预签名 URL
    const res = await getFilePresignedUrl(file.name, 'avatar')
    const { uploadUrl, url } = res

    // 2. 上传文件到 OSS
    await uploadFileToUrl(uploadUrl, file)

    // 3. 更新表单数据
    formData.avatar = url
    window.$message?.success('头像上传成功')

    // 清空文件选择
    if (avatarInput.value) {
      avatarInput.value.value = ''
    }
  } catch (error) {
    console.error('头像上传失败:', error)
    window.$message?.error('头像上传失败，请重试')
  } finally {
    isUploadingAvatar.value = false
  }
}

// 更新基本信息
const handleUpdateInfo = async () => {
  if (!formData.nickname) {
    window.$message?.warning('请输入昵称')
    return
  }

  if (!formData.avatar) {
    window.$message?.warning('请先上传头像')
    return
  }

  isSubmitting.value = true
  try {
    await updateUserInfo({
      nickname: formData.nickname,
      avatar: formData.avatar,
      sex: formData.sex
    })
    window.$message?.success('更新成功')
    await loadUserInfo()
  } catch (error) {
    console.error('更新失败:', error)
  } finally {
    isSubmitting.value = false
  }
}

// 发送密码修改验证码
const sendPasswordSmsCode = async () => {
  if (!userInfo.value?.mobile) {
    window.$message?.warning('未绑定手机号')
    return
  }

  try {
    await sendSmsCode(userInfo.value.mobile, SMS_SCENE.UPDATE_PASSWORD)
    window.$message?.success('验证码已发送')
    startPasswordCountdown()
  } catch (error) {
    console.error('发送验证码失败:', error)
  }
}

const startPasswordCountdown = () => {
  passwordSmsCountdown.value = 60
  const timer = setInterval(() => {
    passwordSmsCountdown.value--
    if (passwordSmsCountdown.value <= 0) {
      clearInterval(timer)
    }
  }, 1000)
}

// 更新密码
const handleUpdatePassword = async () => {
  if (!passwordForm.password) {
    window.$message?.warning('请输入新密码')
    return
  }

  if (passwordForm.password.length < 6) {
    window.$message?.warning('密码长度至少为 6 位')
    return
  }

  if (passwordForm.password !== passwordForm.confirmPassword) {
    window.$message?.warning('两次输入的密码不一致')
    return
  }

  if (!passwordForm.code) {
    window.$message?.warning('请输入验证码')
    return
  }

  isSubmitting.value = true
  try {
    await updatePassword({
      password: passwordForm.password,
      code: passwordForm.code
    })
    window.$message?.success('密码修改成功')
    passwordForm.password = ''
    passwordForm.confirmPassword = ''
    passwordForm.code = ''
  } catch (error) {
    console.error('修改密码失败:', error)
  } finally {
    isSubmitting.value = false
  }
}

// 发送新手机验证码
const sendMobileSmsCode = async () => {
  if (!mobileForm.mobile) {
    window.$message?.warning('请输入新手机号')
    return
  }

  if (!/^1[3-9]\d{9}$/.test(mobileForm.mobile)) {
    window.$message?.warning('请输入正确的手机号')
    return
  }

  try {
    await sendSmsCode(mobileForm.mobile, SMS_SCENE.UPDATE_MOBILE)
    window.$message?.success('验证码已发送')
    startMobileCountdown()
  } catch (error) {
    console.error('发送验证码失败:', error)
  }
}

const startMobileCountdown = () => {
  mobileSmsCountdown.value = 60
  const timer = setInterval(() => {
    mobileSmsCountdown.value--
    if (mobileSmsCountdown.value <= 0) {
      clearInterval(timer)
    }
  }, 1000)
}

// 发送原手机验证码
const sendOldMobileSmsCode = async () => {
  if (!userInfo.value?.mobile) {
    window.$message?.warning('未绑定手机号')
    return
  }

  try {
    await sendSmsCode(userInfo.value.mobile, SMS_SCENE.UPDATE_MOBILE)
    window.$message?.success('验证码已发送')
    startOldMobileCountdown()
  } catch (error) {
    console.error('发送验证码失败:', error)
  }
}

const startOldMobileCountdown = () => {
  oldMobileSmsCountdown.value = 60
  const timer = setInterval(() => {
    oldMobileSmsCountdown.value--
    if (oldMobileSmsCountdown.value <= 0) {
      clearInterval(timer)
    }
  }, 1000)
}

// 更新手机号
const handleUpdateMobile = async () => {
  if (!mobileForm.mobile) {
    window.$message?.warning('请输入新手机号')
    return
  }

  if (!/^1[3-9]\d{9}$/.test(mobileForm.mobile)) {
    window.$message?.warning('请输入正确的手机号')
    return
  }

  if (!mobileForm.code) {
    window.$message?.warning('请输入新手机验证码')
    return
  }

  isSubmitting.value = true
  try {
    const data = {
      mobile: mobileForm.mobile,
      code: mobileForm.code
    }

    if (mobileForm.oldCode) {
      data.oldCode = mobileForm.oldCode
    }

    await updateMobile(data)
    window.$message?.success('手机号修改成功')
    mobileForm.mobile = ''
    mobileForm.code = ''
    mobileForm.oldCode = ''
    await loadUserInfo()
  } catch (error) {
    console.error('修改手机号失败:', error)
  } finally {
    isSubmitting.value = false
  }
}

onMounted(() => {
  loadUserInfo()
})

// 监听 store 中的用户信息变化
watch(storeUserInfo, (newValue) => {
  if (newValue) {
    userInfo.value = newValue
    formData.nickname = newValue.nickname || ''
    formData.avatar = newValue.avatar || ''
    formData.sex = newValue.sex || 1
  }
}, { deep: true })
</script>
