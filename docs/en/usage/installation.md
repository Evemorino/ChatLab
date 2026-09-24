---
outline: deep
---

# Install ChatLab

ChatLab is available as a Desktop app or CLI.

## Desktop

Download the macOS (Apple Silicon) installer from the [ChatLab website](https://chatlab.fun) or [GitHub Releases](https://github.com/ChatLab/ChatLab/releases), then run it.

The macOS Desktop app currently supports Apple Silicon Macs only.

## CLI

The CLI requires Node.js 22.19 or newer. This fork publishes no npm package, so build and link it from a clone:

```bash
pnpm install
pnpm --filter chatlab-cli run build
pnpm --filter chatlab-cli run ensure-native
cd apps/cli && npm link # provides the clb / chatlab commands
```

`clb` covers import, query and validation from the command line; run `clb --help` for the full list. This fork no longer ships CLI Web (the browser UI and its resident HTTP server).

After installation, continue with [Quick Start](/usage/quick-start).
