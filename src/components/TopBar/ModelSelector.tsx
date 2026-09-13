import { useState } from "react";
import { ChevronDown, Sparkles } from "lucide-react";
import { useAppStore } from "../../stores/appStore";
import type { ProviderName } from "../../../ai/core/types";

const PROVIDER_LABEL: Record<ProviderName, string> = {
  google: "Google", nvidia: "NVIDIA", groq: "Groq",
};

export function ModelSelector() {
  const [open, setOpen] = useState(false);
  const { modelsByProvider, keysByProvider, selectedModel, selectedProvider, autoRouting, selectModel, setAutoRouting } =
    useAppStore();

  const currentLabel = autoRouting
    ? "Auto"
    : selectedModel
    ? `${PROVIDER_LABEL[selectedProvider!]} • ${selectedModel.label}`
    : "Select a model";

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-base-800 hover:bg-base-700 text-sm"
      >
        <Sparkles size={14} className="text-accent" />
        <span>{currentLabel}</span>
        <ChevronDown size={14} />
      </button>
      {open && (
        <div className="absolute right-0 mt-1 w-72 bg-base-850 border border-base-700 rounded-lg shadow-xl z-50 max-h-96 overflow-y-auto">
          <button
            onClick={() => {
              setAutoRouting(true);
              setOpen(false);
            }}
            className="w-full text-left px-3 py-2 text-sm hover:bg-base-800 flex items-center gap-2"
          >
            <Sparkles size={14} className="text-accent" /> Auto (route by task)
          </button>
          {(Object.keys(modelsByProvider) as ProviderName[]).map((provider) => (
            <div key={provider} className="border-t border-base-700">
              <div className="px-3 pt-2 pb-1 text-xs uppercase text-slate-500">{PROVIDER_LABEL[provider]}</div>
              {modelsByProvider[provider].length === 0 && (
                <div className="px-3 pb-2 text-xs text-slate-600">
                  No models yet — add an API key in Settings.
                </div>
              )}
              {modelsByProvider[provider].map((model) => {
                const key = keysByProvider[provider].find((k) => k.enabled);
                return (
                  <button
                    key={model.id}
                    disabled={!key}
                    onClick={() => {
                      if (!key) return;
                      selectModel(provider, model, key.id);
                      setOpen(false);
                    }}
                    className="w-full text-left px-3 py-1.5 text-sm hover:bg-base-800 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {model.label}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
