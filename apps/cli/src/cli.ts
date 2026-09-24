/**
 * ChatLab CLI entry point
 *
 * Dev: pnpm --filter chatlab-cli run cli -- sessions
 */

import { Command } from 'commander'
import { loadConfig, getConfigPath, setConfigField, ConfigSetError } from '@openchatlab/config'
import { AIChatManager, initAppLogger, appLogger, getSystemLogsDir } from '@openchatlab/node-runtime'
import { getVersion } from './version'
import { initRuntime, resolveNativeBinding } from './runtime'
import { registerQueryCommands } from './query/register'
import { registerManifestCommand } from './query/manifest'
import { registerImportCommand } from './import/command'
import { registerValidateCommand } from './validate/command'
import { registerRuntimeCommand } from './semantic-index/runtime-command'

const program = new Command()

program.name('clb').description('ChatLab - Chat history analysis tool').version(getVersion(), '-v, --version')

program.hook('preAction', async (_thisCommand, actionCommand) => {
  if (actionCommand.name() === 'update' || actionCommand.parent?.name() === 'runtime') return
  const { checkForUpdatesInteractive } = await import('./update-checker')
  await checkForUpdatesInteractive()
})

program
  .command('update')
  .description('Update ChatLab CLI to the latest version')
  .action(async () => {
    const { performCliSelfUpdate } = await import('./update-checker')
    const result = await performCliSelfUpdate({
      write: (text) => process.stderr.write(text),
    })

    if (result.success) {
      console.error('  Updated successfully. Please restart clb to use the new version.\n')
      return
    }

    console.error(`  Update failed: ${result.error || 'unknown error'}\n`)
    process.exitCode = 1
  })

// Agent-facing query commands (sessions/members/messages/stats/topics/sql)
// plus deprecated top-level aliases; see apps/cli/src/query/.
registerQueryCommands(program)
registerManifestCommand(program, getVersion())

registerImportCommand(program)
registerValidateCommand(program)
registerRuntimeCommand(program)

program
  .command('formats')
  .description('List all supported chat history formats')
  .action(async () => {
    const { getSupportedFormats } = await import('./import')
    const formats = getSupportedFormats()
    console.log(`${formats.length} supported format(s):\n`)
    for (const f of formats) {
      console.log(`  ${f.id.padEnd(30)} ${f.name} (${f.platform}) [${f.extensions.join(', ')}]`)
    }
  })

program
  .command('mcp')
  .description('Start MCP Server (stdio transport, for ClaudeCode / Cursor / AI agents)')
  .action(async () => {
    const { startCliMcpServer } = await import('./mcp')
    await startCliMcpServer()
  })

program
  .command('chat')
  .description('Ask ChatLab AI about an imported chat session')
  .option('--session-id <id>', 'Source chat session ID')
  .option('--ai-chat-id <id>', 'Existing AI chat ID to continue')
  .option('-q, --question <text>', 'Question to ask')
  .option('--json', 'Output structured JSON')
  .option('--include-events', 'Include all agent stream chunks in JSON output')
  .option('--no-stream', 'Disable streaming output')
  .option('--locale <locale>', 'AI response locale', 'zh-CN')
  .action(async (options) => {
    const { runChatCommand } = await import('./ai/chat-command')
    const { dbManager, pathProvider } = initRuntime()
    const aiChatManager = new AIChatManager(pathProvider.getAiDataDir(), { nativeBinding: resolveNativeBinding() })

    try {
      await runChatCommand(
        {
          sessionId: options.sessionId,
          aiChatId: options.aiChatId,
          question: options.question,
          json: !!options.json,
          stream: options.stream,
          locale: options.locale,
          includeEvents: !!options.includeEvents,
        },
        { dbManager, pathProvider, aiChatManager }
      )
    } catch (error) {
      console.error(error instanceof Error ? error.message : String(error))
      process.exitCode = 1
    } finally {
      aiChatManager.close()
      dbManager.closeAll()
    }
  })

const configCmd = program.command('config').description('Configuration management')

configCmd
  .command('path')
  .description('Show config file path')
  .action(() => {
    console.log(getConfigPath())
  })

configCmd
  .command('show')
  .description('Show current configuration')
  .action(() => {
    const config = loadConfig()
    console.log(JSON.stringify(config, null, 2))
  })

configCmd
  .command('set <key> <value>')
  .description('Set a config field, e.g. `clb config set cli.allow_raw true`')
  .action((key: string, value: string) => {
    try {
      const result = setConfigField(key, value)
      console.log(`${result.section}.${result.key} = ${JSON.stringify(result.value)}`)
    } catch (err) {
      if (err instanceof ConfigSetError) {
        console.error(`Error: ${err.message}`)
        process.exitCode = 2
        return
      }
      throw err
    }
  })

/** CLI entry function */
export function run(argv?: string[]): void {
  // Logs go to ~/.chatlab/logs/app.log regardless of configured user data dir.
  initAppLogger(getSystemLogsDir())
  process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error)
    appLogger.error('crash', 'uncaughtException', error)
    process.exit(1)
  })
  process.on('unhandledRejection', (reason) => {
    console.error('Unhandled Rejection:', reason)
    appLogger.error('crash', 'unhandledRejection', reason)
    process.exit(1)
  })
  program.parse(argv)
}

// Auto-execute when run directly as a script
const isDirectRun = process.argv[1]?.endsWith('cli.ts') || process.argv[1]?.endsWith('cli.js')
if (isDirectRun) {
  run()
}
