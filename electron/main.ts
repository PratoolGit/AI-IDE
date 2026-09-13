import { app, BrowserWindow, ipcMain, dialog, shell } from "electron";
import * as path from "path";
import { registerFsHandlers } from "./ipc/fs";
import { registerTerminalHandlers } from "./ipc/terminal";
import { registerKeyHandlers } from "./ipc/keys";

const isDev = !app.isPackaged;

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 640,
    backgroundColor: "#0a0b0d",
    autoHideMenuBar: true,
    webPreferences: {
      // Security requirements (see spec section 31):
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  if (isDev) {
    mainWindow.loadURL("http://localhost:5173");
    mainWindow.webContents.openDevTools({ mode: "detach" });
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// Prevent the renderer from navigating anywhere or opening arbitrary windows
// (part of the IPC/security hardening requirement).
app.on("web-contents-created", (_event, contents) => {
  contents.on("will-navigate", (e, url) => {
    if (!url.startsWith("http://localhost:5173") && !url.startsWith("file://")) {
      e.preventDefault();
    }
  });
  contents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });
});

app.whenReady().then(() => {
  registerFsHandlers(ipcMain, () => mainWindow, dialog);
  registerTerminalHandlers(ipcMain, () => mainWindow);
  registerKeyHandlers(ipcMain);
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
