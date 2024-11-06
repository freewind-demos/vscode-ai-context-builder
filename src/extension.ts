import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

// 添加一个帮助函数来获取或创建目标目录
function getContextDirectory(workspaceFolder: vscode.WorkspaceFolder): string {
    const contextDir = path.join(workspaceFolder.uri.fsPath, '.vscode', 'ai-context-builder');
    if (!fs.existsSync(contextDir)) {
        fs.mkdirSync(contextDir, { recursive: true });
    }
    return contextDir;
}

class ContextFileProvider implements vscode.TreeDataProvider<ContextFile> {
    private _onDidChangeTreeData: vscode.EventEmitter<ContextFile | undefined | null | void> = new vscode.EventEmitter<ContextFile | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<ContextFile | undefined | null | void> = this._onDidChangeTreeData.event;

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: ContextFile): vscode.TreeItem {
        return element;
    }

    async getChildren(): Promise<ContextFile[]> {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            return Promise.resolve([]);
        }

        const workspaceFolder = workspaceFolders[0]!;
        const contextDir = getContextDirectory(workspaceFolder);
        
        const files = await vscode.workspace.findFiles(
            new vscode.RelativePattern(
                vscode.Uri.file(contextDir),
                'ai-context*.yaml'
            )
        );
        
        // 简单的字典排序
        return files
            .map(file => new ContextFile(
                path.basename(file.fsPath),
                file.fsPath,
                vscode.TreeItemCollapsibleState.None
            ))
            .sort((a, b) => a.label.localeCompare(b.label));
    }
}

class ContextFile extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly filePath: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState
    ) {
        super(label, collapsibleState);
        
        // 添加点击时打开文件的命令
        this.command = {
            command: 'vscode.open',
            title: 'Open File',
            arguments: [vscode.Uri.file(filePath)]
        };
        
        // 可选：添加工具提示显示完整路径
        this.tooltip = filePath;
    }
}

export async function activate(context: vscode.ExtensionContext) {
    console.log('AI Context Builder is now active');
    
    const contextFileProvider = new ContextFileProvider();
    vscode.window.registerTreeDataProvider('aiContextBuilderView', contextFileProvider);

    // 创建新文件
    let createNewCommand = vscode.commands.registerCommand('aiContextBuilder.createNew', async () => {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            vscode.window.showErrorMessage('No workspace folder open');
            return;
        }

        const contextDir = getContextDirectory(workspaceFolders[0]!);
        
        // 读取目录中所有的 yaml 文件
        const files = await vscode.workspace.findFiles(
            new vscode.RelativePattern(
                vscode.Uri.file(contextDir),
                'ai-context*.yaml'
            )
        );
        
        // 找出最大的数字
        let maxIndex = 0;
        const regex = /ai-context-(\d+)\.yaml$/;
        
        files.forEach(file => {
            const match = path.basename(file.fsPath).match(regex);
            if (match && match[1]) {
                const num = parseInt(match[1], 10);
                maxIndex = Math.max(maxIndex, num);
            }
        });

        // 生成新文件名
        let fileName = files.length === 0 ? 'ai-context.yaml' : `ai-context-${maxIndex + 1}.yaml`;

        const filePath = path.join(contextDir, fileName);
        fs.writeFileSync(filePath, '');
        contextFileProvider.refresh();
    });

    // 生成文件
    let generateCommand = vscode.commands.registerCommand('aiContextBuilder.generate', async (file: ContextFile) => {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            return;
        }

        const timestamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0];
        const baseName = path.basename(file.filePath, '.yaml');
        const newFileName = `${baseName}-${timestamp}.txt`;
        const newFilePath = path.join(workspaceFolders[0]!.uri.fsPath, newFileName);
        
        fs.copyFileSync(file.filePath, newFilePath);
        vscode.window.showInformationMessage(`Generated: ${newFileName}`);
        
        // 可选：在编辑器中打开生成的文件
        const document = await vscode.workspace.openTextDocument(newFilePath);
        await vscode.window.showTextDocument(document);
    });

    // 重命名文件
    let renameCommand = vscode.commands.registerCommand('aiContextBuilder.rename', async (file: ContextFile) => {
        const newName = await vscode.window.showInputBox({
            prompt: 'Enter new file name',
            value: file.label
        });

        if (newName) {
            const newPath = path.join(path.dirname(file.filePath), newName);
            fs.renameSync(file.filePath, newPath);
            contextFileProvider.refresh();
        }
    });

    // 复制文件
    let duplicateCommand = vscode.commands.registerCommand('aiContextBuilder.duplicate', async (file: ContextFile) => {
        const baseName = path.basename(file.filePath, '.yaml');
        let index = 1;
        let newFileName = `${baseName}.copy${index}.yaml`;
        
        while (fs.existsSync(path.join(path.dirname(file.filePath), newFileName))) {
            index++;
            newFileName = `${baseName}.copy${index}.yaml`;
        }

        const newPath = path.join(path.dirname(file.filePath), newFileName);
        fs.copyFileSync(file.filePath, newPath);
        contextFileProvider.refresh();
    });

    // 删除文件
    let deleteCommand = vscode.commands.registerCommand('aiContextBuilder.delete', async (file: ContextFile) => {
        try {
            const answer = await vscode.window.showWarningMessage(
                `Are you sure you want to delete "${file.label}"?`,
                { modal: true },
                'Yes',
                'No'
            );

            if (answer === 'Yes') {
                try {
                    fs.unlinkSync(file.filePath);
                    contextFileProvider.refresh();
                    vscode.window.showInformationMessage(`Successfully deleted ${file.label}`);
                } catch (error) {
                    vscode.window.showErrorMessage(`Failed to delete ${file.label}: ${error instanceof Error ? error.message : 'Unknown error'}`);
                }
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    });

    context.subscriptions.push(
        createNewCommand,
        generateCommand,
        renameCommand,
        duplicateCommand,
        deleteCommand
    );
}

export function deactivate() {}
