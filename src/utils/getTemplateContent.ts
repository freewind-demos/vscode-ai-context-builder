import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { DEFAULT_TEMPLATE } from './defaultTemplate';
import { getTemplatePath } from './getTemplatePath';

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