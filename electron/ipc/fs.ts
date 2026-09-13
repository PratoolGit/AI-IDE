import type { IpcMain, BrowserWindow, Dialog } from "electron";
import * as fsp from "fs/promises";
import * as fs from "fs";
import * as path from "path";

const IGNORED_DIRS = new Set(["node_modules", ".git", "dist", "build", ".cache"]);

export interface FileNode {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: FileNode[];
}

async function listDir(dirPath: string): Promise<FileNode[]> {
  const entries = await fsp.readdir(dirPath, { withFileTypes: true });
  const nodes: FileNode[] = [];
  for (const entry of entries) {
    if (entry.name.startsWith(".env")) continue; // never surface secrets automatically
    if (entry.isDirectory() && IGNORED_DIRS.has(entry.name)) continue;
    nodes.push({
      name: entry.name,
      path: path.join(dirPath, entry.name),
      isDirectory: entry.isDirectory(),
    });
  }
  // directories first, then alphabetical
  return nodes.sort((a, b) =>
    a.isDirectory === b.isDirectory ? a.name.localeCompare(b.name) : a.isDirectory ? -1 : 1
  );
}

/** Guards against path traversal escaping the opened project root. */
function assertWithinRoot(root: string, target: string) {
  const resolvedRoot = path.resolve(root);
  const resolvedTarget = path.resolve(target);
  if (!resolvedTarget.startsWith(resolvedRoot)) {
    throw new Error("Path is outside the open project root.");
  }
}

export function registerFsHandlers(
  ipcMain: IpcMain,
  getWindow: () => BrowserWindow | null,
  dialog: Dialog
) {
  let projectRoot: string | null = null;

  ipcMain.handle("fs:openProjectDialog", async () => {
    const win = getWindow();
    if (!win) return null;
    const result = await dialog.showOpenDialog(win, { properties: ["openDirectory"] });
    if (result.canceled || result.filePaths.length === 0) return null;
    projectRoot = result.filePaths[0];
    return { root: projectRoot, tree: await listDir(projectRoot) };
  });

  ipcMain.handle("fs:readDir", async (_e, dirPath: string) => {
    if (projectRoot) assertWithinRoot(projectRoot, dirPath);
    return listDir(dirPath);
  });

  ipcMain.handle("fs:readFile", async (_e, filePath: string) => {
    if (projectRoot) assertWithinRoot(projectRoot, filePath);
    return fsp.readFile(filePath, "utf-8");
  });

  ipcMain.handle("fs:writeFile", async (_e, filePath: string, content: string) => {
    if (projectRoot) assertWithinRoot(projectRoot, filePath);
    await fsp.writeFile(filePath, content, "utf-8");
    return true;
  });

  ipcMain.handle("fs:createFile", async (_e, filePath: string) => {
    if (projectRoot) assertWithinRoot(projectRoot, filePath);
    await fsp.writeFile(filePath, "", { flag: "wx" });
    return true;
  });

  ipcMain.handle("fs:createFolder", async (_e, dirPath: string) => {
    if (projectRoot) assertWithinRoot(projectRoot, dirPath);
    await fsp.mkdir(dirPath, { recursive: true });
    return true;
  });

  ipcMain.handle("fs:deletePath", async (_e, targetPath: string) => {
    if (projectRoot) assertWithinRoot(projectRoot, targetPath);
    await fsp.rm(targetPath, { recursive: true, force: true });
    return true;
  });

  ipcMain.handle("fs:renamePath", async (_e, oldPath: string, newPath: string) => {
    if (projectRoot) {
      assertWithinRoot(projectRoot, oldPath);
      assertWithinRoot(projectRoot, newPath);
    }
    await fsp.rename(oldPath, newPath);
    return true;
  });

  ipcMain.handle("fs:movePath", async (_e, oldPath: string, newPath: string) => {
    if (projectRoot) {
      assertWithinRoot(projectRoot, oldPath);
      assertWithinRoot(projectRoot, newPath);
    }
    await fsp.rename(oldPath, newPath);
    return true;
  });

  // Simple recursive filename search. For large repos this should become an
  // incremental index (see spec section 35) — TODO: swap for a proper index
  // (e.g. a trie/worker-based indexer) once project sizes get large.
  ipcMain.handle("fs:searchFiles", async (_e, root: string, query: string) => {
    const results: string[] = [];
    const q = query.toLowerCase();
    async function walk(dir: string) {
      const entries = await fsp.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory() && IGNORED_DIRS.has(entry.name)) continue;
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) await walk(full);
        else if (entry.name.toLowerCase().includes(q)) results.push(full);
        if (results.length >= 200) return;
      }
    }
    await walk(root);
    return results;
  });

  // Naive text search (grep-like). TODO: shell out to ripgrep if bundled,
  // for real project-wide performance.
  ipcMain.handle("fs:searchText", async (_e, root: string, query: string) => {
    const matches: { file: string; line: number; text: string }[] = [];
    async function walk(dir: string) {
      const entries = await fsp.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory() && IGNORED_DIRS.has(entry.name)) continue;
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          await walk(full);
        } else {
          try {
            const stat = await fsp.stat(full);
            if (stat.size > 1_000_000) continue; // don't load huge files (spec section 35)
            const content = await fsp.readFile(full, "utf-8");
            content.split("\n").forEach((line, i) => {
              if (line.toLowerCase().includes(query.toLowerCase())) {
                matches.push({ file: full, line: i + 1, text: line.trim() });
              }
            });
          } catch {
            /* binary or unreadable file, skip */
          }
        }
        if (matches.length >= 500) return;
      }
    }
    await walk(root);
    return matches;
  });
}
