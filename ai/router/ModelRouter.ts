import type { ChatMessage, ModelInfo, SendOptions } from "../core/types";
import { getProvider } from "../core/registry";

export type TaskType = "simple" | "code" | "reasoning" | "vision" | "large-context" | "agent";

export interface RoutableKey {
  keyId: string;
  provider: ModelInfo["provider"];
  model: ModelInfo;
  rawKey: string; // resolved just-in-time via keys:getRawForRequest, never persisted here
}

/** Very deliberately simple heuristic classifier — swap for a real one later. */
export function classifyTask(lastUserMessage: string, hasImageAttachment: boolean): TaskType {
  if (hasImageAttachment) return "vision";
  const text = lastUserMessage.toLowerCase();
  if (/```|function|refactor|bug|error|implement|class |const |import /.test(text)) return "code";
  if (text.length > 1200) return "large-context";
  if (/why|explain|trade-?off|compare|design|architecture/.test(text)) return "reasoning";
  return "simple";
}

function rankForTask(task: TaskType, candidates: RoutableKey[]): RoutableKey[] {
  const speedRank = { fast: 0, balanced: 1, strong: 2 } as const;
  const score = (c: RoutableKey) => {
    const tier = c.model.speedTier ?? "balanced";
    switch (task) {
      case "simple":
        return speedRank[tier]; // prefer fast
      case "code":
      case "reasoning":
        return -speedRank[tier]; // prefer strong
      case "vision":
        return c.model.vision ? -1 : 1; // vision-capable first
      case "large-context":
        return -(c.model.contextWindow ?? 0);
      case "agent":
        return -speedRank[tier];
    }
  };
  return [...candidates].sort((a, b) => score(a) - score(b));
}

/**
 * Auto mode: picks the best available (key, model) for the classified task,
 * and falls back through the ranked list on failure. Never invoked when the
 * user explicitly pinned a model (spec section 12 — "never silently change
 * models when the user explicitly selected one").
 */
export async function sendWithAutoRouting(
  task: TaskType,
  messages: ChatMessage[],
  candidates: RoutableKey[],
  onChunk: (providerLabel: string, delta: string, done: boolean) => void,
  onFallback: (fromLabel: string, toLabel: string, reason: string) => void
): Promise<void> {
  const ranked = rankForTask(task, candidates);
  let lastError: Error | null = null;

  for (let i = 0; i < ranked.length; i++) {
    const candidate = ranked[i];
    const provider = getProvider(candidate.provider);
    const label = `${candidate.provider} • ${candidate.model.label}`;
    try {
      const opts: SendOptions = {
        modelId: candidate.model.id,
        apiKey: candidate.rawKey,
        messages,
      };
      await provider.streamMessage(opts, (chunk) => onChunk(label, chunk.delta, chunk.done));
      return; // success
    } catch (err) {
      lastError = err as Error;
      const next = ranked[i + 1];
      if (next) {
        onFallback(label, `${next.provider} • ${next.model.label}`, lastError.message);
      }
    }
  }
  throw lastError ?? new Error("No candidate models/keys were available.");
}
