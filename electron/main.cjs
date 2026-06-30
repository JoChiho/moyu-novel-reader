const {
  app,
  BrowserWindow,
  dialog,
  globalShortcut,
  ipcMain,
  Menu,
  nativeImage,
  screen,
  Tray,
} = require("electron");
const path = require("path");
const crypto = require("crypto");
const Store = require("electron-store");
const { registerGlobalShortcut, probeGlobalShortcut } = require("./shortcut.cjs");
const {
  readBookFile,
  stripBookExtension,
  BOOK_FILE_EXTENSIONS,
} = require("./fileReader.cjs");
const {
  openChildWindow,
  broadcastAppStateUpdated,
  closeChildWindow,
} = require("./childWindows.cjs");
const {
  buildWindowsMainWindowOptions,
  clearWindowTitle,
  preventNativeTitleBar,
  installWindowsTitleBarGuard,
  applyWindowsTransparencyPolicy,
  restoreWindowsFrameOnFocus,
} = require("./winFrameless.cjs");

const store = new Store({ name: "moyu-reader-state" });
const STORE_KEY = "appState";

let mainWindow = null;
let tray = null;
let toggleShortcutElectron = "Control+`";

function toggleWindowVisibility() {
  if (!mainWindow) return;
  if (mainWindow.isVisible()) {
    mainWindow.hide();
  } else {
    mainWindow.show();
    mainWindow.focus();
  }
}

function bindToggleShortcut(displayShortcut) {
  const result = registerGlobalShortcut(
    globalShortcut,
    toggleShortcutElectron,
    displayShortcut,
    toggleWindowVisibility,
  );
  if (result.success) {
    toggleShortcutElectron = result.electronShortcut ?? "";
  }
  return result;
}

function saveWindowBounds() {
  if (!mainWindow) return;
  store.set("windowBounds", mainWindow.getBounds());
}

function restoreWindowBounds(win) {
  const bounds = store.get("windowBounds");
  if (bounds && typeof bounds === "object") {
    win.setBounds(bounds);
  }
}

function createTray() {
  const iconPath = path.join(__dirname, "tray-icon.png");
  const icon = nativeImage.createFromPath(iconPath);
  if (icon.isEmpty()) return;

  tray = new Tray(icon.resize({ width: 16, height: 16 }));
  tray.setToolTip("摸鱼小说阅读器");

  const contextMenu = Menu.buildFromTemplate([
    {
      label: "显示窗口",
      click: () => {
        mainWindow?.show();
        mainWindow?.focus();
      },
    },
    {
      label: "隐藏窗口",
      click: () => mainWindow?.hide(),
    },
    { type: "separator" },
    {
      label: "退出",
      click: () => app.quit(),
    },
  ]);

  tray.setContextMenu(contextMenu);
  tray.on("click", () => toggleWindowVisibility());
}

function createWindow() {
  const saved = store.get(STORE_KEY);
  const readerSettings = saved?.settings ?? {};

  /** @type {import("electron").BrowserWindowConstructorOptions} */
  const windowOptions = buildWindowsMainWindowOptions({
    width: 420,
    height: 560,
    minWidth: 0,
    minHeight: 0,
    show: false,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: true,
    backgroundColor: "#00000000",
    hasShadow: false,
    roundedCorners: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow = new BrowserWindow(windowOptions);

  preventNativeTitleBar(mainWindow);
  installWindowsTitleBarGuard(
    mainWindow,
    () => store.get(STORE_KEY)?.settings ?? {},
  );
  applyWindowsTransparencyPolicy(mainWindow, readerSettings);

  restoreWindowBounds(mainWindow);

  const alwaysOnTop = readerSettings.alwaysOnTop ?? true;
  mainWindow.setAlwaysOnTop(alwaysOnTop);

  const shortcut = saved?.settings?.toggleVisibilityShortcut ?? "Ctrl+`";
  bindToggleShortcut(shortcut);

  const devUrl = getDevUrl();
  if (devUrl) {
    mainWindow.loadURL(`${devUrl}#reader`);
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"), {
      hash: "reader",
    });
  }

  mainWindow.once("ready-to-show", () => {
    applyWindowsTransparencyPolicy(mainWindow, readerSettings);
    mainWindow.show();
    mainWindow.focus();
  });

  mainWindow.on("blur", () => {
    if (!mainWindow?.isDestroyed()) {
      mainWindow.webContents.send("main-window-blur");
    }
  });

  mainWindow.on("close", () => saveWindowBounds());
}

async function pickAndReadBook(encoding = "auto", collapseBlankLines = true) {
  const parent =
    BrowserWindow.getFocusedWindow() ?? mainWindow ?? undefined;
  if (!parent) {
    return { ok: false, error: "窗口未就绪" };
  }

  const wasOnTop = mainWindow?.isAlwaysOnTop() ?? false;
  mainWindow?.setAlwaysOnTop(false);

  try {
    const result = await dialog.showOpenDialog(parent, {
      title: "选择小说文件",
      properties: ["openFile"],
      filters: [
        {
          name: "小说文件",
          extensions: [...BOOK_FILE_EXTENSIONS],
        },
        {
          name: "纯文本 / Markdown",
          extensions: ["txt", "text", "md", "markdown"],
        },
        {
          name: "网页 / 电子书",
          extensions: ["html", "htm", "fb2", "epub"],
        },
        { name: "RTF", extensions: ["rtf"] },
        { name: "Word", extensions: ["docx", "doc"] },
        { name: "All Files", extensions: ["*"] },
      ],
    });

    if (result.canceled || !result.filePaths[0]) {
      return { ok: false, canceled: true };
    }

    const filePath = result.filePaths[0];
    const content = await readBookFile(filePath, encoding, collapseBlankLines);
    const title = stripBookExtension(filePath);

    return {
      ok: true,
      book: {
        id: crypto.randomUUID(),
        title,
        filePath,
        addedAt: Date.now(),
        charOffset: 0,
        totalChars: content.length,
          bookmarks: [],
          chapters: [],
        },
        content,
      };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "读取文件失败",
    };
  } finally {
    mainWindow?.setAlwaysOnTop(wasOnTop);
    mainWindow?.focus();
  }
}

function getDevUrl() {
  return process.env.VITE_DEV_SERVER_URL;
}

function broadcastDisplayMetricsChanged() {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) {
      win.webContents.send("display-metrics-changed");
    }
  }
}

app.whenReady().then(() => {
  createWindow();
  createTray();

  screen.on("display-metrics-changed", broadcastDisplayMetricsChanged);

  ipcMain.handle("load-app-state", () => store.get(STORE_KEY) ?? null);
  ipcMain.handle("save-app-state", (event, state) => {
    try {
      store.set(STORE_KEY, JSON.parse(JSON.stringify(state)));
      broadcastAppStateUpdated(event.sender);
      return { ok: true };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : "保存失败",
      };
    }
  });

  ipcMain.handle("open-settings-window", () => {
    openChildWindow("settings", mainWindow, store, getDevUrl());
    return { ok: true };
  });

  ipcMain.handle("open-shelf-window", () => {
    openChildWindow("shelf", mainWindow, store, getDevUrl());
    return { ok: true };
  });

  ipcMain.handle("open-navigator-window", () => {
    openChildWindow("navigator", mainWindow, store, getDevUrl());
    return { ok: true };
  });

  ipcMain.handle("probe-global-shortcut", (_e, shortcut) => {
    return probeGlobalShortcut(globalShortcut, shortcut);
  });

  ipcMain.handle("navigator-jump-offset", (event, offset) => {
    const state = store.get(STORE_KEY);
    if (!state?.lastBookId) return { ok: false };

    const clamped = Math.max(0, Math.round(offset));
    store.set(STORE_KEY, {
      ...state,
      books: state.books.map((b) =>
        b.id === state.lastBookId ? { ...b, charOffset: clamped } : b,
      ),
    });
    broadcastAppStateUpdated(event.sender);
    mainWindow?.show();
    mainWindow?.focus();
    closeChildWindow("navigator");
    return { ok: true };
  });

  ipcMain.handle("shelf-open-book", (event, bookId) => {
    const state = store.get(STORE_KEY);
    if (state && bookId) {
      store.set(STORE_KEY, {
        ...state,
        lastBookId: bookId,
      });
      broadcastAppStateUpdated(event.sender);
    }
    mainWindow?.show();
    mainWindow?.focus();
    closeChildWindow("shelf");
    return { ok: true };
  });

  ipcMain.handle("pick-and-read-book", (_e, encoding, collapseBlankLines) =>
    pickAndReadBook(encoding ?? "auto", collapseBlankLines !== false),
  );

  // Backward compatibility
  ipcMain.handle("pick-and-read-txt", () => pickAndReadBook("auto", true));

  ipcMain.handle("read-book-file", async (_e, filePath, encoding, collapseBlankLines) => {
    try {
      return {
        ok: true,
        content: await readBookFile(
          filePath,
          encoding ?? "auto",
          collapseBlankLines !== false,
        ),
      };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : "读取文件失败",
      };
    }
  });

  // Backward compatibility
  ipcMain.handle("read-text-file", async (_e, filePath) => {
    try {
      return {
        ok: true,
        content: await readBookFile(filePath, "auto"),
      };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : "读取文件失败",
      };
    }
  });

  ipcMain.handle("set-always-on-top", (_e, value) => {
    mainWindow?.setAlwaysOnTop(!!value);
  });

  ipcMain.handle("toggle-visibility", () => {
    toggleWindowVisibility();
  });

  ipcMain.handle("bind-toggle-shortcut", (_e, shortcut) => {
    return bindToggleShortcut(shortcut);
  });

  ipcMain.handle("set-transparent", () => {
    if (!mainWindow) return;
    const state = store.get(STORE_KEY);
    const settings = state?.settings ?? {};
    applyWindowsTransparencyPolicy(mainWindow, settings);
  });

  ipcMain.handle("focus-main-window", () => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    if (!mainWindow.isVisible()) {
      mainWindow.show();
    }
    mainWindow.focus();
    mainWindow.webContents.focus();
    const settings = store.get(STORE_KEY)?.settings ?? {};
    restoreWindowsFrameOnFocus(mainWindow, settings);
  });
});

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});