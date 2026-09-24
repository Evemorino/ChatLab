#!/usr/bin/env node

import { existsSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'

const repoRoot = resolve(import.meta.dirname, '..')
const artifactPath = join(repoRoot, 'apps', 'desktop', 'out', 'main', 'people-relationships-worker.js')

if (!existsSync(artifactPath)) {
  console.error(`[check-build-artifacts] Missing desktop worker bundle: ${artifactPath}`)
  process.exitCode = 1
} else if (statSync(artifactPath).size === 0) {
  console.error(`[check-build-artifacts] Empty desktop worker bundle: ${artifactPath}`)
  process.exitCode = 1
} else {
  console.log('[check-build-artifacts] OK: desktop')
}
