import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export function getContextDirectory(workspaceFolder: vscode.WorkspaceFolder): string {
    const contextDir = path.join(workspaceFolder.uri.fsPath, '.vscode', 'ai-context-builder');
    if (!fs.existsSync(contextDir)) {
        fs.mkdirSync(contextDir, { recursive: true });
    }
    return contextDir;
} 