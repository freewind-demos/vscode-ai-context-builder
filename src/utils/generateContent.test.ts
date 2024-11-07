import * as path from 'path';
import { vi } from 'vitest';
import { generateContent } from './generateContent';
import { readFileContent } from './readFileContent';

// Mock readFileContent
vi.mock('./readFileContent', () => ({
  readFileContent: vi.fn()
}));

describe('generateContent', () => {
  const workspaceRoot = '/workspace';

  beforeEach(() => {
    vi.mocked(readFileContent).mockReset();
  });

  it('should handle complete content with existing files', async () => {
    // Mock file contents
    vi.mocked(readFileContent)
      .mockResolvedValueOnce('content of file1')
      .mockResolvedValueOnce('content of file2')
      .mockResolvedValueOnce('content of file3');

    const content = `# 参考文件(cd110934-9215-496a-92fb-7f00ff4eeea8)
src/file1.ts
src/file2.ts

# 任务文件(a9868e79-fb5c-45a2-a59f-83e1803ddf63)
src/file3.ts

# AI请注意(986314a8-106b-4467-88f3-1415e4be99ec)
注意事项1
注意事项2

# 任务目标(d6245440-137f-4f52-ae25-332b1cc83140)
这是任务目标
有多行内容`;

    const result = await generateContent(content, workspaceRoot);
    expect(result).toMatchInlineSnapshot(`
          "你是一个资深的程序员，对于各种语言、框架、和最佳实践都有非常丰富的经验，擅长从样例代码中学习风格和模式。帮我完成以下编程相关的任务，谢谢。

          <参考文件>
            - src/file1.ts
            - src/file2.ts
          </参考文件>

          <任务文件>
            - src/file3.ts
          </任务文件>

          <AI请注意>
            - 注意事项1
            - 注意事项2
          </AI请注意>

          <任务目标>
              这是任务目标
              有多行内容
          </任务目标>

          <file path="src/file1.ts">
          <![CDATA[
          undefined
          ]]>
          </file>

          <file path="src/file2.ts">
          <![CDATA[
          undefined
          ]]>
          </file>

          <file path="src/file3.ts">
          <![CDATA[
          undefined
          ]]>
          </file>

          "
        `);
  });

  it('should skip non-existent files', async () => {
    const content = `# 参考文件(cd110934-9215-496a-92fb-7f00ff4eeea8)
/non/existent/file1.ts
/non/existent/file2.ts

# 任务文件(a9868e79-fb5c-45a2-a59f-83e1803ddf63)
/non/existent/file3.ts

# AI请注意(986314a8-106b-4467-88f3-1415e4be99ec)
注意事项1
注意事项2

# 任务目标(d6245440-137f-4f52-ae25-332b1cc83140)
这是任务目标`;

    const result = await generateContent(content, workspaceRoot);
    expect(result).toMatchInlineSnapshot(`
          "你是一个资深的程序员，对于各种语言、框架、和最佳实践都有非常丰富的经验，擅长从样例代码中学习风格和模式。帮我完成以下编程相关的任务，谢谢。

          <AI请注意>
            - 注意事项1
            - 注意事项2
          </AI请注意>

          <任务目标>
              这是任务目标
          </任务目标>

          "
        `);
  });

  it('should handle empty content', async () => {
    const content = `# 参考文件(cd110934-9215-496a-92fb-7f00ff4eeea8)

# 任务文件(a9868e79-fb5c-45a2-a59f-83e1803ddf63)

# AI请注意(986314a8-106b-4467-88f3-1415e4be99ec)
一些注意事项

# 任务目标(d6245440-137f-4f52-ae25-332b1cc83140)
任务目标内容`;

    const result = await generateContent(content, workspaceRoot);
    expect(result).toMatchInlineSnapshot(`
          "你是一个资深的程序员，对于各种语言、框架、和最佳实践都有非常丰富的经验，擅长从样例代码中学习风格和模式。帮我完成以下编程相关的任务，谢谢。

          <AI请注意>
            - 一些注意事项
          </AI请注意>

          <任务目标>
              任务目标内容
          </任务目标>

          "
        `);
  });

  it('should process existing files', async () => {
    const content = `# 参考文件(cd110934-9215-496a-92fb-7f00ff4eeea8)
${path.join(workspaceRoot, 'src/file1.ts')}
${path.join(workspaceRoot, 'src/file2.ts')}

# 任务文件(a9868e79-fb5c-45a2-a59f-83e1803ddf63)
${path.join(workspaceRoot, 'src/file3.ts')}

# AI请注意(986314a8-106b-4467-88f3-1415e4be99ec)
注意事项1
注意事项2

# 任务目标(d6245440-137f-4f52-ae25-332b1cc83140)
这是任务目标`;

    const result = await generateContent(content, workspaceRoot);
    expect(result).toMatchInlineSnapshot(`
          "你是一个资深的程序员，对于各种语言、框架、和最佳实践都有非常丰富的经验，擅长从样例代码中学习风格和模式。帮我完成以下编程相关的任务，谢谢。

          <AI请注意>
            - 注意事项1
            - 注意事项2
          </AI请注意>

          <任务目标>
              这是任务目标
          </任务目标>

          "
        `);
  });
}); 