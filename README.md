# AI IDE — starter build

A real, runnable scaffold for the multi-provider AI coding IDE spec: Electron +
React + TypeScript + Vite + Monaco, with genuine (not mocked) integrations for
Google AI Studio (Gemini), NVIDIA NIM, and Groq.

This is **Phase 1–3 of the spec's own roadmap**, functional end-to-end, plus
structural scaffolding for the later phases. Per the spec's rule *"do not
create fake functionality — mark unfinished things as TODO"*, everything below
is labeled honestly.

## Run it

```bash
npm install
npx electron-rebuild        # rebuilds node-pty's native binding for Electron
npm run dev                 # starts Vite on localhost:5173
```

In a second terminal:

```bash
npm run dev:electron        # compiles electron/*.ts and launches the app
```

(A single `npm run start` script is included for a production-style build —
see package.json.)

## ✅ Genuinely working

- Electron shell with context isolation, no node integration, sandboxed
  renderer, allow-listed IPC (`electron/main.ts`, `electron/preload.ts`)
- File explorer + Monaco editor: open a real project folder, browse, open,
  edit, save (Ctrl/Cmd+S), with path-traversal guards (`electron/ipc/fs.ts`)
- Integrated terminal via node-pty, streamed over IPC (`electron/ipc/terminal.ts`)
- API key management: OS-keychain-backed encryption via `safeStorage`, never
  round-tripped to the renderer in full, only masked (`electron/ipc/keys.ts`)
- Three real provider clients with streaming, model discovery, and key
  validation against the actual APIs — no canned responses:
  - `ai/providers/google/GoogleProvider.ts` (Gemini `generateContent` / SSE stream)
  - `ai/providers/nvidia/NvidiaProvider.ts` (OpenAI-compatible `/chat/completions`)
  - `ai/providers/groq/GroqProvider.ts` (same wire format as NVIDIA)
- Model switching UI + manual key/model selection, with the selected
  provider/model visibly shown in chat replies
- Auto-routing with task classification and automatic fallback across
  providers on error, without ever overriding an explicit user selection
  (`ai/router/ModelRouter.ts`)
- Ask / Code / Edit / Agent mode tabs, diff view with Apply/Reject
  (`ai/context/ContextManager.ts`, `src/components/Diff/DiffView.tsx`)
- Explicit, opt-in AI context via chips — nothing is auto-exposed, `.env`-like
  files are refused outright

## 🚧 Structural scaffold — real interfaces, marked TODO

- **Agent tool-calling loop** (`ai/agent/AgentLoop.ts`): the loop, permission
  gating, and message threading are implemented; the model↔tool wiring is a
  `TODO` because it depends on a choice between native function-calling vs. a
  structured-text protocol — see the comparison in the chat response that
  shipped with this build.
- **Git integration**, **live frontend preview iframe**, **usage dashboard
  persistence**, **MCP/plugin loader**, **command palette**, **model
  favorites/profiles UI** — each has a clear seam to extend (provider
  registry, IPC pattern, store shape) but is not wired into the UI yet.
- Project-wide search is a naive recursive walk; swap for an indexed/ripgrep
  approach before using on large repos (see comments in `electron/ipc/fs.ts`).

## Project layout

```
electron/        Main process: window, IPC (fs, terminal, keys), security
src/              Renderer: React UI, Zustand store, components
ai/               Provider abstraction, router, agent scaffold, context manager
```

## Adding a 4th provider

Implement `AIProvider` (see `ai/core/types.ts`), register it in
`ai/core/registry.ts`, and add its section to `SettingsPanel.tsx`. Nothing
else in the app needs to change — that isolation was a first-class goal of
the architecture.

## Windows deployment (no database / no chat persistence)

This app is designed to run as a standalone Windows Electron application. It does
not require a backend or database. Chat messages are kept in the React component
state for the active session and are not persisted by the app. API keys are stored
locally using Electron `safeStorage` (Windows DPAPI) rather than a database.

### Build the Windows installer

On a Windows machine with Node.js installed:

```bash
npm install
npm run rebuild
npm run package
```

The installer is written to:

```text
release/AI IDE Setup 0.1.0.exe
```

The packaged app contains the renderer and Electron main process. User projects
remain on the user's filesystem, and AI requests go directly to the configured
provider using the user's own API key (BYOK).

### Important

Build the Windows installer on Windows for the most reliable native-module
packaging because the integrated terminal uses `node-pty`. Do not put provider API
keys in `.env` files that are bundled into the application or hard-code your own
provider keys into the app.
