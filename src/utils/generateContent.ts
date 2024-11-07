import { parse } from 'yaml';
import * as path from 'path';
import { readFileContent } from './readFileContent';

export async function generateContent(yamlContent: string, workspaceRoot: string): Promise<string> {
    try {
        const data = parse(yamlContent);
        let content = '你是一个资深的程序员，对于各种语言、框架、和最佳实践都有非常丰富的经验，擅长从样例代码中学习风格和模式。帮我完成以下编程相关的任务，谢谢。\n\n';

        // 先检查所有文件，过滤掉不存在的
        const checkFile = async (filePath: string): Promise<boolean> => {
            try {
                const trimmedPath = filePath.trim();
                const fullPath = path.isAbsolute(trimmedPath) 
                    ? trimmedPath 
                    : path.join(workspaceRoot, trimmedPath);
                const fileContent = await readFileContent(fullPath);
                return !fileContent.startsWith('[Error reading file:');
            } catch {
                return false;
            }
        };

        // 处理参考文件（数组格式）
        const allReferenceFiles = Array.isArray(data.参考文件) ? data.参考文件.map((item: any) => item.trim()) : [];
        const referenceFiles = await Promise.all(
            allReferenceFiles.map(async (file: string) => ({ file, exists: await checkFile(file) }))
        ).then(results => results.filter(r => r.exists).map(r => r.file));

        if (referenceFiles.length > 0) {
            content += `首先你有 ${referenceFiles.length} 个文件需要参考。尽量理解其内容、风格和原理，在之后的任务里会用到：\n\n`;
            content += referenceFiles.join('\n') + '\n\n';
        }

        // 处理 AI 注意事项
        const aiNotes = Array.isArray(data.AI请注意) ? data.AI请注意.filter(Boolean) : [];
        if (aiNotes.length > 0) {
            content += '在做任务前，请注意：\n\n';
            content += aiNotes.map((item: string) => `- ${item}`).join('\n') + '\n\n';
        }

        // 处理任务相关文件
        const allTaskFiles = Array.isArray(data.任务文件) ? data.任务文件.map((item: any) => item.trim()) : [];
        const taskFiles = await Promise.all(
            allTaskFiles.map(async (file: string) => ({ file, exists: await checkFile(file) }))
        ).then(results => results.filter(r => r.exists).map(r => r.file));

        if (taskFiles.length > 0) {
            content += '任务相关文件是：\n\n';
            content += taskFiles.join('\n') + '\n\n';
        }

        // 处理任务目标
        if (data.任务目标 && data.任务目标.trim()) {
            content += '你的任务是：\n\n';
            content += data.任务目标.trim() + '\n\n';
        }

        // 列出需要处理的文件
        if (taskFiles.length > 0) {
            content += '请尽可能在一次回复中就处理完以下文件：\n\n';
            content += taskFiles.join('\n') + '\n\n';
        }

        // 添加文件内容
        const allFiles = [...new Set([...referenceFiles, ...taskFiles])];
        if (allFiles.length > 0) {
            content += '以下是前边提到的文件内容\n\n';

            // 处理所有文件内容
            for (const filePath of allFiles) {
                const trimmedPath = filePath.trim();
                const fullPath = path.isAbsolute(trimmedPath) 
                    ? trimmedPath 
                    : path.join(workspaceRoot, trimmedPath);
                
                const fileContent = await readFileContent(fullPath);
                content += `<file path="${trimmedPath}">\n<![CDATA[\n${fileContent}\n]]>\n</file>\n\n`;
            }
        }

        return content;
    } catch (error) {
        console.error('Error parsing YAML:', error);
        throw error;
    }
} 