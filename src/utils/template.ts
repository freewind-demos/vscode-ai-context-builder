import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export const DEFAULT_TEMPLATE = `# 提供背景信息的参考文件
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

export function getTemplateContent(workspaceFolder: vscode.WorkspaceFolder): string {
    const templatePath = getTemplatePath(workspaceFolder);
    try {
        return fs.readFileSync(templatePath, 'utf8');
    } catch (error) {
        // 确保目录存在
        const dir = path.dirname(templatePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        // 创建默认模板文件
        fs.writeFileSync(templatePath, DEFAULT_TEMPLATE, 'utf8');
        return DEFAULT_TEMPLATE;
    }
}

export function getTemplatePath(workspaceFolder: vscode.WorkspaceFolder): string {
    return path.join(getContextDirectory(workspaceFolder), 'template.yaml');
}

function getContextDirectory(workspaceFolder: vscode.WorkspaceFolder): string {
    const contextDir = path.join(workspaceFolder.uri.fsPath, '.vscode', 'ai-context-builder');
    if (!fs.existsSync(contextDir)) {
        fs.mkdirSync(contextDir, { recursive: true });
    }
    return contextDir;
} 