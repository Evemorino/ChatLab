import assert from 'node:assert/strict'
import test from 'node:test'
import { resolvePlatformCapabilities } from './platform-capabilities'

test('keeps CLI Web authentication and backend startup capabilities', () => {
  assert.deepEqual(resolvePlatformCapabilities({ isElectron: false }), {
    platform: 'cli-web',
    requiresAuth: true,
    usesCliWebHttp: true,
    loadsPreferences: true,
    initializesLlm: true,
    listensForPullResults: true,
  })
})

test('keeps Electron on its existing backend-backed application path', () => {
  assert.deepEqual(resolvePlatformCapabilities({ isElectron: true }), {
    platform: 'electron',
    requiresAuth: false,
    usesCliWebHttp: false,
    loadsPreferences: true,
    initializesLlm: true,
    listensForPullResults: true,
  })
})
