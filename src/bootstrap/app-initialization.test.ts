import assert from 'node:assert/strict'
import test from 'node:test'
import { initializeAppRuntime, initializeProgressiveAppRuntime } from './app-initialization'

test('keeps the backend-backed application initialization sequence', async () => {
  const calls: string[] = []
  const stop = () => undefined

  const result = await initializeAppRuntime({
    capabilities: {
      platform: 'electron',
      loadsPreferences: true,
      initializesLlm: true,
      listensForPullResults: true,
    },
    initializeServices: async () => void calls.push('services'),
    initializePreferences: async () => void calls.push('preferences'),
    initializeLocale: async () => void calls.push('locale'),
    initializeLlm: async () => void calls.push('llm'),
    loadSessions: async () => void calls.push('sessions'),
    listenForPullResults: () => {
      calls.push('pull-listener')
      return stop
    },
  })

  assert.deepEqual(calls, ['services', 'preferences', 'locale', 'llm', 'sessions', 'pull-listener'])
  assert.equal(result.stopListeningForPullResults, stop)
})

test('reveals the shell after presentation state and runs independent startup work concurrently', async () => {
  const calls: string[] = []
  const releaseTasks: Array<() => void> = []
  const stop = () => undefined

  const result = await initializeProgressiveAppRuntime({
    initializeServices: async () => void calls.push('services'),
    loadPresentation: async () => {
      calls.push('load-presentation')
      return { locale: 'zh-CN' }
    },
    applyPresentation: (presentation) => void calls.push(`apply-${presentation.locale}`),
    applyPresentationFallback: () => void calls.push('fallback'),
    initializeShell: async () => void calls.push('shell'),
    initializeBackground: ['preferences', 'llm', 'sessions'].map((name) => ({
      name,
      run: async () => {
        calls.push(`start-${name}`)
        await new Promise<void>((resolve) => releaseTasks.push(resolve))
        calls.push(`finish-${name}`)
      },
    })),
    listenForPullResults: () => {
      calls.push('pull-listener')
      return stop
    },
  })

  assert.deepEqual(calls, [
    'services',
    'load-presentation',
    'apply-zh-CN',
    'shell',
    'pull-listener',
    'start-preferences',
    'start-llm',
    'start-sessions',
  ])
  assert.equal(result.presentationError, null)
  assert.equal(result.stopListeningForPullResults, stop)

  releaseTasks.forEach((release) => release())
  assert.deepEqual(await result.background, [])
})

test('uses the presentation fallback on timeout and reports background failures by task', async () => {
  const failure = new Error('session catalog unavailable')
  let applyLatePresentation = false

  const result = await initializeProgressiveAppRuntime({
    initializeServices: async () => undefined,
    loadPresentation: async () => new Promise<{ locale: string }>(() => undefined),
    applyPresentation: () => {
      applyLatePresentation = true
    },
    applyPresentationFallback: async () => undefined,
    presentationTimeoutMs: 5,
    initializeBackground: [
      { name: 'preferences', run: async () => undefined },
      { name: 'sessions', run: async () => Promise.reject(failure) },
    ],
  })

  assert.match(String(result.presentationError), /timed out after 5ms/)
  assert.equal(applyLatePresentation, false)
  assert.deepEqual(await result.background, [{ name: 'sessions', error: failure }])
})
