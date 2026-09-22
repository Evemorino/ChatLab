import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { detectPlatform } from './registry'

describe('detectPlatform', () => {
  it('uses canonical platform identifiers for every runtime', () => {
    assert.equal(detectPlatform({ isElectron: true }), 'electron')
    assert.equal(detectPlatform({ isElectron: false }), 'cli-web')
  })
})
