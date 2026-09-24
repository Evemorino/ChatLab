export type RuntimePlatform = 'electron'

export interface PlatformCapabilities {
  platform: RuntimePlatform
  loadsPreferences: boolean
  initializesLlm: boolean
  listensForPullResults: boolean
}

export const PLATFORM_CAPABILITIES: PlatformCapabilities = {
  platform: 'electron',
  loadsPreferences: true,
  initializesLlm: true,
  listensForPullResults: true,
}
