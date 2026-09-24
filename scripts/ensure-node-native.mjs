#!/usr/bin/env node

import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const currentFile = fileURLToPath(import.meta.url)
const scriptDir = dirname(currentFile)
const repoRoot = dirname(scriptDir)
const rebuildScript = resolve(scriptDir, 'rebuild-node-native.sh')

export const DEFAULT_NATIVE_DIR = 'native'

export function resolveNativeDir(argv) {
  const index = argv.indexOf('--out')
  if (index === -1) return resolve(repoRoot, DEFAULT_NATIVE_DIR)
  const target = argv[index + 1]
  if (!target || target.startsWith('--')) {
    throw new Error('--out requires a directory relative to the repository root')
  }
  return resolve(repoRoot, target)
}

export function getNativeStatus(bindingPath, nodeExecutable = process.execPath) {
  if (!existsSync(bindingPath)) {
    return { ok: false, reason: 'missing', message: `Native binding not found: ${bindingPath}` }
  }

  const result = spawnSync(
    nodeExecutable,
    ['-e', 'require(process.argv[1]); process.stdout.write(process.versions.modules)', bindingPath],
    { encoding: 'utf8' }
  )

  if (result.status === 0) {
    return { ok: true, reason: 'valid', abi: result.stdout.trim() }
  }

  return {
    ok: false,
    reason: 'invalid',
    message: (result.stderr || result.stdout || result.error?.message || 'Native binding failed to load').trim(),
  }
}

function runRebuild(targetDir) {
  const result = spawnSync('bash', [rebuildScript, targetDir], {
    cwd: repoRoot,
    stdio: 'inherit',
  })

  if (result.status !== 0) {
    process.exit(result.status || 1)
  }
}

function main() {
  const checkOnly = process.argv.includes('--check')
  const nativeDir = resolveNativeDir(process.argv)
  const nativePath = resolve(nativeDir, 'better_sqlite3.node')
  const status = getNativeStatus(nativePath)

  if (status.ok) {
    console.error(`[node native] better-sqlite3 ready (Node ABI ${status.abi})`)
    return
  }

  if (checkOnly) {
    console.error(`[node native] ${status.message}`)
    process.exit(1)
  }

  console.error(`[node native] ${status.message}`)
  console.error('[node native] Rebuilding better-sqlite3 for the current system Node.js...')
  runRebuild(nativeDir)

  const rebuilt = getNativeStatus(nativePath)
  if (!rebuilt.ok) {
    console.error(`[node native] Rebuild completed, but native binding is still unusable: ${rebuilt.message}`)
    process.exit(1)
  }

  console.error(`[node native] better-sqlite3 ready (Node ABI ${rebuilt.abi})`)
}

if (process.argv[1] && currentFile === resolve(process.argv[1])) {
  main()
}
