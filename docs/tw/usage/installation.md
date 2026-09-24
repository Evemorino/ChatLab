---
outline: deep
---

# 安裝 ChatLab

ChatLab 提供 Desktop 和 CLI 兩種安裝方式。

## Desktop

前往 [ChatLab 官網](https://chatlab.fun) 或 [GitHub Releases](https://github.com/ChatLab/ChatLab/releases) 下載 macOS（Apple 晶片）安裝程式，執行安裝即可。

macOS Desktop 目前僅支援搭載 Apple 晶片（M 系列）的 Mac。

## CLI

CLI 需要 Node.js 22.19 或更新版本。本 fork 不發佈 npm 包，請在倉庫複製中構建並連結：

```bash
pnpm install
pnpm --filter chatlab-cli run build
pnpm --filter chatlab-cli run ensure-native
cd apps/cli && npm link # 提供 clb / chatlab 指令
```

`clb` 提供匯入、查詢與驗證等命令列能力，執行 `clb --help` 可檢視所有子命令。本 fork 已不再提供 CLI Web（瀏覽器版 UI 與常駐 HTTP 服務）。

安裝完成後，繼續閱讀 [快速開始](/tw/usage/quick-start)。
