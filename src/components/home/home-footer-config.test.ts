import assert from 'node:assert/strict'
import test from 'node:test'
import { filterHomeFooterLinks, resolveHomeFooterConfigSource } from './home-footer-config'

test('uses the platform adapter for Electron footer configuration', () => {
  assert.equal(resolveHomeFooterConfigSource(true), 'platform')
})

test('uses direct network fetch for CLI Web footer configuration', () => {
  assert.equal(resolveHomeFooterConfigSource(false), 'network')
})

test('hides bundled and cached changelog links when the application disables changelogs', () => {
  const links = [
    { id: 'website', url: 'https://chatlab.fun' },
    { id: 'changelog', action: 'changelog' },
    { id: 'legacy-release-notes', action: 'changelog' },
  ]

  assert.deepEqual(filterHomeFooterLinks(links, false), [links[0]])
  assert.deepEqual(filterHomeFooterLinks(links, true), links)
})
