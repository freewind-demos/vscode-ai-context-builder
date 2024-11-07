import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { parse } from 'yaml';

// 添加一个帮助函数来获取或创建目标目录
function getContextDirectory(workspaceFolder: vscode.WorkspaceFolder): string {
    const contextDir = path.join(workspaceFolder.uri.fsPath, '.vscode', 'ai-context-builder');
    if (!fs.existsSync(contextDir)) {
        fs.mkdirSync(contextDir, { recursive: true });
    }
    return contextDir;
}

// 修改获取模板路径的函数
function getTemplatePath(workspaceFolder: vscode.WorkspaceFolder): string {
    return path.join(workspaceFolder.uri.fsPath, '.vscode', 'ai-context-builder', 'template.yaml');
}

// 修改读取模板内容的函数
function getTemplateContent(workspaceFolder: vscode.WorkspaceFolder): string {
    const templatePath = getTemplatePath(workspaceFolder);
    try {
        return fs.readFileSync(templatePath, 'utf8');
    } catch (error) {
        // 如果模板文件不存在，返回默认模板
        const defaultTemplate = `# 提供背景信息的参考文件
参考文件:
  - path/to/file1.ts
  - path/to/file2.ts

# 需要修改或创建的任务相关文件
任务文件:
  - path/to/file1.ts
  - path/to/file2.ts

# AI 需要注意的特殊说明和考虑事项
AI请注意:
  - 守住AI助手的底线，不要迎合我，准确回答我的问题
  - 如果涉及到文件，请显示完整路径，方便cursor定位或创建
  - 每次尽可能多的处理任务，最好一次性干完，不要先做一部分向我确认，除非我要求你这样做
  - 不要提问或要求确认，先完成任务再说，每次回复中处理的文件越多越好
  - 我对你的每次请求都很贵，请多干活少说话，帮我节约费用

# 任务目标和预期结果
任务目标: |
    任务写在这里
    可以多行`;

        // 确保目录存在
        const dir = path.dirname(templatePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        // 创建默认模板文件
        fs.writeFileSync(templatePath, defaultTemplate, 'utf8');
        return defaultTemplate;
    }
}

// 添加一个帮助函数来读取文件内容
async function readFileContent(filePath: string): Promise<string> {
    try {
        return await fs.promises.readFile(filePath, 'utf8');
    } catch (error) {
        console.error(`Error reading file ${filePath}:`, error);
        return `[Error reading file: ${error instanceof Error ? error.message : 'Unknown error'}]`;
    }
}

// 修改生成内容函数来处理新的格式
async function generateContent(yamlContent: string, workspaceRoot: string): Promise<string> {
    try {
        const data = parse(yamlContent);
        let content = '我有一个任务需要你帮忙完成，非常感谢！\n\n';

        // 处理参考文件（数组格式）
        const referenceFiles = Array.isArray(data.参考文件) ? data.参考文件.map((item: any) => item.trim()) : [];
        if (referenceFiles.length > 0) {
            content += `首先你有 ${referenceFiles.length} 个文件需要参考。尽量理解其内容、风格和原理，在之后的任务里会用到：\n\n`;
            content += referenceFiles.join('\n') + '\n\n';
        }

        // 处理 AI 注意事项（保持不变，因为原本就是数组格式）
        if (data.AI请注意 && Array.isArray(data.AI请注意)) {
            content += '## 在做任务前，请注意：\n\n';
            content += data.AI请注意.map((item: string) => `- ${item}`).join('\n') + '\n\n';
        }

        // 处理任务相关文件（数组格式）
        const taskFiles = Array.isArray(data.任务文件) ? data.任务文件.map((item: any) => item.trim()) : [];
        if (taskFiles.length > 0) {
            content += '## 任务相关文件是：\n\n';
            content += taskFiles.join('\n') + '\n\n';
        }

        // 处理任务目标（保持 | 格式不变）
        if (data.任务目标) {
            content += '## 你的任务是：\n\n';
            content += data.任务目标.trim() + '\n\n';
        }

        // 列出需要处理的文件
        if (taskFiles.length > 0) {
            content += '## 请尽可能在一次回复中就处理完以下文件：\n\n';
            content += taskFiles.join('\n') + '\n\n';
        }

        // 添加文件内容
        content += '## 以下是前边提到的文件内容\n\n';

        // 处理所有文件内容
        const allFiles = [...new Set([...referenceFiles, ...taskFiles])];
        for (const filePath of allFiles) {
            const trimmedPath = filePath.trim();
            const fullPath = path.isAbsolute(trimmedPath) 
                ? trimmedPath 
                : path.join(workspaceRoot, trimmedPath);
            
            const fileContent = await readFileContent(fullPath);
            content += `<file path="${trimmedPath}">\n<![CDATA[\n${fileContent}\n]]>\n</file>\n\n`;
        }

        return content;
    } catch (error) {
        console.error('Error parsing YAML:', error);
        throw error;
    }
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
        
        // 设置文件类型为 yaml，这样会使用 VSCode 的 YAML 文件图标
        this.resourceUri = vscode.Uri.file(filePath);
        
        // 可选：添加工具提示显示完整路径
        this.tooltip = filePath;
    }
}

// 添加一个递归获取所有文件路径的函数
async function getAllFilePaths(uri: vscode.Uri): Promise<string[]> {
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
        
        // 使用模板内容创建文件
        const templateContent = getTemplateContent(workspaceFolders[0]!);
        fs.writeFileSync(filePath, templateContent);
        
        // 打开新创建的文件
        const document = await vscode.workspace.openTextDocument(filePath);
        await vscode.window.showTextDocument(document);
        
        contextFileProvider.refresh();
    });

    // 生成文件
    let generateCommand = vscode.commands.registerCommand('aiContextBuilder.generate', async (file: ContextFile) => {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            return;
        }

        try {
            // 读取 YAML 文件内容
            const yamlContent = await readFileContent(file.filePath);
            
            // 生成新内容
            const content = await generateContent(yamlContent, workspaceFolders[0]!.uri.fsPath);

            // 创建新文件
            const timestamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0];
            const baseName = path.basename(file.filePath, '.yaml');
            const newFileName = `${baseName}-${timestamp}.txt`;
            const newFilePath = path.join(workspaceFolders[0]!.uri.fsPath, newFileName);
            
            // 写入文件
            await fs.promises.writeFile(newFilePath, content, 'utf8');
            
            vscode.window.showInformationMessage(`Generated: ${newFileName}`);
            
            // 打开生成的文件
            const document = await vscode.workspace.openTextDocument(newFilePath);
            await vscode.window.showTextDocument(document);
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to generate file: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
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

    // 编辑模板文件
    let editTemplateCommand = vscode.commands.registerCommand('aiContextBuilder.editTemplate', async () => {
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
    let copyAllFilePathsCommand = vscode.commands.registerCommand('aiContextBuilder.copyAllFilePaths', async (uri: vscode.Uri, uris: vscode.Uri[]) => {
        try {
            // 如果是多选，使用 uris，否则使用单个 uri
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
}

export function deactivate() {}
