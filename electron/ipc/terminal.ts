import type { IpcMain, BrowserWindow } from "electron";

/**
 * Integrated terminal backed by node-pty. node-pty is a native module — it
 * must be rebuilt for Electron (`electron-rebuild`) after `npm install`.
 * This keeps terminal I/O entirely in main; the renderer only ever sees
 * serialized data over IPC (spec section 17 + 31).
 */
export function registerTerminalHandlers(ipcMain: IpcMain, getWindow: () => BrowserWindow | null) {
  // Lazy require so the app still boots (editor/chat/etc. all work) even in
  // environments where the native module hasn't been rebuilt yet.
  let pty: typeof import("node-pty") | null = null;
  try {
    pty = require("node-pty");
  } catch {
    console.warn(
      "[terminal] node-pty not available — run `npx electron-rebuild` after install. " +
        "Terminal panel will show a setup notice instead of a live shell."
    );
  }

  const sessions = new Map<string, import("node-pty").IPty>();
  const shell = process.platform === "win32" ? "powershell.exe" : process.env.SHELL || "bash";

  ipcMain.handle("term:create", (_e, cwd: string) => {
    if (!pty) return { ok: false, reason: "node-pty not installed/rebuilt" };
    const id = `term-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const proc = pty.spawn(shell, [], {
      name: "xterm-color",
      cols: 80,
      rows: 24,
      cwd: cwd || process.cwd(),
      env: process.env as Record<string, string>,
    });
    proc.onData((data) => {
      getWindow()?.webContents.send("term:data", id, data);
    });
    proc.onExit(({ exitCode }) => {
      getWindow()?.webContents.send("term:exit", id, exitCode);
      sessions.delete(id);
    });
    sessions.set(id, proc);
    return { ok: true, id };
  });

  ipcMain.handle("term:write", (_e, id: string, data: string) => {
    sessions.get(id)?.write(data);
    return true;
  });

  ipcMain.handle("term:resize", (_e, id: string, cols: number, rows: number) => {
    sessions.get(id)?.resize(cols, rows);
    return true;
  });

  ipcMain.handle("term:kill", (_e, id: string) => {
    sessions.get(id)?.kill();
    sessions.delete(id);
    return true;
  });
}
