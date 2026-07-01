# 摸鱼小说阅读器

浮动窗口、置顶、快捷隐藏的本地小说阅读器。支持透明摸鱼模式、多格式导入、章节书签与子窗口管理。

**技术栈：Electron 35 + Vue 3 + TypeScript**（纯本地，无需 Visual Studio）

**当前版本：v0.6.0**

## 快速开始

```bash
npm install
npm run electron:dev
```

打包 Windows 便携版（免安装 exe）：

```bash
npm run dist
```

输出：`release/moyu-novel-reader-0.6.0-portable.exe`（便携单文件，双击运行）

调试时可先运行解压版：`release/win-unpacked/moyu-novel-reader.exe`

若 Windows 提示「已阻止」，请右键 exe → **属性** → 勾选 **解除锁定**，或在 SmartScreen 中选择「仍要运行」。

## 主要功能

- 多格式导入：txt / md / html / rtf / fb2 / epub / docx / doc
- **章节文件缓存**：导入时按章拆分，章内翻页更快（v0.6.0）
- 窗口随意拖拽、缩放；文字随窗口实时重排，不截断半行
- 透明摸鱼模式：窗口与文字可半透明，透视桌面；自适应文字对比度
- 主窗口专注阅读；设置 / 书架 / 导航 / 摸鱼计算器为独立子窗口
- 章节自动识别、书签（Ctrl+B）、阅读进度记忆
- 翻页可保留上一页末尾 n 行；滚轮 / 方向键 / 自定义键翻页
- 摸鱼计算器：可见时长、阅读字数（实时）、薪资换算、历史记录
- 系统托盘；全局快捷键隐藏/显示（可录制）
- 内置说明书（设置面板 →「说明书」）

## 默认快捷键

| 操作 | 按键 |
|------|------|
| 下一页 | 滚轮下 / → / ↓ / 空格 / J（可改） |
| 上一页 | 滚轮上 / ← / ↑ / K（可改） |
| 隐藏/显示 | Ctrl+`（全局，可录制） |
| 打开设置 | 右键阅读区 / Ctrl+, / 顶栏 ⚙ |
| 添加书签 | Ctrl+B |
| 拖动窗口（阅读区） | 按住 Alt + 左键拖动 |
| 拖动窗口（顶栏） | 顶部左侧拖动手柄 |

## 目录结构

```
electron/           主进程（窗口、IPC、文件读取、章节缓存、托盘、Windows DWM）
src/                Vue 3 前端（阅读器、分页、设置、子窗口）
scripts/            测试素材生成 + 阶段验证脚本
release/            便携包输出（npm run dist，不提交 git）
```

## 开发与测试

```bash
npm run test          # 93 项自动化测试
npm run build         # 前端构建
npm run dist          # 测试 + 构建 + 便携 exe
```

详细开发流程见 `开发流程.txt`。

## 为什么不用 Tauri？

Tauri 需在 Windows 上编译 Rust（依赖 Visual Studio Build Tools）。Electron 使用预编译二进制，只需 Node.js 即可开发打包。