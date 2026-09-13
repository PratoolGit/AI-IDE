import { useState, useRef } from "react";
import { Send, Paperclip, X, Square } from "lucide-react";
import { useAppStore } from "../../stores/appStore";
import { getProvider } from "../../../ai/core/registry";
import { sendWithAutoRouting, classifyTask } from "../../../ai/router/ModelRouter";
import { ContextManager, type ContextItem } from "../../../ai/context/ContextManager";
import type { ChatMessage } from "../../../ai/core/types";
import { DiffView } from "../Diff/DiffView";

interface DisplayMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  modelLabel?: string;
  diff?: { path: string; before: string; after: string };
}

const contextManager = new ContextManager();

const MODE_SYSTEM_PROMPT: Record<string, string> = {
  ask: "You are a helpful coding assistant. Explain clearly; do not propose file edits unless asked.",
  code: "You are a coding assistant. Generate complete, runnable code for the request. Wrap code in fenced blocks.",
  edit: "You are a code-editing assistant. Propose a focused diff for the requested change. Do not touch unrelated code.",
  agent: "You are an autonomous coding agent. (Tool-calling loop is a TODO — see AgentLoop.ts.)",
};

export function ChatPanel() {
  const { mode, autoRouting, selectedProvider, selectedModel, selectedKeyId, keysByProvider, activeFilePath, openFiles } =
    useAppStore();
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [input, setInput] = useState("");
  const [contextChips, setContextChips] = useState<ContextItem[]>([]);
  const [busy, setBusy] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  function addCurrentFileToContext() {
    const active = openFiles.find((f) => f.path === activeFilePath);
    if (!active) return;
    const item: ContextItem = {
      id: active.path,
      kind: "file",
      label: active.name,
      path: active.path,
      content: active.content.slice(0, 20000),
    };
    try {
      contextManager.add(item);
      setContextChips(contextManager.list());
    } catch (err) {
      alert((err as Error).message);
    }
  }

  function removeChip(id: string) {
    contextManager.remove(id);
    setContextChips(contextManager.list());
  }

  async function resolveRawKey(keyId: string) {
    const raw = await window.ide.keys.getRawForRequest(keyId);
    if (!raw) throw new Error("Selected API key is missing or disabled.");
    return raw;
  }

  async function handleSend() {
    if (!input.trim() || busy) return;
    const userText = input.trim();
    setInput("");

    const systemPrompt = MODE_SYSTEM_PROMPT[mode];
    const contextBlock = contextManager.toPromptBlock();
    const fullUserContent = contextBlock ? `${contextBlock}\n\n${userText}` : userText;

    const history: ChatMessage[] = [
      { role: "system", content: systemPrompt },
      ...messages.filter((m) => m.role !== "system").map((m) => ({ role: m.role, content: m.content } as ChatMessage)),
      { role: "user", content: fullUserContent },
    ];

    const userMsgId = crypto.randomUUID();
    const assistantMsgId = crypto.randomUUID();
    setMessages((prev) => [
      ...prev,
      { id: userMsgId, role: "user", content: userText },
      { id: assistantMsgId, role: "assistant", content: "" },
    ]);
    setBusy(true);
    abortRef.current = new AbortController();

    try {
      if (autoRouting) {
        // Gather one enabled key per provider that currently has models loaded.
        const candidates = [];
        for (const provider of ["google", "nvidia", "groq"] as const) {
          const key = useAppStore.getState().keysByProvider[provider].find((k) => k.enabled);
          const models = useAppStore.getState().modelsByProvider[provider];
          if (key && models[0]) {
            candidates.push({ keyId: key.id, provider, model: models[0], rawKey: await resolveRawKey(key.id) });
          }
        }
        const task = classifyTask(userText, false);
        await sendWithAutoRouting(
          task,
          history,
          candidates,
          (label, delta, done) => {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMsgId
                  ? { ...m, content: m.content + delta, modelLabel: label }
                  : m
              )
            );
          },
          (fromLabel, toLabel, reason) => {
            setMessages((prev) => [
              ...prev,
              {
                id: crypto.randomUUID(),
                role: "system",
                content: `${fromLabel} unavailable (${reason}) — falling back to ${toLabel}...`,
              },
            ]);
          }
        );
      } else {
        if (!selectedProvider || !selectedModel || !selectedKeyId) {
          throw new Error("Pick a model (top right) or add an API key in Settings first.");
        }
        const rawKey = await resolveRawKey(selectedKeyId);
        const provider = getProvider(selectedProvider);
        await provider.streamMessage(
          { modelId: selectedModel.id, apiKey: rawKey, messages: history, signal: abortRef.current.signal },
          (chunk) => {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMsgId
                  ? { ...m, content: m.content + chunk.delta, modelLabel: `${selectedProvider} • ${selectedModel.label}` }
                  : m
              )
            );
          }
        );
      }
    } catch (err) {
      setMessages((prev) =>
        prev.map((m) => (m.id === assistantMsgId ? { ...m, content: `⚠ ${(err as Error).message}` } : m))
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="h-full flex flex-col bg-base-900 border-l border-base-700">
      <div className="px-3 py-2 border-b border-base-700 text-xs uppercase tracking-wide text-slate-400 flex items-center justify-between">
        <span>AI Agent — {mode} mode</span>
      </div>

      {contextChips.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-3 py-2 border-b border-base-700">
          {contextChips.map((c) => (
            <span key={c.id} className="flex items-center gap-1 text-xs bg-base-800 px-2 py-1 rounded-full">
              📄 {c.label}
              <X size={11} className="cursor-pointer hover:text-red-400" onClick={() => removeChip(c.id)} />
            </span>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-3">
        {messages.length === 0 && (
          <div className="text-xs text-slate-500 mt-4">
            Ask a question, request code, or propose an edit. Attach the current file with the paperclip icon.
          </div>
        )}
        {messages.map((m) => (
          <div key={m.id} className={m.role === "user" ? "text-slate-100" : "text-slate-300"}>
            {m.role === "system" ? (
              <div className="text-xs text-amber-300/80 italic">{m.content}</div>
            ) : (
              <div className="text-sm whitespace-pre-wrap leading-relaxed">
                <div className="text-[10px] uppercase text-slate-500 mb-1">
                  {m.role === "user" ? "You" : m.modelLabel ?? "Assistant"}
                </div>
                {m.content || (busy && m.role === "assistant" ? "…" : "")}
                {m.diff && (
                  <DiffView
                    before={m.diff.before}
                    after={m.diff.after}
                    onApply={() => window.ide.fs.writeFile(m.diff!.path, m.diff!.after)}
                    onReject={() => {}}
                  />
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="border-t border-base-700 p-2">
        <div className="flex items-end gap-2">
          <button onClick={addCurrentFileToContext} className="p-2 rounded hover:bg-base-800 text-slate-400" title="Add current file to context">
            <Paperclip size={16} />
          </button>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleSend();
            }}
            placeholder={`${mode === "agent" ? "Describe the task for the agent…" : "Ask, generate, or edit… (Ctrl+Enter to send)"}`}
            rows={2}
            className="flex-1 bg-base-800 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-accent-dim"
          />
          {busy ? (
            <button onClick={() => abortRef.current?.abort()} className="p-2 rounded bg-red-900/50 hover:bg-red-900 text-red-200">
              <Square size={16} />
            </button>
          ) : (
            <button onClick={handleSend} className="p-2 rounded bg-accent-dim hover:opacity-90 text-base-950">
              <Send size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
