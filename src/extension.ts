// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as fs from "fs/promises";
import os from "os";
import path from "path";

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {
  const treeDataProvider = new MyTreeProvider();
  await treeDataProvider.init();
  const extPrefix = 'DeleteCodexArchive'
  vscode.window.createTreeView('DeleteCodexArchiveView', { treeDataProvider });



  context.subscriptions.push(
    vscode.commands.registerCommand(`${extPrefix}.refreshView`, () => {
      treeDataProvider.refresh();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(`${extPrefix}.deleteFile`, async (item: FileTreeItem) => {
      if (item?.file?.path) {
        await fs.unlink(item.file.path);
        vscode.window.showInformationMessage(`Removed File ${item.file.name}`);
      }
      treeDataProvider.refresh();
    })
  )
}

// This method is called when your extension is deactivated
export function deactivate() { }

class FileTreeItem extends vscode.TreeItem {
  readonly file: any;

  constructor(fileObj: any) {
    super(
      fileObj.summary ?? fileObj.name,
      vscode.TreeItemCollapsibleState.None
    );
    this.file = fileObj;
    this.contextValue = "fileTreeItem";
  }
}

async function isDirExists(path: string): Promise<boolean> {
  try {
    await fs.access(path);
    return true;
  } catch {
    return false;
  }
}

async function walkDirectoryRecursively(rootPath: string): Promise<string[]> {
  const entries = await fs.readdir(rootPath, { withFileTypes: true });
  const results = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(rootPath, entry.name);

      if (entry.isDirectory()) {
        return walkDirectoryRecursively(fullPath);
      }

      if (entry.isFile()) {
        return [fullPath];
      }

      return [];
    })
  );

  return results.flat();
}

async function findJsonlFiles(rootPath: string): Promise<string[]> {
  const allFiles = await walkDirectoryRecursively(rootPath);
  return allFiles.filter((filePath) => filePath.endsWith(".jsonl"));
}


class MyTreeProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;
  private isCodexArchivedSessionsDirPresent: boolean = false;
  private isCodexSessionsDirPresent: boolean = false;
  private codexArchivedSessionsPath: string = '';
  private codexSessionsPath: string = '';

  async init() {
    const archivedSessionsPath = path.join(
      os.homedir(),
      ".codex",
      "archived_sessions"
    );
    const sessionsPath = path.join(
      os.homedir(),
      ".codex",
      "sessions"
    );
    const isArchivedExists = await isDirExists(archivedSessionsPath);
    this.isCodexArchivedSessionsDirPresent = isArchivedExists;
    this.codexArchivedSessionsPath = archivedSessionsPath;

    const isSessionsExists = await isDirExists(sessionsPath);
    this.isCodexSessionsDirPresent = isSessionsExists;
    this.codexSessionsPath = sessionsPath;
  }

  async getChildren(element?: vscode.TreeItem): Promise<vscode.TreeItem[]> {
    if (!element) {
      const headlineForSessions = new vscode.TreeItem(
        `Codex Sessions Directory ${this.isCodexSessionsDirPresent ? 'found' : 'not found'}`,
        vscode.TreeItemCollapsibleState.Expanded
      );
      headlineForSessions.contextValue = 'headlineForSessions';
      const headlineForArchived = new vscode.TreeItem(
        `Codex Archived Sessions Directory ${this.isCodexArchivedSessionsDirPresent ? 'found' : 'not found'}`,
        vscode.TreeItemCollapsibleState.Expanded
      );
      headlineForArchived.contextValue = 'headlineForArchived';
      return [headlineForSessions, headlineForArchived];
    }

    if (element.contextValue === 'headlineForSessions') {
      if (!this.isCodexSessionsDirPresent) {
        return [];
      }
      const jsonlFiles = await findJsonlFiles(this.codexSessionsPath);
      return jsonlFiles.map(filePath => {
        const fileName = path.basename(filePath);
        const fileItem = new FileTreeItem({ name: fileName, path: filePath, summary: fileName });
        return fileItem;
      })
    }

    if (element.contextValue === 'headlineForArchived') {
      if (!this.isCodexArchivedSessionsDirPresent) {
        return [];
      }

      const entries = await fs.readdir(
        this.codexArchivedSessionsPath,
        { withFileTypes: true }
      );
      const files = await Promise.all(entries
        .filter(e => e.isFile())
        .map(async e => {
          const filePath = path.join(this.codexArchivedSessionsPath, e.name);
          const content = await fs.readFile(filePath, "utf8");
          const messages = content
            .split("\n").filter(line => line.trim() !== "").map(line => JSON.parse(line));
          const marker = "My request for Codex:";
          const targetMessage = messages.find(msg => msg.type === 'event_msg' && msg?.payload?.type === 'user_message' && msg?.payload?.message?.includes(marker))
          let summary = e.name;
          if (targetMessage) {
            const idx = targetMessage.payload.message.indexOf(marker);
            if (idx !== -1) {
              summary = targetMessage.payload.message.slice(idx + marker.length).trim();
            }
          }
          return {
            name: e.name,
            summary,
            path: filePath
          }
        }));
      return files.map(fileObj => {
        const fileItem = new FileTreeItem(fileObj);
        return fileItem;
      })

    }

    return [];
  }

  getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
    return element;
  }

  refresh() {
    this._onDidChangeTreeData.fire();
  }
}
