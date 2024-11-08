# VSCode AI Context Builder

一个帮助管理 AI 交互上下文 YAML 文件的 VSCode 扩展。

## 功能特性

1. **文件管理**
   - 文件存储在 `.vscode/ai-context-builder/` 目录下
   - 文件显示在资源管理器视图的专门区域中
   - 文件按字母顺序排序
   - 所有文件遵循命名模式：`ai-context[-n].yaml`

2. **创建新文件**
   - 点击 "+" 按钮创建新文件
   - 第一个文件命名为 `ai-context.yaml`
   - 后续文件命名为 `ai-context-n.yaml`，其中 n 是下一个可用数字
   - 数字是连续的（例如：如果存在 1 和 3，下一个将是 4）
   - 新文件基于模板创建，包含预设的结构和说明

3. **文件操作**
   每个文件有 4 个内联按钮：
   - **生成** (⚡)：在项目根目录下创建一个带时间戳的 .txt 副本
   - **重命名** (✏️)：允许重命名文件
   - **复制** (📋)：创建一个带 `.copyN.yaml` 后缀的副本
   - **删除** (🗑️)：删除文件（带确认对话框）

4. **模板管理**
   - 在视图标题栏有一个设置图标，用于编辑模板
   - 模板文件保存在 `.vscode/ai-context-builder/template.yaml`
   - 模板定义了新建文件的默认结构
   - 模板包含四个主要部分：
     - 参考文件列表
     - 任务相关文件列表
     - AI 注意事项
     - 任务目标

5. **具体行为**
   - 点击文件可以在编辑器中打开
   - 删除操作会显示模态确认对话框
   - 复制操作会添加递增数字（例如：`.copy1.yaml`、`.copy2.yaml`）
   - 文件始终按字母顺序显示
   - 所有操作都会立即刷新视图
   - 生成的 txt 文件会保存在项目根目录

## 使用方法

1. 在 VSCode 中打开资源管理器视图
2. 找到 "AI Context Builder" 区域
3. 使用 "+" 按钮创建新的上下文文件
4. 使用内联按钮进行各种操作：
   - ⚡ 生成带时间戳的副本
   - ✏️ 重命名
   - 📋 创建带编号的副本
   - 🗑️ 删除（需确认）
5. 使用设置图标编辑模板文件

## 文件命名模式

- 新建文件：`ai-context.yaml`、`ai-context-1.yaml`、`ai-context-2.yaml` 等
- 复制的文件：`文件名.copy1.yaml`、`文件名.copy2.yaml` 等
- 生成的文件：`文件名-YYYYMMDDHHMMSS.txt`（保存在项目根目录）
- 模板文件：`.vscode/ai-context-builder/template.yaml`

## 模板结构

模板文件包含以下部分：
1. `reference_files`: 列出需要参考的文件
2. `task_files`: 列出需要修改或创建的文件
3. `ai_instructions`: AI 助手需要遵循的指示
4. `main_goal`: 任务目标和预期结果
