import { useState } from "react";
import { X, Trash2 } from "lucide-react";
import { useAppStore } from "../../stores/appStore";
import { getProvider } from "../../../ai/core/registry";
import type { ProviderName } from "../../../ai/core/types";

const PROVIDERS: { id: ProviderName; label: string; hint: string }[] = [
  { id: "google", label: "Google AI Studio", hint: "Get a key at aistudio.google.com/apikey" },
  { id: "nvidia", label: "NVIDIA NIM", hint: "Get a key at build.nvidia.com" },
  { id: "groq", label: "Groq", hint: "Get a key at console.groq.com/keys" },
];

export function SettingsPanel({ onClose }: { onClose: () => void }) {
  const { keysByProvider, setKeys, setModels } = useAppStore();
  const [labelDraft, setLabelDraft] = useState<Record<ProviderName, string>>({ google: "", nvidia: "", groq: "" });
  const [keyDraft, setKeyDraft] = useState<Record<ProviderName, string>>({ google: "", nvidia: "", groq: "" });
  const [status, setStatus] = useState<Record<string, string>>({});

  async function refreshKeys(provider: ProviderName) {
    const keys = await window.ide.keys.list(provider);
    setKeys(provider, keys);
  }

  async function addKey(provider: ProviderName) {
    const raw = keyDraft[provider].trim();
    if (!raw) return;
    const label = labelDraft[provider].trim() || `${provider} key ${keysByProvider[provider].length + 1}`;
    const providerImpl = getProvider(provider);
    const validation = await providerImpl.validateKey(raw);
    if (!validation.valid) {
      setStatus((s) => ({ ...s, [provider]: `Validation failed: ${validation.reason}` }));
      return;
    }
    await window.ide.keys.save(provider, label, raw);
    setKeyDraft((d) => ({ ...d, [provider]: "" }));
    setLabelDraft((d) => ({ ...d, [provider]: "" }));
    await refreshKeys(provider);
    const models = await providerImpl.listModels(raw);
    setModels(provider, models);
    setStatus((s) => ({ ...s, [provider]: `Connected — ${models.length} models found.` }));
  }

  async function removeKey(provider: ProviderName, id: string) {
    await window.ide.keys.remove(id);
    await refreshKeys(provider);
  }

  async function toggleKey(provider: ProviderName, id: string, enabled: boolean) {
    await window.ide.keys.setEnabled(id, enabled);
    await refreshKeys(provider);
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-base-900 border border-base-700 rounded-xl w-[640px] max-h-[80vh] overflow-y-auto p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">AI Providers</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-base-800">
            <X size={18} />
          </button>
        </div>

        {PROVIDERS.map((p) => (
          <div key={p.id} className="mb-6 border border-base-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-medium">{p.label}</h3>
            </div>
            <p className="text-xs text-slate-500 mb-3">{p.hint}. Keys are encrypted at rest via your OS keychain.</p>

            <div className="space-y-1 mb-3">
              {keysByProvider[p.id].map((k) => (
                <div key={k.id} className="flex items-center justify-between text-sm bg-base-800 rounded px-3 py-1.5">
                  <div>
                    <span className={k.enabled ? "text-slate-200" : "text-slate-500 line-through"}>{k.label}</span>{" "}
                    <span className="text-slate-500 font-mono text-xs">{k.masked}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleKey(p.id, k.id, !k.enabled)}
                      className="text-xs px-2 py-0.5 rounded bg-base-700 hover:bg-base-600"
                    >
                      {k.enabled ? "Disable" : "Enable"}
                    </button>
                    <Trash2 size={14} className="cursor-pointer text-slate-400 hover:text-red-400" onClick={() => removeKey(p.id, k.id)} />
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                placeholder="Label (optional)"
                value={labelDraft[p.id]}
                onChange={(e) => setLabelDraft((d) => ({ ...d, [p.id]: e.target.value }))}
                className="w-32 bg-base-800 rounded px-2 py-1.5 text-sm"
              />
              <input
                placeholder="Paste API key"
                type="password"
                value={keyDraft[p.id]}
                onChange={(e) => setKeyDraft((d) => ({ ...d, [p.id]: e.target.value }))}
                className="flex-1 bg-base-800 rounded px-2 py-1.5 text-sm font-mono"
              />
              <button
                onClick={() => addKey(p.id)}
                className="px-3 py-1.5 rounded bg-accent-dim text-base-950 text-sm font-medium hover:opacity-90"
              >
                Add
              </button>
            </div>
            {status[p.id] && <div className="text-xs text-slate-400 mt-2">{status[p.id]}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}
