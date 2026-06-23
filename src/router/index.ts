/**
 * Router configuration | 路由配置
 */
import { fetchUserInfo, isLoggedIn, userInfo } from '@/stores/user'
import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: () => import('../views/Home.vue')
  },
  {
    path: '/canvas/:id?',
    name: 'Canvas',
    component: () => import('../views/Canvas.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/collector',
    name: 'Collector',
    component: () => import('../views/Collector.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/recharge',
    name: 'PointRecharge',
    component: () => import('../views/PointRecharge.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/auth/callback',
    name: 'AuthCallback',
    component: () => import('../views/AuthCallback.vue')
  },
  {
    path: '/profile',
    name: 'Profile',
    component: () => import('../views/Profile.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/review/:id',
    name: 'Review',
    component: () => import('../views/Review.vue')
    // No requiresAuth — public review page | 免登录审核页面
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    redirect: '/'
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach(async (to, from, next) => {
  if (to.meta.requiresAuth && !isLoggedIn.value) {
    window.$showLoginModal?.()
    next(false)
    return
  }
  
  // Try to fetch user info if logged in but missing info | 如果已登录但缺少信息，尝试获取
  if (isLoggedIn.value && !userInfo.value) {
    try {
      await fetchUserInfo()
    } catch (e) {
      console.error('Failed to fetch user info in route guard:', e)
    }
  }
  
  next()
})

export default router
