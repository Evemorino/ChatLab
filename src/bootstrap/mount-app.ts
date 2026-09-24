import { createApp } from 'vue'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import ui from '@nuxt/ui/vue-plugin'
import App from '@/App.vue'
import { router } from '@/routes'
import i18n from '@/i18n'
import { backendPersistPlugin } from '@/plugins/backendPersist'
import { installGlobalErrorReporting, reportError } from '@/services/log-report'
import { markStartupPhase } from '@/bootstrap/startup-performance'
import {
  desktopInsightBuiltins,
  desktopInsightRuntime,
  desktopNavigationLayout,
  desktopUiHost,
  desktopUiServices,
} from '@/plugins/desktop'
import { installInsightPluginRuntime } from '@/plugins/insight-vue'
import { installStaticInsightPluginUiServices } from '@/plugins/static-insight'
import { installNavigationLayout } from '@/navigation/vue'
import '@/assets/styles/main.css'

export interface MountChatLabAppOptions {
  beforeMount?: () => void | Promise<void>
}

export async function mountChatLabApp(options: MountChatLabAppOptions = {}): Promise<void> {
  installGlobalErrorReporting()
  await options.beforeMount?.()

  const app = createApp(App)
  app.config.errorHandler = (error, _instance, info) => {
    const normalized = error instanceof Error ? error : new Error(String(error))
    console.error(normalized, info)
    reportError(normalized.message, normalized.stack)
  }

  const pinia = createPinia()
  pinia.use(piniaPluginPersistedstate)
  pinia.use(backendPersistPlugin)

  app.use(pinia)
  app.use(router)
  app.use(ui)
  app.use(i18n)
  installNavigationLayout(app, desktopNavigationLayout)
  await installStaticInsightPluginUiServices(desktopInsightBuiltins, desktopInsightRuntime, desktopUiServices)
  app.onUnmount(() => {
    desktopInsightRuntime.disposeAll()
    desktopUiHost.locale.dispose()
  })
  installInsightPluginRuntime(app, desktopInsightRuntime)
  markStartupPhase('vue-mount-start')
  app.mount('#app')
  markStartupPhase('vue-mounted')
}
