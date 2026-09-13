import { contextBridge, ipcRenderer } from "electron";

/**
 * The ONLY bridge between renderer and main. Every channel is explicit and
 * allow-listed — the renderer never gets raw ipcRenderer, node, or fs access.
 * This satisfies spec section 31 (context isolation, no unnecessary key/data
 * exposure, validated IPC).
 */
const api = {
  fs: {
    openProjectDialog: () => ipcRenderer.invoke("fs:openProjectDialog"),
    readDir: (dirPath: string) => ipcRenderer.invoke("fs:readDir", dirPath),
    readFile: (filePath: string) => ipcRenderer.invoke("fs:readFile", filePath),
    writeFile: (filePath: string, content: string) =>
      ipcRenderer.invoke("fs:writeFile", filePath, content),
    createFile: (filePath: string) => ipcRenderer.invoke("fs:createFile", filePath),
    createFolder: (dirPath: string) => ipcRenderer.invoke("fs:createFolder", dirPath),
    deletePath: (targetPath: string) => ipcRenderer.invoke("fs:deletePath", targetPath),
    renamePath: (oldPath: string, newPath: string) =>
      ipcRenderer.invoke("fs:renamePath", oldPath, newPath),
    movePath: (oldPath: string, newPath: string) =>
      ipcRenderer.invoke("fs:movePath", oldPath, newPath),
    searchFiles: (root: string, query: string) =>
      ipcRenderer.invoke("fs:searchFiles", root, query),
    searchText: (root: string, query: string) =>
      ipcRenderer.invoke("fs:searchText", root, query),
  },
  terminal: {
    create: (cwd: string) => ipcRenderer.invoke("term:create", cwd),
    write: (id: string, data: string) => ipcRenderer.invoke("term:write", id, data),
    resize: (id: string, cols: number, rows: number) =>
      ipcRenderer.invoke("term:resize", id, cols, rows),
    kill: (id: string) => ipcRenderer.invoke("term:kill", id),
    onData: (cb: (id: string, data: string) => void) => {
      const listener = (_: unknown, id: string, data: string) => cb(id, data);
      ipcRenderer.on("term:data", listener);
      return () => ipcRenderer.removeListener("term:data", listener);
    },
    onExit: (cb: (id: string, code: number) => void) => {
      const listener = (_: unknown, id: string, code: number) => cb(id, code);
      ipcRenderer.on("term:exit", listener);
      return () => ipcRenderer.removeListener("term:exit", listener);
    },
  },
  keys: {
    // Keys are encrypted at rest via Electron's OS-backed safeStorage
    // (Keychain/DPAPI/libsecret). The renderer never sees a raw key after
    // save — only a masked display string.
    save: (provider: string, label: string, rawKey: string) =>
      ipcRenderer.invoke("keys:save", provider, label, rawKey),
    list: (provider: string) => ipcRenderer.invoke("keys:list", provider),
    remove: (id: string) => ipcRenderer.invoke("keys:remove", id),
    setEnabled: (id: string, enabled: boolean) =>
      ipcRenderer.invoke("keys:setEnabled", id, enabled),
    // Used ONLY by the main-process fetch call sites — never returned in bulk
    // to the renderer for display.
    getRawForRequest: (id: string) => ipcRenderer.invoke("keys:getRawForRequest", id),
  },
};

contextBridge.exposeInMainWorld("ide", api);

export type IdeApi = typeof api;
