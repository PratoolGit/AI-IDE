import { create } from "zustand";
import type { ModelInfo, ProviderName } from "../../ai/core/types";
import type { FileNode } from "../../electron/ipc/fs";

export type AIMode = "ask" | "code" | "edit" | "agent";

export interface KeyRecord {
  id: string;
  provider: ProviderName;
  label: string;
  masked: string;
  enabled: boolean;
  lastUsed: string | null;
}

export interface OpenFile {
  path: string;
  name: string;
  content: string;
  dirty: boolean;
}

interface AppState {
  projectRoot: string | null;
  fileTree: FileNode[];
  openFiles: OpenFile[];
  activeFilePath: string | null;

  mode: AIMode;
  autoRouting: boolean;
  selectedProvider: ProviderName | null;
  selectedModel: ModelInfo | null;
  selectedKeyId: string | null;
  keysByProvider: Record<ProviderName, KeyRecord[]>;
  modelsByProvider: Record<ProviderName, ModelInfo[]>;

  setProject: (root: string, tree: FileNode[]) => void;
  openFile: (path: string, content: string) => void;
  updateFileContent: (path: string, content: string) => void;
  markSaved: (path: string) => void;
  closeFile: (path: string) => void;
  setActiveFile: (path: string) => void;

  setMode: (mode: AIMode) => void;
  setAutoRouting: (v: boolean) => void;
  selectModel: (provider: ProviderName, model: ModelInfo, keyId: string) => void;
  setKeys: (provider: ProviderName, keys: KeyRecord[]) => void;
  setModels: (provider: ProviderName, models: ModelInfo[]) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  projectRoot: null,
  fileTree: [],
  openFiles: [],
  activeFilePath: null,

  mode: "ask",
  autoRouting: false,
  selectedProvider: null,
  selectedModel: null,
  selectedKeyId: null,
  keysByProvider: { google: [], nvidia: [], groq: [] },
  modelsByProvider: { google: [], nvidia: [], groq: [] },

  setProject: (root, tree) => set({ projectRoot: root, fileTree: tree }),

  openFile: (path, content) => {
    const existing = get().openFiles.find((f) => f.path === path);
    if (existing) {
      set({ activeFilePath: path });
      return;
    }
    const name = path.split(/[\\/]/).pop() ?? path;
    set({
      openFiles: [...get().openFiles, { path, name, content, dirty: false }],
      activeFilePath: path,
    });
  },

  updateFileContent: (path, content) =>
    set({
      openFiles: get().openFiles.map((f) => (f.path === path ? { ...f, content, dirty: true } : f)),
    }),

  markSaved: (path) =>
    set({
      openFiles: get().openFiles.map((f) => (f.path === path ? { ...f, dirty: false } : f)),
    }),

  closeFile: (path) => {
    const remaining = get().openFiles.filter((f) => f.path !== path);
    const wasActive = get().activeFilePath === path;
    set({
      openFiles: remaining,
      activeFilePath: wasActive ? remaining[remaining.length - 1]?.path ?? null : get().activeFilePath,
    });
  },

  setActiveFile: (path) => set({ activeFilePath: path }),

  setMode: (mode) => set({ mode }),
  setAutoRouting: (v) => set({ autoRouting: v }),
  selectModel: (provider, model, keyId) =>
    set({ selectedProvider: provider, selectedModel: model, selectedKeyId: keyId, autoRouting: false }),
  setKeys: (provider, keys) =>
    set({ keysByProvider: { ...get().keysByProvider, [provider]: keys } }),
  setModels: (provider, models) =>
    set({ modelsByProvider: { ...get().modelsByProvider, [provider]: models } }),
}));
