const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("moyu", {
  loadAppState: () => ipcRenderer.invoke("load-app-state"),
  saveAppState: (state) => ipcRenderer.invoke("save-app-state", state),
  pickAndReadBook: (encoding, collapseBlankLines) =>
    ipcRenderer.invoke("pick-and-read-book", encoding, collapseBlankLines),
  readBookFile: (filePath, encoding, collapseBlankLines) =>
    ipcRenderer.invoke("read-book-file", filePath, encoding, collapseBlankLines),
  readBookSlice: (bookId, filePath, globalOffset, encoding, collapseBlankLines) =>
    ipcRenderer.invoke(
      "read-book-slice",
      bookId,
      filePath,
      globalOffset,
      encoding,
      collapseBlankLines,
    ),
  deleteBookCache: (bookId) => ipcRenderer.invoke("delete-book-cache", bookId),
  setAlwaysOnTop: (value) => ipcRenderer.invoke("set-always-on-top", value),
  toggleVisibility: () => ipcRenderer.invoke("toggle-visibility"),
  bindToggleShortcut: (shortcut) =>
    ipcRenderer.invoke("bind-toggle-shortcut", shortcut),
  setTransparent: (enabled) => ipcRenderer.invoke("set-transparent", enabled),
  focusMainWindow: () => ipcRenderer.invoke("focus-main-window"),
  moveMainWindow: (dx, dy) => ipcRenderer.invoke("move-main-window", dx, dy),
  setFrameRestoreSuspended: (value) =>
    ipcRenderer.invoke("set-frame-restore-suspended", value),
  openSettingsWindow: () => ipcRenderer.invoke("open-settings-window"),
  openShelfWindow: () => ipcRenderer.invoke("open-shelf-window"),
  openNavigatorWindow: () => ipcRenderer.invoke("open-navigator-window"),
  openMoyuWindow: () => ipcRenderer.invoke("open-moyu-window"),
  shelfOpenBook: (bookId) => ipcRenderer.invoke("shelf-open-book", bookId),
  navigatorJump: (offset) => ipcRenderer.invoke("navigator-jump-offset", offset),
  probeGlobalShortcut: (shortcut) =>
    ipcRenderer.invoke("probe-global-shortcut", shortcut),
  onAppStateUpdated: (callback) => {
    const handler = () => callback();
    ipcRenderer.on("app-state-updated", handler);
    return () => ipcRenderer.removeListener("app-state-updated", handler);
  },
  onDisplayMetricsChanged: (callback) => {
    const handler = () => callback();
    ipcRenderer.on("display-metrics-changed", handler);
    return () => ipcRenderer.removeListener("display-metrics-changed", handler);
  },
  onMainWindowBlur: (callback) => {
    const handler = () => callback();
    ipcRenderer.on("main-window-blur", handler);
    return () => ipcRenderer.removeListener("main-window-blur", handler);
  },
  onMainWindowWheel: (callback) => {
    const handler = (_event, payload) => callback(payload);
    ipcRenderer.on("main-window-wheel", handler);
    return () => ipcRenderer.removeListener("main-window-wheel", handler);
  },
  getMoyuStats: () => ipcRenderer.invoke("get-moyu-stats"),
  resetMoyuStats: () => ipcRenderer.invoke("reset-moyu-stats"),
  setMoyuTracking: (enabled) => ipcRenderer.invoke("set-moyu-tracking", enabled),
  onMoyuStatsTick: (callback) => {
    const handler = (_event, payload) => callback(payload);
    ipcRenderer.on("moyu-stats-tick", handler);
    return () => ipcRenderer.removeListener("moyu-stats-tick", handler);
  },
  onDesktopLuminanceUpdated: (callback) => {
    const handler = (_event, payload) => callback(payload);
    ipcRenderer.on("desktop-luminance-updated", handler);
    return () =>
      ipcRenderer.removeListener("desktop-luminance-updated", handler);
  },
});