import * as vscode from 'vscode';
import * as path from 'path';
import { getContextDirectory } from './getContextDirectory';

export function getTemplatePath(workspaceFolder: vscode.WorkspaceFolder): string {
    return path.join(getContextDirectory(workspaceFolder), 'template.md');
} 