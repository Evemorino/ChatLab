import { createRouter, createWebHashHistory } from 'vue-router'
import { appRoutes, shouldPreloadCriticalRoutes } from './routes'

export const router = createRouter({
  routes: appRoutes,
  history: createWebHashHistory(),
})

router.afterEach((to) => {
  document.body.id = `page-${to.name as string}`
})

/**
 * 预加载关键路由组件
 */
function preloadCriticalRoutes() {
  requestIdleCallback(() => {
    import('@/pages/group-chat/index.vue')
    import('@/pages/private-chat/index.vue')
    import('@/pages/people/contacts/index.vue')
  })
}

if (shouldPreloadCriticalRoutes(import.meta.env.PROD)) {
  router.isReady().then(preloadCriticalRoutes)
}
