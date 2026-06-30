const path = require("path");
const { BrowserWindow } = require("electron");

/** @type {Record<string, BrowserWindow | null>} */
const childWindows = {
  settings: null,
  shelf: null,
  navigator: null,
  moyu: null,
};

const CHILD_CONFIG = {
  settings: {
    title: "摸鱼阅读器 - 设置",
    width: 540,
    height: 680,
    minWidth: 400,
    minHeight: 480,
    hash: "settings",
    boundsKey: "settingsWindowBounds",
  },
  shelf: {
    title: "摸鱼阅读器 - 书架",
    width: 420,
    height: 520,
    minWidth: 320,
    minHeight: 360,
    hash: "shelf",
    boundsKey: "shelfWindowBounds",
  },
  navigator: {
    title: "摸鱼阅读器 - 章节与书签",
    width: 400,
    height: 560,
    minWidth: 320,
    minHeight: 400,
    hash: "navigator",
    boundsKey: "navigatorWindowBounds",
  },
  moyu: {
    title: "摸鱼阅读器 - 摸鱼计算器",
    width: 420,
    height: 640,
    minWidth: 320,
    minHeight: 480,
    hash: "moyu",
    boundsKey: "moyuWindowBounds",
  },
};

/**
 * @param {import("electron-store")} store
 * @param {string} boundsKey
 * @param {{ width: number, height: number }} fallback
 */
function restoreChildBounds(store, boundsKey, fallback) {
  const bounds = store.get(boundsKey);
  if (bounds && typeof bounds === "object") {
    return bounds;
  }
  return {
    width: fallback.width,
    height: fallback.height,
  };
}

/**
 * @param {keyof typeof CHILD_CONFIG} type
 * @param {import("electron").BrowserWindow | null} mainWindow
 * @param {import("electron-store")} store
 * @param {string | undefined} devUrl
 */
function openChildWindow(type, mainWindow, store, devUrl) {
  const config = CHILD_CONFIG[type];
  const existing = childWindows[type];

  if (existing && !existing.isDestroyed()) {
    existing.show();
    existing.focus();
    return existing;
  }

  const savedBounds = restoreChildBounds(store, config.boundsKey, config);

  const win = new BrowserWindow({
    width: savedBounds.width ?? config.width,
    height: savedBounds.height ?? config.height,
    x: savedBounds.x,
    y: savedBounds.y,
    minWidth: config.minWidth,
    minHeight: config.minHeight,
    show: false,
    frame: true,
    autoHideMenuBar: true,
    title: config.title,
    parent: mainWindow ?? undefined,
    modal: false,
    backgroundColor: "#fafafa",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      partition: `persist:child-${type}`,
    },
  });

  win.on("close", () => {
    if (!win.isDestroyed()) {
      store.set(config.boundsKey, win.getBounds());
    }
    childWindows[type] = null;
  });

  if (devUrl) {
    win.loadURL(`${devUrl}#${config.hash}`);
  } else {
    win.loadFile(path.join(__dirname, "../dist/index.html"), {
      hash: config.hash,
    });
  }

  win.once("ready-to-show", () => {
    win.show();
    win.focus();
  });

  childWindows[type] = win;
  return win;
}

/**
 * @param {import("electron").WebContents} sender
 */
function broadcastAppStateUpdated(sender) {
  for (const win of BrowserWindow.getAllWindows()) {
    if (win.isDestroyed()) continue;
    if (win.webContents === sender) continue;
    win.webContents.send("app-state-updated");
  }
}

module.exports = {
  openChildWindow,
  broadcastAppStateUpdated,
  closeChildWindow: (type) => {
    const win = childWindows[type];
    if (win && !win.isDestroyed()) {
      win.close();
    }
  },
};