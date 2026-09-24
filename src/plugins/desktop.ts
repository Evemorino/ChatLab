import { PLATFORM_CAPABILITIES } from '@/utils/platform-capabilities'
import { annualSummaryBuiltin } from './builtin/annual-summary'
import { timeInvestmentBuiltin } from './builtin/time-investment'
import { getLegacyInsightPages } from './insight-catalog'
import { createStaticInsightPluginRuntime } from './static-insight'
import { UiServiceRegistry } from './ui-host'
import { createVueUiHostContext } from './vue-ui-host'
import { NavigationLayoutController } from '@/navigation/layout'

const platform = PLATFORM_CAPABILITIES.platform
export const desktopInsightBuiltins = [annualSummaryBuiltin, timeInvestmentBuiltin] as const
export const desktopUiServices = new UiServiceRegistry()
export const desktopUiHost = createVueUiHostContext({ services: desktopUiServices })
export const desktopInsightRuntime = createStaticInsightPluginRuntime(
  platform,
  desktopUiHost,
  desktopUiHost.locale,
  desktopInsightBuiltins,
  getLegacyInsightPages(platform)
)
export const desktopNavigationLayout = new NavigationLayoutController(desktopInsightRuntime)
