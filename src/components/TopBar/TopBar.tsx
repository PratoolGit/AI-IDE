import { Play, Settings as SettingsIcon } from "lucide-react";
import { ModelSelector } from "./ModelSelector";
import { useAppStore, type AIMode } from "../../stores/appStore";

const MODES: { id: AIMode; label: string }[] = [
  { id: "ask", label: "Ask" },
  { id: "code", label: "Code" },
  { id: "edit", label: "Edit" },
  { id: "agent", label: "Agent" },
];

export function TopBar({ onOpenSettings }: { onOpenSettings: () => void }) {
  const { mode, setMode, projectRoot } = useAppStore();
  return (
    <div className="h-12 flex items-center justify-between px-3 bg-base-900 border-b border-base-700">
      <div className="flex items-center gap-3">
        <span className="font-semibold text-slate-200 text-sm">AI IDE</span>
        <span className="text-xs text-slate-500 truncate max-w-xs">
          {projectRoot ?? "No project open"}
        </span>
      </div>
      <div className="flex items-center gap-1 bg-base-800 rounded-md p-0.5">
        {MODES.map((m) => (
          <button
            key={m.id}
            onClick={() => setMode(m.id)}
            className={`px-3 py-1 text-xs rounded ${
              mode === m.id ? "bg-accent-dim text-base-950 font-medium" : "text-slate-300 hover:bg-base-700"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <button className="p-1.5 rounded hover:bg-base-800 text-slate-300" title="Run">
          <Play size={16} />
        </button>
        <ModelSelector />
        <button onClick={onOpenSettings} className="p-1.5 rounded hover:bg-base-800 text-slate-300" title="Settings">
          <SettingsIcon size={16} />
        </button>
      </div>
    </div>
  );
}
