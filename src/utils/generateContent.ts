import * as path from 'path';
import { readFileContent } from './readFileContent';
import { parseContextFile } from './parseContextFile';
import { Sections } from './types';

export async function generateContent(markdownContent: string, workspaceRoot: string): Promise<string> {
    try {
        let content = '你是一个资深的程序员，对于各种语言、框架、和最佳实践都有非常丰富的经验，擅长从样例代码中学习风格和模式。帮我完成以下编程相关的任务，谢谢。\n\n';

        // 使用 parseContextFile 解析内容
        const sections = parseContextFile(markdownContent);

        // 检查文件是否存在
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

        // 处理参考文件
        const referenceFiles = await Promise.all(
            sections['参考文件'].map(async file => ({ file, exists: await checkFile(file) }))
        ).then(results => results.filter(r => r.exists).map(r => r.file));

        if (referenceFiles.length > 0) {
            content += '<参考文件>\n';
            content += referenceFiles.map(file => `  - ${file}`).join('\n');
            content += '\n</参考文件>\n\n';
        }

        // 处理任务相关文件
        const taskFiles = await Promise.all(
            sections['任务文件'].map(async file => ({ file, exists: await checkFile(file) }))
        ).then(results => results.filter(r => r.exists).map(r => r.file));

        if (taskFiles.length > 0) {
            content += '<任务文件>\n';
            content += taskFiles.map(file => `  - ${file}`).join('\n');
            content += '\n</任务文件>\n\n';
        }

        // 处理 AI 注意事项
        if (sections['AI请注意']) {
            content += '<AI请注意>\n';
            content += sections['AI请注意'].split('\n').map(line => `  - ${line}`).join('\n');
            content += '\n</AI请注意>\n\n';
        }

        // 处理任务目标
        if (sections['任务目标']) {
            content += '<任务目标>\n';
            content += sections['任务目标'].split('\n').map(line => `    ${line}`).join('\n');
            content += '\n</任务目标>\n\n';
        }

        // 添加文件内容
        const allFiles = [...new Set([...referenceFiles, ...taskFiles])];
        if (allFiles.length > 0) {
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
        console.error('Error parsing content:', error);
        throw error;
    }
} 