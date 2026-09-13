export type ChatRole = "system" | "user" | "assistant";

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface ModelInfo {
  id: string;          // provider-native model id, e.g. "gemini-2.0-flash"
  label: string;        // display name
  provider: ProviderName;
  contextWindow?: number;
  vision?: boolean;
  speedTier?: "fast" | "balanced" | "strong";
}

export type ProviderName = "google" | "nvidia" | "groq";

export interface SendOptions {
  modelId: string;
  apiKey: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
}

export interface StreamChunk {
  delta: string;
  done: boolean;
}

export interface UsageInfo {
  requestsThisSession: number;
  lastStatus: "ok" | "error" | "unknown";
  lastError?: string;
}

/**
 * Every provider (Google, NVIDIA, Groq, and any added later) implements this
 * exact shape. Nothing else in the app is allowed to know which provider is
 * behind it — see spec section 6.
 */
export interface AIProvider {
  readonly name: ProviderName;
  validateKey(apiKey: string): Promise<{ valid: boolean; reason?: string }>;
  listModels(apiKey: string): Promise<ModelInfo[]>;
  sendMessage(opts: SendOptions): Promise<string>;
  streamMessage(opts: SendOptions, onChunk: (c: StreamChunk) => void): Promise<void>;
  getUsage(): UsageInfo;
}
