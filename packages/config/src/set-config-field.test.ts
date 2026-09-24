import assert from 'node:assert/strict'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { after, beforeEach, describe, it } from 'node:test'

const tempHome = mkdtempSync(join(tmpdir(), 'chatlab-config-set-'))
process.env.HOME = tempHome

const [{ setConfigField, ConfigSetError }, { loadConfig }] = await Promise.all([
  import('./set-config-field'),
  import('./loader'),
])

const configToml = join(tempHome, '.chatlab', 'config.toml')
const configJson = join(tempHome, '.chatlab', 'config.json')

beforeEach(() => {
  rmSync(join(tempHome, '.chatlab'), { recursive: true, force: true })
  delete process.env.CHATLAB_DATA_DIR
  delete process.env.CHATLAB_LOCALE_LANG
})

after(() => {
  rmSync(tempHome, { recursive: true, force: true })
})

describe('setConfigField', () => {
  it('persists the desktop close behavior', () => {
    const result = setConfigField('desktop.close_behavior', 'background')

    assert.deepEqual(result, { section: 'desktop', key: 'close_behavior', value: 'background' })
    assert.equal(loadConfig().desktop.close_behavior, 'background')
  })

  it('parses boolean values by schema type and round-trips via loadConfig', () => {
    const result = setConfigField('data.electron_migration_done', 'true')
    assert.deepEqual(result, { section: 'data', key: 'electron_migration_done', value: true })
    assert.equal(loadConfig().data.electron_migration_done, true)

    setConfigField('data.electron_migration_done', 'false')
    assert.equal(loadConfig().data.electron_migration_done, false)
  })

  it('parses number values by schema type', () => {
    setConfigField('ui.session_gap_threshold', '7200')
    assert.equal(loadConfig().ui.session_gap_threshold, 7200)
  })

  it('rejects a written value that violates the schema while environment overrides are present', () => {
    process.env.CHATLAB_DATA_DIR = '/tmp/chatlab-env-data'

    // validateConfigFile re-parses the file itself, so an out-of-range written
    // value cannot be rescued by the environment layer.
    assert.throws(
      () => setConfigField('ui.session_gap_threshold', '100000'),
      (err: unknown) => {
        assert.ok(err instanceof ConfigSetError)
        assert.equal(err.reason, 'invalid_config')
        return true
      }
    )
    assert.equal(existsSync(configToml), false)
  })

  it('preserves legacy JSON config when creating TOML', () => {
    mkdirSync(join(tempHome, '.chatlab'), { recursive: true })
    writeFileSync(
      configJson,
      JSON.stringify({
        data: { user_data_dir: '/tmp/chatlab-legacy-data' },
        locale: { lang: 'zh-CN' },
      }),
      'utf-8'
    )

    setConfigField('ui.session_gap_threshold', '7200')

    const config = loadConfig()
    assert.equal(config.data.user_data_dir, '/tmp/chatlab-legacy-data')
    assert.equal(config.locale.lang, 'zh-CN')
    assert.equal(config.ui.session_gap_threshold, 7200)
  })

  it('rejects unknown section or key without touching the file', () => {
    for (const fieldPath of ['nope.key', 'desktop.nope', 'desktop']) {
      assert.throws(
        () => setConfigField(fieldPath, 'x'),
        (err: unknown) => {
          assert.ok(err instanceof ConfigSetError)
          assert.equal(err.reason, 'unknown_key')
          return true
        }
      )
    }
    assert.equal(existsSync(configToml), false)
  })

  it('rejects values that do not parse as the schema type', () => {
    assert.throws(
      () => setConfigField('data.electron_migration_done', 'yes'),
      (err: unknown) => {
        assert.ok(err instanceof ConfigSetError)
        assert.equal(err.reason, 'invalid_value')
        return true
      }
    )
    assert.throws(
      () => setConfigField('ui.session_gap_threshold', 'not-a-number'),
      (err: unknown) => {
        assert.ok(err instanceof ConfigSetError)
        assert.equal(err.reason, 'invalid_value')
        return true
      }
    )
    assert.equal(existsSync(configToml), false)
  })

  it('rolls back when post-write validation fails', () => {
    setConfigField('ui.session_gap_threshold', '7200')
    const original = readFileSync(configToml, 'utf-8')

    // typeof default is string, passes type parsing, but violates the zod enum on reload
    assert.throws(
      () => setConfigField('ui.default_session_tab', 'bogus'),
      (err: unknown) => {
        assert.ok(err instanceof ConfigSetError)
        assert.equal(err.reason, 'invalid_config')
        return true
      }
    )

    assert.equal(readFileSync(configToml, 'utf-8'), original)
    assert.equal(loadConfig().ui.session_gap_threshold, 7200)
  })

  it('removes the file on rollback when it did not exist before', () => {
    assert.throws(
      () => setConfigField('ui.default_session_tab', 'bogus'),
      (err: unknown) => {
        assert.ok(err instanceof ConfigSetError)
        assert.equal(err.reason, 'invalid_config')
        return true
      }
    )
    assert.equal(existsSync(configToml), false)
  })

  it('refuses to overwrite an unparseable config file', () => {
    mkdirSync(join(tempHome, '.chatlab'), { recursive: true })
    const corrupt = '[ui\nsession_gap_threshold ='
    writeFileSync(configToml, corrupt, 'utf-8')

    assert.throws(
      () => setConfigField('ui.session_gap_threshold', '7200'),
      (err: unknown) => {
        assert.ok(err instanceof ConfigSetError)
        assert.equal(err.reason, 'unreadable_config')
        return true
      }
    )
    assert.equal(readFileSync(configToml, 'utf-8'), corrupt)
  })
})

/**
 * The `[api]` and `[cli]` sections belonged to the retired CLI and CLI Web
 * runtimes. Existing files may still contain them, so removal has to be
 * non-destructive in both directions: ignored when read, untouched on disk.
 */
describe('retired api and cli sections', () => {
  const legacyToml = `[api]
port = 4110
host = "0.0.0.0"
token = "clb_legacy_token"
require_auth = true

[cli]
allow_raw = true
allow_sql = false

[ui]
session_gap_threshold = 1800
`

  it('loads without error and ignores the retired values', () => {
    mkdirSync(join(tempHome, '.chatlab'), { recursive: true })
    writeFileSync(configToml, legacyToml, 'utf-8')

    const config = loadConfig()

    assert.equal(config.ui.session_gap_threshold, 1800)
    assert.equal('api' in config, false)
    assert.equal('cli' in config, false)
  })

  it('keeps the retired sections on disk when writing an unrelated field', () => {
    mkdirSync(join(tempHome, '.chatlab'), { recursive: true })
    writeFileSync(configToml, legacyToml, 'utf-8')

    setConfigField('desktop.close_behavior', 'quit')

    const written = readFileSync(configToml, 'utf-8')
    assert.match(written, /\[api\]/)
    assert.match(written, /token = "clb_legacy_token"/)
    assert.match(written, /\[cli\]/)
    assert.match(written, /allow_raw = true/)
    assert.equal(loadConfig().desktop.close_behavior, 'quit')
  })
})
