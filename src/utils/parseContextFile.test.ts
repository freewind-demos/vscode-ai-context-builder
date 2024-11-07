import { parseContextFile } from './parseContextFile';

describe('parseContextFile', () => {
    it('should parse valid content correctly', () => {
        const content = `# 参考文件(cd110934-9215-496a-92fb-7f00ff4eeea8)
/path/to/file1.ts
/path/to/file2.ts

# 任务文件(a9868e79-fb5c-45a2-a59f-83e1803ddf63)
- /path/to/file3.ts
- /path/to/file4.ts

# AI请注意(986314a8-106b-4467-88f3-1415e4be99ec)
- 注意事项1
- 注意事项2

# 任务目标(d6245440-137f-4f52-ae25-332b1cc83140)
这是任务目标
有多行内容`;

        expect(parseContextFile(content)).toMatchInlineSnapshot(`
          {
            "AI请注意": "注意事项1
          注意事项2",
            "任务文件": [
              "/path/to/file3.ts",
              "/path/to/file4.ts",
            ],
            "任务目标": "这是任务目标
          有多行内容",
            "参考文件": [
              "/path/to/file1.ts",
              "/path/to/file2.ts",
            ],
          }
        `);
    });

    it('should handle empty sections', () => {
        const content = `# 参考文件(cd110934-9215-496a-92fb-7f00ff4eeea8)

# 任务文件(a9868e79-fb5c-45a2-a59f-83e1803ddf63)
/path/to/file.ts`;

        expect(parseContextFile(content)).toMatchInlineSnapshot(`
          {
            "AI请注意": "",
            "任务文件": [
              "/path/to/file.ts",
            ],
            "任务目标": "",
            "参考文件": [],
          }
        `);
    });

    it('should throw error for invalid content', () => {
        const invalidContent = `# 无效标题
一些内容`;

        expect(() => parseContextFile(invalidContent)).toThrow('Invalid format: No valid sections found');
    });

    it('should handle mixed list styles', () => {
        const content = `# 参考文件(cd110934-9215-496a-92fb-7f00ff4eeea8)
- file1.ts
* file2.ts
  file3.ts`;

        expect(parseContextFile(content)).toMatchInlineSnapshot(`
          {
            "AI请注意": "",
            "任务文件": [],
            "任务目标": "",
            "参考文件": [
              "file1.ts",
              "file2.ts",
              "file3.ts",
            ],
          }
        `);
    });

    it('should ignore sections with invalid UUIDs', () => {
        const content = `# 参考文件(invalid-uuid)
file1.ts

# 任务文件(a9868e79-fb5c-45a2-a59f-83e1803ddf63)
file2.ts`;

        expect(parseContextFile(content)).toMatchInlineSnapshot(`
          {
            "AI请注意": "",
            "任务文件": [
              "file2.ts",
            ],
            "任务目标": "",
            "参考文件": [],
          }
        `);
    });

    it('should preserve indentation in task objective', () => {
        const content = `# 任务目标(d6245440-137f-4f52-ae25-332b1cc83140)
    缩进的内容
        双重缩进
    另一行`;

        expect(parseContextFile(content)).toMatchInlineSnapshot(`
          {
            "AI请注意": "",
            "任务文件": [],
            "任务目标": "缩进的内容
          双重缩进
          另一行",
            "参考文件": [],
          }
        `);
    });
}); 