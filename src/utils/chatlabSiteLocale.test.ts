import assert from 'node:assert/strict'
import test from 'node:test'
import { resolveChatlabSiteBase } from './chatlabSiteLocale'

test('uses the direct site URL on Electron', () => {
  assert.equal(resolveChatlabSiteBase({ isElectron: true }), 'https://chatlab.fun')
})

test('keeps the development proxy for CLI Web', () => {
  assert.equal(resolveChatlabSiteBase({ isElectron: false }), '/_proxy/chatlab.fun')
})
