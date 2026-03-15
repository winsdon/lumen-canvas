<template>
  <div class="min-h-screen h-screen overflow-y-auto bg-[var(--bg-primary)]">
    <!-- Header -->
    <AppHeader>
      <template #left>
        <button
          @click="goBack"
          class="p-2 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors"
          title="返回"
        >
          <n-icon :size="20">
            <ArrowBackOutline />
          </n-icon>
        </button>
        <h1 class="text-lg font-bold text-[var(--text-primary)]">积分充值</h1>
      </template>
    </AppHeader>

    <!-- Main Content -->
    <div class="max-w-4xl mx-auto px-4 py-8">
      
      <!-- Balance Card -->
      <div class="bg-gradient-to-r from-cyan-500 to-blue-500 rounded-xl p-6 text-white mb-8 shadow-lg relative overflow-hidden">
        <div class="relative z-10">
          <p class="text-cyan-100 mb-1">当前积分</p>
          <h2 class="text-4xl font-bold">{{ userInfo?.point || 0 }}</h2>
        </div>
        <!-- Decorative circles -->
        <div class="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-white opacity-10 rounded-full"></div>
        <div class="absolute bottom-0 right-10 -mb-10 w-32 h-32 bg-white opacity-10 rounded-full"></div>
      </div>

      <!-- Recharge Options -->
      <div class="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-color)] p-6 mb-8">
        <h3 class="text-lg font-semibold text-[var(--text-primary)] mb-4">选择充值金额</h3>
        <div class="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          <div
            v-for="pkg in rechargePackages"
            :key="pkg.price"
            @click="selectPackage(pkg)"
            :class="[
              'cursor-pointer border rounded-xl p-4 text-center transition-all duration-200 relative',
              selectedPackage?.price === pkg.price
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-[var(--border-color)] hover:border-blue-300'
            ]"
          >
            <div class="text-xl font-bold text-[var(--text-primary)]">{{ pkg.points }} 积分</div>
            <div class="text-blue-500 mt-1">¥ {{ pkg.price / 100 }}</div>
            <div v-if="selectedPackage?.price === pkg.price" class="absolute top-0 right-0 p-1">
              <n-icon color="#3b82f6"><CheckmarkCircle /></n-icon>
            </div>
          </div>
        </div>

        <!-- Custom Amount (Optional, can be added later) -->

        <!-- Payment Method -->
        <h3 class="text-lg font-semibold text-[var(--text-primary)] mb-4">支付方式</h3>
        <div class="flex gap-4 mb-6">
          <div
            @click="paymentMethod = 'alipay_pc'"
            :class="[
              'flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition-colors',
              paymentMethod === 'alipay_pc'
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600'
                : 'border-[var(--border-color)] text-[var(--text-secondary)] hover:border-blue-300'
            ]"
          >
            <n-icon><CardOutline /></n-icon>
            <span>支付宝</span>
          </div>
          <div
            @click="paymentMethod = 'wx_pub'"
            :class="[
              'flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition-colors',
              paymentMethod === 'wx_pub'
                ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-600'
                : 'border-[var(--border-color)] text-[var(--text-secondary)] hover:border-green-300'
            ]"
          >
            <n-icon><LogoWechat /></n-icon>
            <span>微信支付</span>
          </div>
        </div>

        <button
          @click="handleRecharge"
          :disabled="loading || !selectedPackage"
          class="w-full bg-blue-600 text-white py-3 rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-lg shadow-md hover:shadow-lg"
        >
          {{ loading ? '处理中...' : '立即充值' }}
        </button>
      </div>

      <!-- Recharge History -->
      <div class="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-color)] p-6">
        <h3 class="text-lg font-semibold text-[var(--text-primary)] mb-4">充值记录</h3>
        
        <div v-if="historyLoading" class="text-center py-8 text-[var(--text-secondary)]">
          加载中...
        </div>
        <div v-else-if="historyList.length === 0" class="text-center py-8 text-[var(--text-secondary)]">
          暂无充值记录
        </div>
        <div v-else class="space-y-4">
          <div
            v-for="record in historyList"
            :key="record.id"
            class="flex items-center justify-between p-3 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors border-b border-[var(--border-color)] last:border-0"
          >
            <div>
              <div class="font-medium text-[var(--text-primary)]">充值 {{ record.rechargePoint }} 积分</div>
              <div class="text-sm text-[var(--text-secondary)]">{{ formatDate(record.createTime) }}</div>
            </div>
            <div class="text-right">
              <div class="font-medium text-[var(--text-primary)]">¥ {{ record.payPrice / 100 }}</div>
              <div :class="['text-sm', record.payStatus ? 'text-green-500' : 'text-orange-500']">
                {{ record.payStatus ? '支付成功' : '待支付' }}
              </div>
            </div>
          </div>
          
          <!-- Pagination can be added here -->
        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { NIcon } from 'naive-ui'
import { ArrowBackOutline, CheckmarkCircle, LogoWechat, CardOutline } from '@vicons/ionicons5'
import AppHeader from '@/components/AppHeader.vue'
import { userInfo } from '@/stores/user'
import { createPointRecharge, getPointRechargePage, submitPayOrder, getPayOrder } from '@/api/point'

const router = useRouter()
const loading = ref(false)
const historyLoading = ref(false)
const historyList = ref([])
const paymentMethod = ref('alipay_pc')
const selectedPackage = ref(null)

// Define recharge packages (price in cents)
const rechargePackages = [
  { price: 1000, points: 100 },    // ¥10
  { price: 3000, points: 300 },    // ¥30
  { price: 5000, points: 500 },    // ¥50
  { price: 10000, points: 1000 },  // ¥100
  { price: 20000, points: 2000 },  // ¥200
  { price: 50000, points: 5000 },  // ¥500
]

// Set default selection
selectedPackage.value = rechargePackages[0]

const selectPackage = (pkg) => {
  selectedPackage.value = pkg
}

const goBack = () => {
  router.back()
}

const formatDate = (dateStr) => {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleString()
}

const loadHistory = async () => {
  historyLoading.value = true
  try {
    const res = await getPointRechargePage({
      pageNo: 1,
      pageSize: 10
    })
    historyList.value = res.list || []
  } catch (error) {
    console.error('Failed to load history:', error)
  } finally {
    historyLoading.value = false
  }
}

const handleRecharge = async () => {
  if (!selectedPackage.value) return

  loading.value = true
  try {
    // 1. 创建积分充值订单，获取 payOrderId
    const rechargeRes = await createPointRecharge({
      payPrice: selectedPackage.value.price,
      channelCode: paymentMethod.value
    })
    const { payOrderId } = rechargeRes

    // 2. 提交支付订单，选择支付渠道
    const returnUrl = `${window.location.origin}/recharge?payResult=success&payOrderId=${payOrderId}`
    const submitRes = await submitPayOrder({
      id: payOrderId,
      channelCode: paymentMethod.value,
      returnUrl
    })

    // 3. 根据返回的 displayMode 处理支付
    const { displayMode, displayContent, status } = submitRes

    // 状态 10 表示已支付（重复提交等场景）
    if (status === 10) {
      window.$message?.success('该订单已支付成功')
      loadHistory()
      return
    }

    if (displayMode === 'url') {
      // 支付宝 PC 支付：跳转到支付宝收银台
      window.location.href = displayContent
    } else if (displayMode === 'qr_code') {
      // 二维码模式（微信等）：后续可扩展展示二维码
      window.$message?.info('请使用二维码支付（功能开发中）')
    } else if (displayMode === 'form') {
      // 表单模式：将 HTML 写入页面自动提交
      const formDiv = document.createElement('div')
      formDiv.innerHTML = displayContent
      document.body.appendChild(formDiv)
      const form = formDiv.querySelector('form')
      if (form) form.submit()
    } else {
      window.$message?.warning('未知的支付方式，请联系客服')
    }
  } catch (error) {
    console.error('Recharge failed:', error)
    window.$message?.error('充值发起失败')
  } finally {
    loading.value = false
  }
}

// 支付回跳后检查支付结果
const checkPayResult = async () => {
  const urlParams = new URLSearchParams(window.location.search)
  const payResult = urlParams.get('payResult')
  const payOrderId = urlParams.get('payOrderId')

  if (payResult === 'success' && payOrderId) {
    window.$message?.info('正在确认支付结果...')
    try {
      const order = await getPayOrder({ id: Number(payOrderId) })
      if (order.status === 10) {
        window.$message?.success('支付成功，积分已到账！')
      } else {
        window.$message?.warning('支付处理中，请稍后刷新查看')
      }
    } catch (error) {
      console.error('Check pay result failed:', error)
    }
    // 清除 URL 中的支付参数
    router.replace({ path: '/recharge' })
  }
}

onMounted(() => {
  checkPayResult()
  loadHistory()
})
</script>

<style scoped>
/* Add any specific styles here if needed, mostly using Tailwind */
</style>
