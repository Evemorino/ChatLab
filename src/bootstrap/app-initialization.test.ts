import assert from 'node:assert/strict'
import test from 'node:test'
import { initializeAppRuntime, initializeProgressiveAppRuntime } from './app-initialization'

test('keeps the backend-backed application initialization sequence', async () => {
  const calls: string[] = []
  const stop = () => undefined

  const result = await initializeAppRuntime({
    capabilities: {
      platform: 'cli-web',
      requiresAuth: true,
      usesCliWebHttp: true,
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
  assert.equal(result.deferred, false)

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
  assert.equal(result.deferred, false)
  assert.deepEqual(await result.background, [{ name: 'sessions', error: failure }])
})

test('defers one-shot background work until authentication can recover presentation loading', async () => {
  const calls: string[] = []
  let authenticated = false

  const initialize = () =>
    initializeProgressiveAppRuntime({
      initializeServices: async () => void calls.push('services'),
      loadPresentation: async () => {
        calls.push('presentation')
        if (!authenticated) throw new Error('HTTP 401')
        return { locale: 'zh-CN' }
      },
      applyPresentation: () => void calls.push('apply-presentation'),
      applyPresentationFallback: () => void calls.push('fallback'),
      deferAfterPresentationError: () => !authenticated,
      initializeBackground: [
        { name: 'preferences', run: async () => void calls.push('preferences') },
        { name: 'llm', run: async () => void calls.push('llm') },
        { name: 'sessions', run: async () => void calls.push('sessions') },
      ],
    })

  const deferred = await initialize()
  assert.equal(deferred.deferred, true)
  assert.deepEqual(await deferred.background, [])
  assert.deepEqual(calls, ['services', 'presentation'])

  authenticated = true
  const recovered = await initialize()
  assert.equal(recovered.deferred, false)
  assert.deepEqual(await recovered.background, [])
  assert.deepEqual(calls, [
    'services',
    'presentation',
    'services',
    'presentation',
    'apply-presentation',
    'preferences',
    'llm',
    'sessions',
  ])
})
