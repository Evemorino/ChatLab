---
outline: deep
---

# Import Chat Records

ChatLab supports several ways to import chat records.

## Desktop: Drag a file into ChatLab

This is the simplest import path:

1. Drag the chat platform's exported **data file** into the upload area on the homepage.
2. Wait for parsing and import to finish.

The homepage also supports incremental imports. When a new file matches an imported session, ChatLab adds the new messages.

## Automation: Use an API or automatic sync

These advanced options are intended for ongoing integrations. The **API Import** section on the homepage provides two directions:

- **Automatic Sync (Pull):** ChatLab periodically fetches new chat records from a configured data source. See the [Pull Remote Data Source Protocol](/standard/chatlab-pull).
- **API Push (Push):** a third-party tool, plugin, or script writes records through ChatLab's local API. See the [Push Import Protocol](/standard/chatlab-import).

## If an import fails

Open **Settings** → **Storage** → **Log Files** in ChatLab, then inspect the `import` directory.

If the issue remains, submit a GitHub Issue with desensitized error details.
