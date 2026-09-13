# AI IDE

**A privacy-focused, multi-provider AI coding IDE for Windows.**

AI IDE combines a modern code editor, integrated terminal, file explorer, and AI coding assistant into a single desktop application.

It runs locally on your computer, works directly with your existing projects, and does **not require a database or backend**.

> **Bring Your Own Key (BYOK)** — use your own AI provider API keys and communicate directly with supported AI providers.

---

## ✨ Features

### 💻 Full Coding Environment

* Monaco-powered code editor
* Open and work with real local project folders
* Browse project files with an integrated file explorer
* Edit and save files directly
* Integrated terminal powered by `node-pty`
* Keyboard shortcuts such as `Ctrl/Cmd + S`
* Protected filesystem operations and path-traversal safeguards

### 🤖 Multi-Provider AI

Connect your own API keys and use multiple AI providers from one application.

Currently supported:

* **Google Gemini**
* **NVIDIA NIM**
* **Groq**
* OpenAI-compatible providers through the shared provider interface

The architecture is designed so additional providers can be added without rewriting the rest of the application.

### 🧠 AI Coding Modes

AI IDE provides different workflows for different development tasks:

* **Ask** — ask questions about your code
* **Code** — generate new code and solutions
* **Edit** — modify existing code
* **Agent** — work toward more complex coding tasks

### 🔀 Model Routing

The built-in model router can classify tasks and select an appropriate configured provider.

It also supports provider fallback when a request fails, while respecting an explicitly selected provider/model.

### 📝 Code Changes & Diff Review

AI-generated changes can be reviewed before being applied.

* View proposed changes
* Review diffs
* Apply changes
* Reject changes

### 🔐 Privacy & Local-First Design

AI IDE is designed without requiring a central backend.

**No database.**

**No cloud chat history.**

**No account required.**

**No server-side project storage.**

Chat messages are kept in application memory for the active session and are not persisted by the application.

API keys are stored locally using Electron's `safeStorage` mechanism rather than being stored in a database.

Your projects remain on your own computer.

---

## 🏗️ Architecture

```text
┌─────────────────────────────────────┐
│              AI IDE                 │
│             Electron                │
├─────────────────────────────────────┤
│                                     │
│  React + TypeScript + Vite          │
│  Monaco Editor                      │
│  Zustand                            │
│                                     │
├───────────────┬─────────────────────┤
│ Local Files   │ AI Provider Layer   │
│               │                     │
│ File System   │ Google Gemini       │
│ Terminal      │ NVIDIA NIM          │
│ Settings      │ Groq                │
│               │ OpenAI-compatible   │
└───────────────┴─────────────────────┘
                       │
                       ▼
                AI Provider APIs
```

The application communicates directly with the configured AI provider using the user's API key.

There is no required application server between the desktop application and the AI provider.

---

## 🛠️ Technology Stack

| Technology           | Purpose                            |
| -------------------- | ---------------------------------- |
| Electron             | Desktop application runtime        |
| React                | User interface                     |
| TypeScript           | Application language               |
| Vite                 | Frontend build system              |
| Monaco Editor        | Code editor                        |
| Zustand              | State management                   |
| Tailwind CSS         | UI styling                         |
| node-pty             | Integrated terminal                |
| Electron IPC         | Secure main/renderer communication |
| Electron safeStorage | Local API-key protection           |
| electron-builder     | Windows application packaging      |

---

## 🚀 Installation

### Option 1 — Download the Windows installer

Download the latest Windows installer from the project's **GitHub Releases** page.

Run:

```text
AI IDE Setup.exe
```

and follow the installation instructions.

No Node.js installation is required for end users.

---

## 🧑‍💻 Development Setup

If you want to run AI IDE from source, install:

* Node.js
* npm
* Git

Clone the repository:

```bash
git clone https://github.com/YOUR_USERNAME/ai-ide.git
cd ai-ide
```

Install dependencies:

```bash
npm install
```

Rebuild native dependencies:

```bash
npm run rebuild
```

Start the Vite development server:

```bash
npm run dev
```

In a second terminal:

```bash
npm run dev:electron
```

---

## 📦 Building the Windows Installer

AI IDE can be packaged as a standalone Windows installer.

On Windows:

```bash
npm install
npm run rebuild
npm run package
```

The generated installer will be available in:

```text
release/
└── AI IDE Setup 0.1.0.exe
```

The resulting installer can be distributed directly to Windows users or uploaded to GitHub Releases.

### Why build on Windows?

The integrated terminal uses the native `node-pty` dependency.

Building the Windows release directly on Windows provides the most reliable native-module packaging experience.

---

## 🔑 API Keys

AI IDE follows a **Bring Your Own Key (BYOK)** model.

Users provide their own API credentials through the application's settings.

API keys are stored locally using Electron's secure storage facilities.

### Supported providers

#### Google Gemini

Configure a Google AI Studio / Gemini API key and select an available Gemini model.

#### NVIDIA NIM

Configure your NVIDIA API credentials and use NVIDIA's OpenAI-compatible API.

#### Groq

Configure your Groq API key and select an available Groq model.

---

## 🔒 Security

AI IDE uses Electron security best practices including:

* Context isolation
* Disabled Node integration in the renderer
* Sandboxed renderer
* Allow-listed IPC communication
* Filesystem path-traversal protection
* Secure API-key storage through Electron `safeStorage`
* Explicit AI context selection
* Protection against exposing `.env`-style files through AI context

AI context is opt-in — files are not automatically sent to an AI provider without the application requesting them as part of the selected workflow.

> **Important:** Never hard-code your own API keys into the application or commit API keys to GitHub.

---

## 📁 Project Structure

```text
ai-ide/
│
├── electron/
│   ├── main.ts
│   ├── preload.ts
│   ├── ipc/
│   │   ├── fs.ts
│   │   ├── terminal.ts
│   │   └── keys.ts
│   └── security/
│
├── src/
│   ├── components/
│   │   ├── Chat/
│   │   ├── Editor/
│   │   ├── Terminal/
│   │   ├── Sidebar/
│   │   ├── Settings/
│   │   └── Diff/
│   ├── stores/
│   ├── hooks/
│   └── App.tsx
│
├── ai/
│   ├── agent/
│   ├── context/
│   ├── core/
│   ├── providers/
│   └── router/
│
├── package.json
├── vite.config.ts
└── README.md
```

---

## ➕ Adding Another AI Provider

AI providers are isolated behind a common provider interface.

To add a new provider:

1. Implement the `AIProvider` interface.
2. Add the provider under:

```text
ai/providers/
```

3. Register it in:

```text
ai/core/registry.ts
```

4. Add the provider configuration to the settings UI.

The rest of the application can continue using the same provider abstraction.

---

## 🚧 Roadmap

AI IDE is actively evolving.

Planned improvements include:

* [ ] More AI providers
* [ ] Improved agent tool-calling
* [ ] Native Git integration
* [ ] Live frontend preview
* [ ] Project-wide indexed search
* [ ] Command palette
* [ ] Model favorites and profiles
* [ ] MCP/plugin support
* [ ] Improved agent workflows
* [ ] Automatic application updates
* [ ] macOS support
* [ ] Linux support

Some of these features have architectural scaffolding already but are not fully implemented yet.

---

## 🤝 Contributing

Contributions, ideas, bug reports, and feature requests are welcome.

If you'd like to contribute:

1. Fork the repository.
2. Create a feature branch.

```bash
git checkout -b feature/my-feature
```

3. Make your changes.
4. Test the application.
5. Commit your changes.

```bash
git commit -m "Add my feature"
```

6. Push your branch.

```bash
git push origin feature/my-feature
```

7. Open a Pull Request.

---

## 🐛 Issues & Feature Requests

If you encounter a bug or have an idea for improving AI IDE, please open an issue in the GitHub repository.

When reporting a bug, include:

* Windows version
* AI IDE version
* AI provider/model
* Steps to reproduce the issue
* Relevant error messages

**Never include API keys or other secrets in an issue.**

---

## 📄 License

This project is licensed under the **MIT License**.

See the `LICENSE` file for details.

---

## ⭐ Support the Project

If you find AI IDE useful:

* ⭐ Star the repository
* 🐛 Report bugs
* 💡 Suggest features
* 🔧 Contribute improvements
* 📢 Share the project

Every contribution helps improve the project.

---

## ⚠️ Disclaimer

AI-generated code can contain bugs, security vulnerabilities, or unintended behavior.

Always review AI-generated changes before applying them to important projects.

You are responsible for the API usage and costs associated with the AI providers whose keys you configure.

---

## Built with ❤️ for developers

**AI IDE — Your code. Your machine. Your API keys.**
