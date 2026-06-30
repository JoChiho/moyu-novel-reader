# moyu-novel-reader

摸鱼小说阅读器 — 浮动窗口、置顶、快捷隐藏的 TXT 小说阅读器。

**技术栈：Electron + Vue 3 + TypeScript**（无需 Visual Studio / MSVC，适合公司电脑）

## 快速开始

```bash
npm install
npm run electron:dev
```

打包便携版 exe（免安装）：

```bash
npm run dist
```

输出在 `release/` 目录，例如：

```
release/摸鱼小说阅读器 0.1.0.exe
```

双击即可运行，无需安装。

## 为什么不用 Tauri？

Tauri 需要在本地编译 Rust，Windows 上依赖 Visual Studio Build Tools（`link.exe`）。
公司电脑通常不允许安装这类大型环境。

Electron 使用预编译二进制，**只需 Node.js + npm install** 即可开发和运行。

## 目录结构

```
electron/           Electron 主进程（窗口、快捷键、文件、持久化）
src/                Vue 3 前端（阅读器 UI + 分页引擎）
scripts/            阶段 5 验证脚本 + 样例 TXT
src-tauri/          （已弃用，保留作参考，不参与构建）
```

## 默认快捷键

| 操作 | 按键 |
|------|------|
| 下一页 | 滚轮下 / → / J / 空格 |
| 上一页 | 滚轮上 / ← / K |
| 隐藏/显示 | `Ctrl+``（设置中可改） |