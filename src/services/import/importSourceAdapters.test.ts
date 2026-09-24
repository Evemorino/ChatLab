import assert from 'node:assert/strict'
import { afterEach, describe, it } from 'node:test'
import { configureHttpClient } from '../utils/http'
import { ElectronImportAdapter } from './electron'

const originalFetch = globalThis.fetch
const originalWindow = globalThis.window

afterEach(() => {
  globalThis.fetch = originalFetch
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: originalWindow,
  })
  configureHttpClient({ baseUrl: '/_web', token: '', getToken: null, on401: null })
})

describe('archive import source adapters', () => {
  it('uses the Electron backend batch API and forwards cancellation', async () => {
    const calls: unknown[][] = []
    let progressCallback: ((progress: any) => void) | undefined
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: {
        chatApi: {
          importBatch: async (...args: unknown[]) => {
            calls.push(['batch', ...args])
            progressCallback?.({
              batchId: args[0],
              batchIndex: 0,
              batchEvent: 'complete',
              stage: 'done',
              percentage: 100,
              batchResult: { id: '0', status: 'success', result: { success: true, sessionId: 'session-1' } },
            })
            return [{ id: '0', status: 'success', result: { success: true, sessionId: 'session-1' } }]
          },
          cancelImportBatch: async (...args: unknown[]) => {
            calls.push(['cancel', ...args])
            return { success: true }
          },
          onImportBatchProgress: (callback: (progress: any) => void) => {
            progressCallback = callback
            return () => {}
          },
        },
      },
    })

    const adapter = new ElectronImportAdapter()
    const progress: unknown[] = []
    const promise = adapter.importBatch?.(
      [{ id: '0', file: '/tmp/first.json' }],
      { sessionGapThreshold: 7200 },
      (event) => progress.push(event)
    )
    adapter.cancelActiveImport?.()
    const result = await promise

    assert.equal(result?.[0].status, 'success')
    assert.equal((result?.[0] as any).result.sessionId, 'session-1')
    assert.equal(calls[0][0], 'batch')
    assert.deepEqual(
      (calls[0][2] as Array<{ filePath: string }>).map((item) => item.filePath),
      ['/tmp/first.json']
    )
    assert.deepEqual(calls[0][3], { sessionGapThreshold: 7200 })
    assert.equal(calls[1][0], 'cancel')
    assert.equal(progress.length, 1)
  })

  it('maps an Electron batch IPC failure to per-item failures', async () => {
    let unlistenCount = 0
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: {
        chatApi: {
          importBatch: async () => {
            throw new Error('worker unavailable')
          },
          onImportBatchProgress: () => () => {
            unlistenCount++
          },
        },
      },
    })

    const adapter = new ElectronImportAdapter()
    const results = await adapter.importBatch?.([
      { id: 'first', file: '/tmp/first.json' },
      { id: 'second', file: '/tmp/second.json' },
    ])

    assert.deepEqual(results, [
      { id: 'first', status: 'failed', error: 'worker unavailable' },
      { id: 'second', status: 'failed', error: 'worker unavailable' },
    ])
    assert.equal(unlistenCount, 1)
  })

  it('forwards the session gap threshold through Electron file import', async () => {
    const calls: unknown[][] = []
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: {
        chatApi: {
          importWithOptions: async (...args: unknown[]) => {
            calls.push(args)
            return { success: true, sessionId: 'session-1' }
          },
          onImportProgress: () => () => {},
        },
      },
    })

    const result = await new ElectronImportAdapter().importFile('/tmp/chat.json', {
      sessionGapThreshold: 7200,
    })

    assert.equal(result.sessionId, 'session-1')
    assert.deepEqual(calls, [['/tmp/chat.json', { sessionGapThreshold: 7200 }]])
  })

  it('forwards Electron source lifecycle calls through preload', async () => {
    const calls: unknown[][] = []
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: {
        chatApi: {
          prepareImportSource: async (...args: unknown[]) => {
            calls.push(['prepare', ...args])
            return {
              success: true,
              source: {
                sourceId: 'source-1',
                formatId: 'google-chat-native',
                platform: 'google-chat',
                chats: [],
                expiresAt: 123,
              },
            }
          },
          importPreparedChat: async (...args: unknown[]) => {
            calls.push(['import', ...args])
            return { success: true, sessionId: 'session-1' }
          },
          releaseImportSource: async (...args: unknown[]) => {
            calls.push(['release', ...args])
            return { success: true }
          },
          onImportProgress: () => () => {},
        },
      },
    })

    const adapter = new ElectronImportAdapter()
    assert.equal((await adapter.prepareImportSource('/tmp/takeout.zip')).source?.sourceId, 'source-1')
    assert.equal(
      (
        await adapter.importPreparedChat('source-1', 'Groups/DM sample', undefined, {
          sessionGapThreshold: 7200,
        })
      ).sessionId,
      'session-1'
    )
    await adapter.releaseImportSource('source-1')

    assert.deepEqual(calls, [
      ['prepare', '/tmp/takeout.zip'],
      ['import', 'source-1', 'Groups/DM sample', { sessionGapThreshold: 7200 }],
      ['release', 'source-1'],
    ])
  })
})
