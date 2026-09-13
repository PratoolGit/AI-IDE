import Editor from "@monaco-editor/react";
import { X } from "lucide-react";
import { useAppStore } from "../../stores/appStore";

function languageFor(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase();
  const map: Record<string, string> = {
    js: "javascript", jsx: "javascript", ts: "typescript", tsx: "typescript",
    py: "python", html: "html", css: "css", json: "json", md: "markdown",
    java: "java", cpp: "cpp", c: "c", rs: "rust", go: "go", php: "php",
  };
  return map[ext ?? ""] ?? "plaintext";
}

export function EditorPane() {
  const { openFiles, activeFilePath, setActiveFile, closeFile, updateFileContent, markSaved } =
    useAppStore();

  const activeFile = openFiles.find((f) => f.path === activeFilePath);

  async function save(path: string, content: string) {
    await window.ide.fs.writeFile(path, content);
    markSaved(path);
  }

  return (
    <div className="flex flex-col h-full bg-base-900">
      <div className="flex items-center border-b border-base-700 bg-base-850 overflow-x-auto">
        {openFiles.map((f) => (
          <div
            key={f.path}
            onClick={() => setActiveFile(f.path)}
            className={`flex items-center gap-2 px-3 py-2 text-sm border-r border-base-700 cursor-pointer ${
              f.path === activeFilePath ? "bg-base-900 text-slate-100" : "text-slate-400 hover:bg-base-800"
            }`}
          >
            <span>{f.dirty ? "●" : ""} {f.name}</span>
            <X
              size={13}
              className="hover:text-red-400"
              onClick={(e) => {
                e.stopPropagation();
                closeFile(f.path);
              }}
            />
          </div>
        ))}
        {openFiles.length === 0 && (
          <div className="px-3 py-2 text-sm text-slate-500">No files open</div>
        )}
      </div>
      <div className="flex-1">
        {activeFile ? (
          <Editor
            key={activeFile.path}
            path={activeFile.path}
            language={languageFor(activeFile.path)}
            value={activeFile.content}
            theme="vs-dark"
            onChange={(value) => updateFileContent(activeFile.path, value ?? "")}
            onMount={(editor) => {
              editor.addCommand(
                // Ctrl/Cmd+S
                2048 | 49,
                () => save(activeFile.path, editor.getValue())
              );
            }}
            options={{
              minimap: { enabled: true },
              fontSize: 13,
              fontFamily: "JetBrains Mono, monospace",
              automaticLayout: true,
              smoothScrolling: true,
            }}
          />
        ) : (
          <div className="h-full flex items-center justify-center text-slate-600 text-sm">
            Open a file from the explorer, or ask the AI to create one.
          </div>
        )}
      </div>
    </div>
  );
}
