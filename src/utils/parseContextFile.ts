import { Sections } from "./types";

const SECTION_IDS = {
    '参考文件': 'cd110934-9215-496a-92fb-7f00ff4eeea8',
    '任务文件': 'a9868e79-fb5c-45a2-a59f-83e1803ddf63',
    'AI请注意': '986314a8-106b-4467-88f3-1415e4be99ec',
    '任务目标': 'd6245440-137f-4f52-ae25-332b1cc83140'
} as const;

type SectionKey = keyof Sections;

export function parseContextFile(content: string): Sections {
    const sections: Sections = {
        '参考文件': [],
        '任务文件': [],
        'AI请注意': '',
        '任务目标': ''
    };

    let currentSection: SectionKey | '' = '';
    const lines = content.split('\n');
    const contentLines: string[] = [];

    for (let line of lines) {
        const trimmedLine = line.trim();
        
        // 检查带有UUID的标题
        if (trimmedLine.startsWith('# ')) {
            // 如果有收集的内容，处理之前的部分
            if (currentSection && contentLines.length > 0) {
                if (currentSection === 'AI请注意' || currentSection === '任务目标') {
                    sections[currentSection] = contentLines.join('\n');
                } else {
                    sections[currentSection].push(...contentLines);
                }
                contentLines.length = 0;
            }

            const titleLine = trimmedLine.substring(2);
            for (const [section, uuid] of Object.entries(SECTION_IDS)) {
                if (titleLine.includes(uuid)) {
                    currentSection = section as SectionKey;
                    break;
                }
            }
            continue;
        }
        
        // 收集内容
        if (currentSection && trimmedLine) {
            // 移除列表符号和空格
            const lineContent = line.replace(/^[-*]\s+/, '').trim();
            if (lineContent) {
                contentLines.push(lineContent);
            }
        }
    }

    // 处理最后一个部分的内容
    if (currentSection && contentLines.length > 0) {
        if (currentSection === 'AI请注意' || currentSection === '任务目标') {
            sections[currentSection] = contentLines.join('\n');
        } else {
            sections[currentSection].push(...contentLines);
        }
    }

    // 验证是否成功解析了任何内容
    if (Object.values(sections).every(value => 
        Array.isArray(value) ? value.length === 0 : !value
    )) {
        throw new Error('Invalid format: No valid sections found');
    }

    return sections;
}