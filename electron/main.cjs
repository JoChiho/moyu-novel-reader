const {
  app,
  BrowserWindow,
  dialog,
  globalShortcut,
  ipcMain,
} = require("electron");
const path = require("path");
const crypto = require("crypto");
const Store = require("electron-store");
const { registerGlobalShortcut } = require("./shortcut.cjs");
const { readTextFileSmart } = require("./fileReader.cjs");

const store = new Store({ name: "moyu-reader-state" });
const STORE_KEY = "appState";

let mainWindow = null;
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

function createWindow() {
  mainWindow = new BrowserWindow({
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
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  restoreWindowBounds(mainWindow);

  const saved = store.get(STORE_KEY);
  const alwaysOnTop = saved?.settings?.alwaysOnTop ?? true;
  mainWindow.setAlwaysOnTop(alwaysOnTop);

  const shortcut = saved?.settings?.toggleVisibilityShortcut ?? "Ctrl+`";
  bindToggleShortcut(shortcut);

  const devUrl = process.env.VITE_DEV_SERVER_URL;
  if (devUrl) {
    mainWindow.loadURL(devUrl);
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
    mainWindow.focus();
  });

  mainWindow.on("close", () => saveWindowBounds());
}

app.whenReady().then(() => {
  createWindow();

  ipcMain.handle("load-app-state", () => store.get(STORE_KEY) ?? null);
  ipcMain.handle("save-app-state", (_e, state) => {
    try {
      store.set(STORE_KEY, JSON.parse(JSON.stringify(state)));
      return { ok: true };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : "保存失败",
      };
    }
  });

  ipcMain.handle("pick-and-read-txt", async () => {
    if (!mainWindow) {
      return { ok: false, error: "窗口未就绪" };
    }

    const wasOnTop = mainWindow.isAlwaysOnTop();
    mainWindow.setAlwaysOnTop(false);

    try {
      const result = await dialog.showOpenDialog(mainWindow, {
        title: "选择 TXT 小说",
        properties: ["openFile"],
        filters: [
          { name: "Text", extensions: ["txt"] },
          { name: "All Files", extensions: ["*"] },
        ],
      });

      if (result.canceled || !result.filePaths[0]) {
        return { ok: false, canceled: true };
      }

      const filePath = result.filePaths[0];
      const content = readTextFileSmart(filePath);
      const base = path.basename(filePath);
      const title = base.replace(/\.txt$/i, "");

      return {
        ok: true,
        book: {
          id: crypto.randomUUID(),
          title,
          filePath,
          addedAt: Date.now(),
          charOffset: 0,
          totalChars: content.length,
        },
        content,
      };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : "读取文件失败",
      };
    } finally {
      mainWindow.setAlwaysOnTop(wasOnTop);
      mainWindow.focus();
    }
  });

  ipcMain.handle("read-text-file", (_e, filePath) => {
    try {
      return { ok: true, content: readTextFileSmart(filePath) };
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

  ipcMain.handle("set-transparent", (_e, enabled) => {
    if (!mainWindow) return;
    if (enabled) {
      mainWindow.setBackgroundColor("#00000000");
    } else {
      const saved = store.get(STORE_KEY);
      const bg = saved?.settings?.backgroundColor ?? "#c7edcc";
      mainWindow.setBackgroundColor(bg);
    }
  });
});

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});