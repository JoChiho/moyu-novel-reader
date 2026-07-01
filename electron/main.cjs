const {
  app,
  BrowserWindow,
  desktopCapturer,
  dialog,
  globalShortcut,
  ipcMain,
  Menu,
  nativeImage,
  powerMonitor,
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
  setFrameRestoreSuspended,
} = require("./winFrameless.cjs");
const { createMoyuTimer } = require("./moyuTimer.cjs");
const {
  appendSession,
  calcWeekMonthTotals,
  calcWeekMonthCharTotals,
} = require("./moyuHistory.cjs");
const { createLuminanceSampler } = require("./luminanceSampler.cjs");
const {
  writeBookCache,
  readSliceAtGlobalOffset,
  deleteBookCache,
  loadManifest,
} = require("./bookCache.cjs");

const store = new Store({ name: "moyu-reader-state" });
const STORE_KEY = "appState";

let mainWindow = null;
/** @type {ReturnType<typeof createMoyuTimer> | null} */
let moyuTimer = null;
/** @type {ReturnType<typeof createLuminanceSampler> | null} */
let luminanceSampler = null;
let tray = null;
let toggleShortcutElectron = "Control+`";
/** @type {import("electron").Rectangle | null} */
let suspendedDragBounds = null;

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

function getMoyuTotalMs() {
  const state = store.get(STORE_KEY) ?? {};
  return state.moyuStats?.totalVisibleMs ?? 0;
}

function setMoyuTotalMs(ms) {
  store.set(
    `${STORE_KEY}.moyuStats.totalVisibleMs`,
    Math.max(0, Math.round(Number(ms) || 0)),
  );
}

function getMoyuTotalCharsRead() {
  const state = store.get(STORE_KEY) ?? {};
  return state.moyuStats?.totalCharsRead ?? 0;
}

function setMoyuTotalCharsRead(chars) {
  store.set(
    `${STORE_KEY}.moyuStats.totalCharsRead`,
    Math.max(0, Math.round(Number(chars) || 0)),
  );
}

function getMoyuSessions() {
  const sessions = store.get(`${STORE_KEY}.moyuStats.sessions`);
  return Array.isArray(sessions) ? sessions : [];
}

function appendMoyuSession(session) {
  const next = appendSession(getMoyuSessions(), {
    id: crypto.randomUUID(),
    startedAt: session.startedAt,
    endedAt: session.endedAt,
    durationMs: session.durationMs,
    charsRead: session.charsRead ?? 0,
  });
  store.set(`${STORE_KEY}.moyuStats.sessions`, next);
}

function clearMoyuSessions() {
  store.set(`${STORE_KEY}.moyuStats.sessions`, []);
}

function getMoyuTrackingEnabled() {
  return store.get(`${STORE_KEY}.moyuStats.trackingEnabled`) !== false;
}

function setMoyuTrackingEnabled(enabled) {
  store.set(`${STORE_KEY}.moyuStats.trackingEnabled`, !!enabled);
}

function buildMoyuStatsPayload(timerSnap) {
  const now = Date.now();
  const sessions = getMoyuSessions();
  const sessionStartAt = moyuTimer?.getSessionStartAt?.() ?? null;
  const periodTotals = calcWeekMonthTotals(
    sessions,
    now,
    sessionStartAt,
    timerSnap.currentSessionMs,
  );
  const charTotals = calcWeekMonthCharTotals(
    sessions,
    now,
    sessionStartAt,
    timerSnap.currentSessionCharsRead ?? 0,
  );

  return {
    ...timerSnap,
    ...periodTotals,
    ...charTotals,
    sessions: sessions.slice(0, 50),
    trackingEnabled: getMoyuTrackingEnabled(),
  };
}

function broadcastMoyuStatsTick(snapshot) {
  const payload = buildMoyuStatsPayload(snapshot);
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) {
      win.webContents.send("moyu-stats-tick", payload);
    }
  }
}

async function fetchReaderCharOffset() {
  if (!mainWindow || mainWindow.isDestroyed()) return null;
  try {
    const value = await mainWindow.webContents.executeJavaScript(
      "typeof window.__moyuGetReaderCharOffset==='function'?window.__moyuGetReaderCharOffset():null",
      true,
    );
    if (value == null || !Number.isFinite(Number(value))) return null;
    return Math.max(0, Math.round(Number(value)));
  } catch {
    return null;
  }
}

function initMoyuTimer(win) {
  setMoyuTrackingEnabled(true);
  moyuTimer = createMoyuTimer({
    getTotalMs: getMoyuTotalMs,
    setTotalMs: setMoyuTotalMs,
    getTotalCharsRead: getMoyuTotalCharsRead,
    setTotalCharsRead: setMoyuTotalCharsRead,
    fetchSessionCharOffset: fetchReaderCharOffset,
    getWindow: () => mainWindow,
    onTick: broadcastMoyuStatsTick,
    onSessionEnd: appendMoyuSession,
    getTrackingEnabled: getMoyuTrackingEnabled,
    setTrackingEnabled: setMoyuTrackingEnabled,
  });
  moyuTimer.attachWindow(win);
  moyuTimer.setTrackingEnabled(true);
}

/** Height of the top chrome row (must match CSS .reader-chrome). */
const READER_CHROME_HEIGHT_PX = 40;

/**
 * Frameless windows with -webkit-app-region: drag swallow wheel in the renderer.
 * Forward wheel from the OS input path instead.
 * @param {import("electron").BrowserWindow} win
 */
function installMainWindowWheelForward(win) {
  if (!win || win.isDestroyed()) return;

  win.webContents.on("before-input-event", (_event, input) => {
    if (win.isDestroyed() || !win.isVisible()) return;
    if (input.type !== "mouseWheel") return;

    const y = Number(input.y ?? 0);
    if (y < READER_CHROME_HEIGHT_PX) return;

    let deltaY = Number(input.deltaY ?? 0);
    if (!deltaY) {
      const wheelDeltaY = Number(input.wheelDeltaY ?? 0);
      if (wheelDeltaY) deltaY = -wheelDeltaY;
    }
    if (!deltaY) return;

    win.webContents.send("main-window-wheel", { deltaY });
  });
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

  installMainWindowWheelForward(mainWindow);
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

  initMoyuTimer(mainWindow);
  initLuminanceSampler(mainWindow);
}

function getReaderSettings() {
  return store.get(STORE_KEY)?.settings ?? {};
}

function broadcastDesktopLuminance(payload) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("desktop-luminance-updated", payload);
  }
}

function initLuminanceSampler(win) {
  luminanceSampler = createLuminanceSampler({
    desktopCapturer,
    screen,
    getWindow: () => mainWindow,
    getSettings: getReaderSettings,
    onUpdate: broadcastDesktopLuminance,
    readerChromeHeight: READER_CHROME_HEIGHT_PX,
  });
  luminanceSampler.attachWindow(win);
  luminanceSampler.refreshFromSettings();
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
    const bookId = crypto.randomUUID();
    const { chapterEntries } = await writeBookCache(bookId, content, {
      sourcePath: filePath,
      encoding,
      collapseBlankLines,
    });
    const slice = await readSliceAtGlobalOffset(bookId, 0);

    return {
      ok: true,
      book: {
        id: bookId,
        title,
        filePath,
        addedAt: Date.now(),
        charOffset: 0,
        totalChars: content.length,
        bookmarks: [],
        chapters: chapterEntries,
        chapterCacheVersion: 1,
      },
      slice,
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
  luminanceSampler?.runSample();
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
  ipcMain.handle("save-app-state", (event, incoming) => {
    try {
      const current = store.get(STORE_KEY) ?? {};
      const next = JSON.parse(JSON.stringify(incoming));
      next.settings = {
        ...(current.settings ?? {}),
        ...(incoming.settings ?? {}),
      };
      next.moyuStats = {
        ...(incoming.moyuStats ?? {}),
        ...(current.moyuStats ?? {}),
      };
      store.set(STORE_KEY, next);
      luminanceSampler?.refreshFromSettings();
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

  ipcMain.handle("open-moyu-window", () => {
    openChildWindow("moyu", mainWindow, store, getDevUrl());
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

  ipcMain.handle(
    "read-book-slice",
    async (_e, bookId, filePath, globalOffset, encoding, collapseBlankLines) => {
      try {
        const safeId = String(bookId || "");
        const safeOffset = Math.max(0, Math.round(Number(globalOffset) || 0));
        const enc = encoding ?? "auto";
        const collapse = collapseBlankLines !== false;

        const manifest = await loadManifest(safeId);
        if (
          manifest &&
          (manifest.collapseBlankLines !== collapse || manifest.encoding !== enc)
        ) {
          await deleteBookCache(safeId);
        }

        let slice = await readSliceAtGlobalOffset(safeId, safeOffset);
        if (!slice) {
          const content = await readBookFile(filePath, enc, collapse);
          const { chapterEntries } = await writeBookCache(safeId, content, {
            sourcePath: filePath,
            encoding: enc,
            collapseBlankLines: collapse,
          });
          slice = await readSliceAtGlobalOffset(safeId, safeOffset);
          if (slice) {
            slice.chapters = chapterEntries;
          }
        }

        if (!slice) {
          return { ok: false, error: "无法读取章节缓存" };
        }

        return { ok: true, slice };
      } catch (err) {
        return {
          ok: false,
          error: err instanceof Error ? err.message : "读取章节失败",
        };
      }
    },
  );

  ipcMain.handle("delete-book-cache", async (_e, bookId) => {
    try {
      await deleteBookCache(String(bookId || ""));
      return { ok: true };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : "删除缓存失败",
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

  ipcMain.handle("move-main-window", (_e, dx, dy) => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    const bounds = mainWindow.getBounds();
    mainWindow.setBounds({
      x: bounds.x + Math.round(Number(dx) || 0),
      y: bounds.y + Math.round(Number(dy) || 0),
      width: bounds.width,
      height: bounds.height,
    });
  });

  ipcMain.handle("get-moyu-stats", () => {
    const totalChars = getMoyuTotalCharsRead();
    const timerSnap = moyuTimer?.snapshot() ?? {
      totalVisibleMs: getMoyuTotalMs(),
      currentSessionMs: 0,
      combinedVisibleMs: getMoyuTotalMs(),
      totalCharsRead: totalChars,
      currentSessionCharsRead: 0,
      combinedCharsRead: totalChars,
      isRunning: false,
    };
    return buildMoyuStatsPayload(timerSnap);
  });

  ipcMain.handle("reset-moyu-stats", (event) => {
    moyuTimer?.resetStats();
    clearMoyuSessions();
    broadcastAppStateUpdated(event.sender);
    return { ok: true };
  });

  ipcMain.handle("set-moyu-tracking", (_e, enabled) => {
    moyuTimer?.setTrackingEnabled(!!enabled);
    return { ok: true };
  });

  powerMonitor.on("suspend", () => {
    moyuTimer?.onPowerSuspend();
  });

  powerMonitor.on("resume", () => {
    moyuTimer?.onPowerResume();
  });

  ipcMain.handle("set-frame-restore-suspended", (_e, value) => {
    if (!mainWindow || mainWindow.isDestroyed()) return;

    if (value) {
      suspendedDragBounds = mainWindow.getBounds();
      setFrameRestoreSuspended(true);
      return;
    }

    setFrameRestoreSuspended(false);
    if (suspendedDragBounds) {
      const current = mainWindow.getBounds();
      if (
        current.width !== suspendedDragBounds.width ||
        current.height !== suspendedDragBounds.height
      ) {
        mainWindow.setBounds({
          x: current.x,
          y: current.y,
          width: suspendedDragBounds.width,
          height: suspendedDragBounds.height,
        });
      }
      suspendedDragBounds = null;
    }
  });
});

app.on("will-quit", () => {
  moyuTimer?.flush();
  moyuTimer?.stopTick();
  globalShortcut.unregisterAll();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});