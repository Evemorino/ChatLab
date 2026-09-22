import { IS_ELECTRON } from './platform'

export type RuntimePlatform = 'electron' | 'cli-web'

export interface PlatformCapabilities {
  platform: RuntimePlatform
  requiresAuth: boolean
  usesCliWebHttp: boolean
  loadsPreferences: boolean
  initializesLlm: boolean
  listensForPullResults: boolean
}

export interface PlatformCapabilityFlags {
  isElectron: boolean
}

export function resolvePlatformCapabilities(flags: PlatformCapabilityFlags): PlatformCapabilities {
  if (flags.isElectron) {
    return {
      platform: 'electron',
      requiresAuth: false,
      usesCliWebHttp: false,
      loadsPreferences: true,
      initializesLlm: true,
      listensForPullResults: true,
    }
  }

  return {
    platform: 'cli-web',
    requiresAuth: true,
    usesCliWebHttp: true,
    loadsPreferences: true,
    initializesLlm: true,
    listensForPullResults: true,
  }
}

export const PLATFORM_CAPABILITIES = resolvePlatformCapabilities({
  isElectron: IS_ELECTRON,
})
