---
outline: deep
---

# 安装 ChatLab

ChatLab 提供 Desktop 和 CLI 两种安装方式。

## Desktop

前往 [ChatLab 官网](https://chatlab.fun) 或 [GitHub Releases](https://github.com/ChatLab/ChatLab/releases) 下载 macOS（Apple 芯片）安装包，双击安装即可。

macOS Desktop 目前仅支持搭载 Apple 芯片（M 系列）的 Mac。

## CLI

CLI 需要 Node.js 22.19 或更高版本。本 fork 不发布 npm 包，请在仓库克隆里构建并链接：

```bash
pnpm install
pnpm --filter chatlab-cli run build
pnpm --filter chatlab-cli run ensure-native
cd apps/cli && npm link # 提供 clb / chatlab 命令
```

`clb` 提供导入、查询和校验等命令行能力，运行 `clb --help` 查看全部子命令。本 fork 不再提供 CLI Web（浏览器版 UI 与常驻 HTTP 服务）。

安装完成后，继续阅读 [快速开始](/cn/usage/quick-start)。
