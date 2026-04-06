# Notebook %%stata Highlighter

在 Jupyter Notebook（`*.ipynb`）里，当代码单元第一行匹配 `%%stata` 时，自动将该单元语言切换为 `stata`，从而获得 Stata 语法高亮。

## 功能

- 自动识别 `%%stata`（大小写不敏感，支持后跟参数）
- 自动将该单元切换为 `Stata` 语言高亮
- 当你移除 `%%stata` 后，自动回退到 `python`（仅对本扩展自动切换过的单元生效）

## 安装与调试

1. 安装依赖：`npm install`
2. 编译扩展：`npm run compile`
3. 在 VS Code 中按 `F5` 启动 Extension Development Host
4. 在新窗口打开一个 `.ipynb`，新增代码单元并输入：

   ```python
   %%stata
   regress y x1 x2
   ```

5. 光标离开或继续编辑后，单元会自动切换到 `Stata` 高亮。

## 打包安装

你可以使用 `vsce` 打包：

1. `npm i -D @vscode/vsce`
2. `npx vsce package`
3. 在扩展面板中选择“从 VSIX 安装”并选中生成的 `.vsix`

## 已知限制

- 当前默认“回退语言”是 `python`（适配常见 Jupyter 场景）。
- 语法高亮规则是内置精简版，覆盖常见 Stata 关键字和语法。
