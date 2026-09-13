import { diffLines } from "diff";

export function DiffView({
  before,
  after,
  onApply,
  onReject,
}: {
  before: string;
  after: string;
  onApply: () => void;
  onReject: () => void;
}) {
  const parts = diffLines(before, after);
  return (
    <div className="border border-base-700 rounded-lg overflow-hidden mt-2">
      <div className="bg-base-800 px-3 py-1.5 text-xs text-slate-400 flex items-center justify-between">
        <span>Proposed changes</span>
        <div className="flex gap-2">
          <button onClick={onReject} className="px-2 py-0.5 rounded bg-base-700 hover:bg-red-900/40 text-xs">
            Reject
          </button>
          <button onClick={onApply} className="px-2 py-0.5 rounded bg-accent-dim/80 hover:bg-accent-dim text-xs text-base-950 font-medium">
            Apply
          </button>
        </div>
      </div>
      <pre className="text-xs font-mono p-2 max-h-72 overflow-auto bg-base-950">
        {parts.map((part, i) => (
          <div
            key={i}
            className={
              part.added
                ? "bg-emerald-950/50 text-emerald-300"
                : part.removed
                ? "bg-red-950/50 text-red-300"
                : "text-slate-400"
            }
          >
            {part.value.split("\n").filter((_, idx, arr) => idx < arr.length - 1 || part.value.endsWith("\n") === false).map((line, j) => (
              <div key={j}>
                {part.added ? "+ " : part.removed ? "- " : "  "}
                {line}
              </div>
            ))}
          </div>
        ))}
      </pre>
    </div>
  );
}
