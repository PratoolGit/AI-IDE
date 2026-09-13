import type { IpcMain } from "electron";
import { app, safeStorage } from "electron";
import * as fsp from "fs/promises";
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";

/**
 * API keys are encrypted with Electron's safeStorage (backed by OS Keychain /
 * DPAPI / libsecret) and written to a local JSON file that only ever holds
 * ciphertext. The raw key is decrypted in-process, on demand, only for the
 * outgoing provider fetch call — it is never sent back to the renderer in
 * bulk (spec section 11 + 31).
 */

interface StoredKey {
  id: string;
  provider: string;
  label: string;
  cipher: string; // base64 of safeStorage.encryptString output
  enabled: boolean;
  lastUsed: string | null;
  createdAt: string;
}

function storePath() {
  return path.join(app.getPath("userData"), "keys.json");
}

async function loadStore(): Promise<StoredKey[]> {
  try {
    const raw = await fsp.readFile(storePath(), "utf-8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function saveStore(keys: StoredKey[]) {
  await fsp.mkdir(path.dirname(storePath()), { recursive: true });
  await fsp.writeFile(storePath(), JSON.stringify(keys, null, 2), "utf-8");
}

function mask(rawKey: string) {
  return `••••••••••••${rawKey.slice(-4)}`;
}

export function registerKeyHandlers(ipcMain: IpcMain) {
  ipcMain.handle("keys:save", async (_e, provider: string, label: string, rawKey: string) => {
    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error(
        "OS-level secure storage is unavailable on this machine; refusing to store the key in plaintext."
      );
    }
    const keys = await loadStore();
    const entry: StoredKey = {
      id: crypto.randomUUID(),
      provider,
      label,
      cipher: safeStorage.encryptString(rawKey).toString("base64"),
      enabled: true,
      lastUsed: null,
      createdAt: new Date().toISOString(),
    };
    keys.push(entry);
    await saveStore(keys);
    return { id: entry.id, provider, label, masked: mask(rawKey), enabled: true };
  });

  ipcMain.handle("keys:list", async (_e, provider: string) => {
    const keys = await loadStore();
    return keys
      .filter((k) => k.provider === provider)
      .map((k) => ({
        id: k.id,
        provider: k.provider,
        label: k.label,
        enabled: k.enabled,
        lastUsed: k.lastUsed,
        // masked reconstruction: decrypt only long enough to compute the mask,
        // never returned in full.
        masked: mask(safeStorage.decryptString(Buffer.from(k.cipher, "base64"))),
      }));
  });

  ipcMain.handle("keys:remove", async (_e, id: string) => {
    const keys = await loadStore();
    await saveStore(keys.filter((k) => k.id !== id));
    return true;
  });

  ipcMain.handle("keys:setEnabled", async (_e, id: string, enabled: boolean) => {
    const keys = await loadStore();
    const found = keys.find((k) => k.id === id);
    if (found) found.enabled = enabled;
    await saveStore(keys);
    return true;
  });

  // Internal use only: resolves the plaintext key for an outgoing request.
  // Called by the renderer's provider layer right before a fetch — never
  // logged, never persisted, never displayed.
  ipcMain.handle("keys:getRawForRequest", async (_e, id: string) => {
    const keys = await loadStore();
    const found = keys.find((k) => k.id === id);
    if (!found || !found.enabled) return null;
    found.lastUsed = new Date().toISOString();
    await saveStore(keys);
    return safeStorage.decryptString(Buffer.from(found.cipher, "base64"));
  });
}
