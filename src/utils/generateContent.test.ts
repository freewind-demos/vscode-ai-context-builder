import { describe, expect, it, vi } from 'vitest';
import { generateContent } from './generateContent';
import { readFileContent } from './readFileContent';

// Mock readFileContent
vi.mock('./readFileContent', () => ({
    readFileContent: vi.fn().mockImplementation((filePath: string) => {
        return Promise.resolve(`Content of ${filePath}`);
    })
}));

describe('generateContent', () => {
    const mockYamlContent = `
参考文件:
  - src/file1.ts
  - src/file2.ts

任务文件:
  - src/file3.ts
  - src/file4.ts

AI请注意:
  - 注意事项1
  - 注意事项2

任务目标: |
    这是任务目标
    有多行
    `;

    const workspaceRoot = '/workspace';

    it('should generate correct content', async () => {
        const content = await generateContent(mockYamlContent, workspaceRoot);
        expect(content).toMatchInlineSnapshot(`
          "我有一个任务需要你帮忙完成，非常感谢！

          首先你有 2 个文件需要参考。尽量理解其内容、风格和原理，在之后的任务里会用到：

          src/file1.ts
          src/file2.ts

          在做任务前，请注意：

          - 注意事项1
          - 注意事项2

          任务相关文件是：

          src/file3.ts
          src/file4.ts

          你的任务是：

          这是任务目标
          有多行

          请尽可能在一次回复中就处理完以下文件：

          src/file3.ts
          src/file4.ts

          以下是前边提到的文件内容

          <file path="src/file1.ts">
          <![CDATA[
          Content of /workspace/src/file1.ts
          ]]>
          </file>

          <file path="src/file2.ts">
          <![CDATA[
          Content of /workspace/src/file2.ts
          ]]>
          </file>

          <file path="src/file3.ts">
          <![CDATA[
          Content of /workspace/src/file3.ts
          ]]>
          </file>

          <file path="src/file4.ts">
          <![CDATA[
          Content of /workspace/src/file4.ts
          ]]>
          </file>

          "
        `);
    });

    it('should handle empty sections', async () => {
        const emptyYamlContent = `
参考文件: []
任务文件: []
AI请注意: []
任务目标: ""
`;
        const content = await generateContent(emptyYamlContent, workspaceRoot);
        expect(content).toMatchInlineSnapshot(`
          "我有一个任务需要你帮忙完成，非常感谢！

          "
        `);
    });

    it('should handle invalid YAML content', async () => {
        const invalidYamlContent = 'invalid: [yaml: content:';
        await expect(generateContent(invalidYamlContent, workspaceRoot))
            .rejects
            .toThrow();
    });

    it('should skip non-existent files', async () => {
        const yamlWithMissingFiles = `
参考文件:
  - src/missing1.ts
  - src/file2.ts

任务文件:
  - src/file3.ts
  - src/missing2.ts
`;
        
        // 修改 mock 实现，模拟某些文件不存在
        vi.mocked(readFileContent).mockImplementation((filePath: string) => {
            if (filePath.includes('missing')) {
                return Promise.resolve(`[Error reading file: ENOENT: no such file or directory]`);
            }
            return Promise.resolve(`Content of ${filePath}`);
        });

        const content = await generateContent(yamlWithMissingFiles, workspaceRoot);
        expect(content).toMatchInlineSnapshot(`
          "我有一个任务需要你帮忙完成，非常感谢！

          首先你有 1 个文件需要参考。尽量理解其内容、风格和原理，在之后的任务里会用到：

          src/file2.ts

          任务相关文件是：

          src/file3.ts

          请尽可能在一次回复中就处理完以下文件：

          src/file3.ts

          以下是前边提到的文件内容

          <file path="src/file2.ts">
          <![CDATA[
          Content of /workspace/src/file2.ts
          ]]>
          </file>

          <file path="src/file3.ts">
          <![CDATA[
          Content of /workspace/src/file3.ts
          ]]>
          </file>

          "
        `);
    });
}); 