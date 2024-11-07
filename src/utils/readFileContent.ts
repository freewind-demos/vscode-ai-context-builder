import * as fs from 'fs';

export async function readFileContent(filePath: string): Promise<string> {
    try {
        return await fs.promises.readFile(filePath, 'utf8');
    } catch (error) {
        console.error(`Error reading file ${filePath}:`, error);
        return `[Error reading file: ${error instanceof Error ? error.message : 'Unknown error'}]`;
    }
} 