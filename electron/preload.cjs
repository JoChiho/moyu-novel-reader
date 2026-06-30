const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("moyu", {
  loadAppState: () => ipcRenderer.invoke("load-app-state"),
  saveAppState: (state) => ipcRenderer.invoke("save-app-state", state),
  pickAndReadTxt: () => ipcRenderer.invoke("pick-and-read-txt"),
  readTextFile: (filePath) => ipcRenderer.invoke("read-text-file", filePath),
  setAlwaysOnTop: (value) => ipcRenderer.invoke("set-always-on-top", value),
  toggleVisibility: () => ipcRenderer.invoke("toggle-visibility"),
  bindToggleShortcut: (shortcut) =>
    ipcRenderer.invoke("bind-toggle-shortcut", shortcut),
  setTransparent: (enabled) => ipcRenderer.invoke("set-transparent", enabled),
});