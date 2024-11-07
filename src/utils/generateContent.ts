import { parse } from 'yaml';
import * as path from 'path';
import { readFileContent } from './readFileContent';

export async function generateContent(yamlContent: string, workspaceRoot: string): Promise<string> {
    try {
        const data = parse(yamlContent);
        let content = '我有一个任务需要你帮忙完成，非常感谢！\n\n';

        // 处理参考文件（数组格式）
        const referenceFiles = Array.isArray(data.参考文件) ? data.参考文件.map((item: any) => item.trim()) : [];
        if (referenceFiles.length > 0) {
            content += `首先你有 ${referenceFiles.length} 个文件需要参考。尽量理解其内容、风格和原理，在之后的任务里会用到：\n\n`;
            content += referenceFiles.join('\n') + '\n\n';
        }

        // 处理 AI 注意事项
        if (data.AI请注意 && Array.isArray(data.AI请注意)) {
            content += '在做任务前，请注意：\n\n';
            content += data.AI请注意.map((item: string) => `- ${item}`).join('\n') + '\n\n';
        }

        // 处理任务相关文件
        const taskFiles = Array.isArray(data.任务文件) ? data.任务文件.map((item: any) => item.trim()) : [];
        if (taskFiles.length > 0) {
            content += '任务相关文件是：\n\n';
            content += taskFiles.join('\n') + '\n\n';
        }

        // 处理任务目标
        if (data.任务目标) {
            content += '你的任务是：\n\n';
            content += data.任务目标.trim() + '\n\n';
        }

        // 列出需要处理的文件
        if (taskFiles.length > 0) {
            content += '请尽可能在一次回复中就处理完以下文件：\n\n';
            content += taskFiles.join('\n') + '\n\n';
        }

        // 添加文件内容
        content += '以下是前边提到的文件内容\n\n';

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