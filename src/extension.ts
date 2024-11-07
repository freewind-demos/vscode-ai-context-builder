import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { generateContent } from './utils/generateContent';
import { getAllFilePaths } from './utils/getAllFilePaths';
import { getContextDirectory } from './utils/getContextDirectory';
import { getTemplateContent } from './utils/getTemplateContent';
import { getTemplatePath } from './utils/getTemplatePath';

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
                'ai-context*.md'
            )
        );

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

        this.command = {
            command: 'vscode.open',
            title: 'Open File',
            arguments: [vscode.Uri.file(filePath)]
        };

        this.resourceUri = vscode.Uri.file(filePath);
        this.tooltip = filePath;
    }
}

export async function activate(context: vscode.ExtensionContext) {
    // 创建输出面板
    const outputChannel = vscode.window.createOutputChannel("AI Context Builder");
    outputChannel.show();

    outputChannel.appendLine('Starting AI Context Builder activation...');

    const contextFileProvider = new ContextFileProvider();
    outputChannel.appendLine('Created ContextFileProvider');

    // 注册 TreeDataProvider
    vscode.window.registerTreeDataProvider('aiContextBuilderView', contextFileProvider);
    outputChannel.appendLine('Registered TreeDataProvider for aiContextBuilderView');

    // 创新文件
    const createNewCommand = vscode.commands.registerCommand('aiContextBuilder.createNew', async () => {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            vscode.window.showErrorMessage('No workspace folder open');
            return;
        }

        const contextDir = getContextDirectory(workspaceFolders[0]!);

        // 读取目录中所有的 md 文件
        const files = await vscode.workspace.findFiles(
            new vscode.RelativePattern(
                vscode.Uri.file(contextDir),
                'ai-context*.md'
            )
        );

        // 找出最大的数字
        let maxIndex = 0;
        const regex = /ai-context-(\d+)\.md$/;

        files.forEach(file => {
            const match = path.basename(file.fsPath).match(regex);
            if (match && match[1]) {
                const num = parseInt(match[1], 10);
                maxIndex = Math.max(maxIndex, num);
            }
        });

        // 生成新文件名
        let fileName = files.length === 0 ? 'ai-context.md' : `ai-context-${maxIndex + 1}.md`;

        const filePath = path.join(contextDir, fileName);

        // 使用模板内容创建文件
        const templateContent = getTemplateContent(workspaceFolders[0]!);
        fs.writeFileSync(filePath, templateContent);

        // 打开新创建的文件
        const document = await vscode.workspace.openTextDocument(filePath);
        await vscode.window.showTextDocument(document);

        contextFileProvider.refresh();
    });

    // 生成文件
    const generateCommand = vscode.commands.registerCommand('aiContextBuilder.generate', async (file: ContextFile) => {
        try {
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders) {
                return;
            }

            // 读取文件内容
            const content = await fs.promises.readFile(file.filePath, 'utf8');
            
            // 生成内容
            const generatedContent = await generateContent(content, workspaceFolders[0]!.uri.fsPath);
            
            // 生成文件名
            const timestamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0]!;
            const baseName = path.basename(file.filePath, '.md');
            const fileName = `${baseName}-${timestamp}.txt`;

            // 写入文件
            const newFilePath = path.join(workspaceFolders[0]!.uri.fsPath, fileName);
            await fs.promises.writeFile(newFilePath, generatedContent, 'utf8');
            
            vscode.window.showInformationMessage(`Generated: ${fileName}`);
            
            // 打开生成的文件
            const document = await vscode.workspace.openTextDocument(newFilePath);
            await vscode.window.showTextDocument(document);
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to generate file: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    });

    // 重命名文件
    const renameCommand = vscode.commands.registerCommand('aiContextBuilder.rename', async (file: ContextFile) => {
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
    const duplicateCommand = vscode.commands.registerCommand('aiContextBuilder.duplicate', async (file: ContextFile) => {
        const baseName = path.basename(file.filePath, '.md');
        let index = 1;
        let newFileName = `${baseName}.copy${index}.md`;

        while (fs.existsSync(path.join(path.dirname(file.filePath), newFileName))) {
            index++;
            newFileName = `${baseName}.copy${index}.md`;
        }

        const newPath = path.join(path.dirname(file.filePath), newFileName);
        fs.copyFileSync(file.filePath, newPath);
        contextFileProvider.refresh();
    });

    // 删除文件
    const deleteCommand = vscode.commands.registerCommand('aiContextBuilder.delete', async (file: ContextFile) => {
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

    // 编辑模板文件
    const editTemplateCommand = vscode.commands.registerCommand('aiContextBuilder.editTemplate', async () => {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            vscode.window.showErrorMessage('No workspace folder open');
            return;
        }

        const templatePath = getTemplatePath(workspaceFolders[0]!);

        // 确保模板文件存在
        if (!fs.existsSync(templatePath)) {
            getTemplateContent(workspaceFolders[0]!); // 这会创建默认模板
        }

        // 打开模板文件
        const document = await vscode.workspace.openTextDocument(templatePath);
        await vscode.window.showTextDocument(document);
    });

    // 添加复制所有文件路径的命令
    const copyAllFilePathsCommand = vscode.commands.registerCommand('aiContextBuilder.copyAllFilePaths', async (uri: vscode.Uri, uris: vscode.Uri[]) => {
        try {
            // 如果是多选，使用 uris，否则用单个 uri
            const selectedUris = uris || [uri];
            const allPaths: string[] = [];

            // 收集所有文件路径
            for (const uri of selectedUris) {
                allPaths.push(...await getAllFilePaths(uri));
            }

            // 创建未保存的文档
            const content = allPaths.join('\n');
            const document = await vscode.workspace.openTextDocument();
            const editor = await vscode.window.showTextDocument(document);

            // 插入文件路径
            await editor.edit(editBuilder => {
                editBuilder.insert(new vscode.Position(0, 0), content);
            });

            vscode.window.showInformationMessage(`Found ${allPaths.length} file paths`);
        } catch (error) {
            vscode.window.showErrorMessage(`Error collecting file paths: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    });

    context.subscriptions.push(
        createNewCommand,
        generateCommand,
        renameCommand,
        duplicateCommand,
        deleteCommand,
        editTemplateCommand,
        copyAllFilePathsCommand
    );

    outputChannel.appendLine('AI Context Builder activation completed');
}

export function deactivate() { }
