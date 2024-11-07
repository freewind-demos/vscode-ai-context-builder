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

export function getTemplatePath(workspaceFolder: vscode.WorkspaceFolder): string {
    return path.join(getContextDirectory(workspaceFolder), 'template.yaml');
}

export async function getAllFilePaths(uri: vscode.Uri): Promise<string[]> {
    const stat = await vscode.workspace.fs.stat(uri);
    if (stat.type === vscode.FileType.File) {
        return [uri.fsPath];
    }

    const files: string[] = [];
    const entries = await vscode.workspace.fs.readDirectory(uri);
    
    for (const [name, type] of entries) {
        const childUri = vscode.Uri.joinPath(uri, name);
        if (type === vscode.FileType.File) {
            files.push(childUri.fsPath);
        } else if (type === vscode.FileType.Directory) {
            files.push(...await getAllFilePaths(childUri));
        }
    }
    
    return files;
} 