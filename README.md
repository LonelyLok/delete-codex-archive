# delete-codex-archive

VS Code extension to manage archived Codex session files.

## Features
- List files in the default Codex archive folder: `~/.codex/archived_sessions`.
- Delete archived session files from within VS Code.

## Usage
Open the Command Palette and run the extension's commands to list or delete archived sessions.

## How to build and install locally
1. Clone the project
2. Run `npm install`
3. Run `npm run compile`
4. Install `vsce`:
   `npm install -g @vscode/vsce`
5. Run `vsce package`
6. A `.vsix` file will be created in the project root
7. In VS Code, open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
8. Run **Extensions: Install from VSIX...**
9. Select the generated `.vsix` file
10. Reload VS Code when prompted

## Disclaimer:
This extension is a personal, for-fun project provided as-is, with no guarantees or support.