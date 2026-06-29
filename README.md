# moyu-novel-reader

摸鱼小说阅读器 — 浮动窗口、置顶、快捷隐藏的 TXT 小说阅读器，支持动态分页、字体背景调节、阅读位置记忆。

## 技术栈

- **Tauri v2** + **Vue 3** + **TypeScript**
- 分页：`canvas.measureText` + `ResizeObserver`
- 持久化：`@tauri-apps/plugin-store`
- 窗口状态：`tauri-plugin-window-state`
- 全局快捷键：`tauri-plugin-global-shortcut`
- 文件导入：`tauri-plugin-dialog` + `tauri-plugin-fs`

## 目录结构

```
src/
├── types/index.ts          # Book / ReaderSettings / AppState 数据模型
├── services/
│   ├── storage.ts          # Tauri Store 读写（书籍 + 设置 + 进度）
│   ├── pagination.ts       # 动态分页引擎（不截断字符）
│   └── bookImport.ts       # TXT 选择与读取
├── composables/
│   ├── useWindowVisibility.ts   # 窗口隐藏/显示、置顶
│   └── useGlobalShortcut.ts     # 全局快捷键绑定
├── components/
│   ├── TitleBar.vue        # 拖拽标题栏 + 快捷操作
│   ├── ReaderView.vue      # 阅读区 + 翻页 + ResizeObserver
│   ├── SettingsPanel.vue   # 字体/颜色/书架/快捷键设置
│   └── EmptyState.vue      # 无书籍时的引导页
└── App.vue                 # 应用入口与状态编排

src-tauri/
├── tauri.conf.json         # 无边框、置顶、初始隐藏（由 window-state 恢复）
├── capabilities/default.json
└── src/lib.rs              # 插件初始化
```

## 数据模型

```ts
interface Book {
  id: string;
  title: string;
  filePath: string;
  charOffset: number;   // 阅读位置（字符偏移）
  totalChars: number;
}

interface ReaderSettings {
  fontSize: number;
  textColor: string;
  backgroundColor: string;
  alwaysOnTop: boolean;
  toggleVisibilityShortcut: string;  // 默认 Ctrl+`
}
```

## MVP 功能

- [x] 无边框可拖拽窗口，始终置顶
- [x] 标题栏按钮 / 全局快捷键隐藏显示
- [x] 导入 TXT，多书籍管理
- [x] 动态分页（窗口缩放实时重排，不截断半行）
- [x] 滚轮 + 方向键 + J/K + 空格翻页
- [x] 字体/颜色/护眼背景设置
- [x] 关闭后恢复：阅读位置、窗口大小位置、样式设置

## 开发

### 前置依赖

- Node.js 18+
- Rust 1.77+
- **Windows：Visual Studio Build Tools（含 C++ 桌面开发）**，提供 `link.exe`

### 启动

```bash
npm install
npm run tauri dev
```

### 构建

```bash
npm run tauri build
```

## 快捷键（默认）

| 操作 | 按键 |
|------|------|
| 下一页 | 滚轮下 / → / ↓ / J / 空格 |
| 上一页 | 滚轮上 / ← / ↑ / K |
| 隐藏/显示 | `Ctrl+``（可在设置中修改） |