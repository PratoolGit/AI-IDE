import type {
  AIProvider,
  ModelInfo,
  ProviderName,
  SendOptions,
  StreamChunk,
  UsageInfo,
} from "../../core/types";

/**
 * NVIDIA NIM and Groq both expose an OpenAI-compatible `/chat/completions`
 * and `/models` surface, so the wire format is shared here. Only the base
 * URL, provider name, and a fallback static model list differ per subclass —
 * this is exactly the "isolated but shared where the wire protocol matches"
 * structure spec section 6/36 asks for.
 */
export abstract class OpenAICompatibleProvider implements AIProvider {
  abstract readonly name: ProviderName;
  protected abstract baseUrl: string;
  /** Used only if the provider's /models endpoint is unavailable or partial. */
  protected abstract fallbackModels: ModelInfo[];

  private usage: UsageInfo = { requestsThisSession: 0, lastStatus: "unknown" };

  async validateKey(apiKey: string) {
    try {
      const res = await fetch(`${this.baseUrl}/models`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (!res.ok) return { valid: false, reason: `HTTP ${res.status}` };
      return { valid: true };
    } catch (err) {
      return { valid: false, reason: (err as Error).message };
    }
  }

  async listModels(apiKey: string): Promise<ModelInfo[]> {
    try {
      const res = await fetch(`${this.baseUrl}/models`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (!res.ok) return this.fallbackModels;
      const data = await res.json();
      const list = (data.data || []).map((m: any) => ({
        id: m.id,
        label: m.id,
        provider: this.name,
      }));
      // Merge with fallback so hand-curated metadata (vision/speedTier) survives
      // for models discovery already knows about, while new/unknown models
      // from the API still show up (spec: "don't assume model catalog is static").
      const known = new Map(this.fallbackModels.map((m) => [m.id, m]));
      return list.length
        ? list.map((m: ModelInfo) => known.get(m.id) ?? m)
        : this.fallbackModels;
    } catch {
      return this.fallbackModels;
    }
  }

  async sendMessage(opts: SendOptions): Promise<string> {
    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${opts.apiKey}`,
        "Content-Type": "application/json",
      },
      signal: opts.signal,
      body: JSON.stringify({
        model: opts.modelId,
        messages: opts.messages,
        temperature: opts.temperature ?? 0.7,
        max_tokens: opts.maxTokens ?? 4096,
        stream: false,
      }),
    });
    this.usage.requestsThisSession++;
    if (!res.ok) {
      this.usage.lastStatus = "error";
      const body = await res.text();
      this.usage.lastError = `HTTP ${res.status}: ${body.slice(0, 300)}`;
      throw new Error(this.usage.lastError);
    }
    this.usage.lastStatus = "ok";
    const data = await res.json();
    return data.choices?.[0]?.message?.content ?? "";
  }

  async streamMessage(opts: SendOptions, onChunk: (c: StreamChunk) => void): Promise<void> {
    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${opts.apiKey}`,
        "Content-Type": "application/json",
      },
      signal: opts.signal,
      body: JSON.stringify({
        model: opts.modelId,
        messages: opts.messages,
        temperature: opts.temperature ?? 0.7,
        max_tokens: opts.maxTokens ?? 4096,
        stream: true,
      }),
    });
    this.usage.requestsThisSession++;
    if (!res.ok || !res.body) {
      this.usage.lastStatus = "error";
      const body = res.body ? await res.text() : "no body";
      this.usage.lastError = `HTTP ${res.status}: ${body.slice(0, 300)}`;
      throw new Error(this.usage.lastError);
    }
    this.usage.lastStatus = "ok";
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const payload = trimmed.slice(5).trim();
        if (payload === "[DONE]") continue;
        try {
          const parsed = JSON.parse(payload);
          const delta = parsed.choices?.[0]?.delta?.content ?? "";
          if (delta) onChunk({ delta, done: false });
        } catch {
          /* partial line, wait for more */
        }
      }
    }
    onChunk({ delta: "", done: true });
  }

  getUsage() {
    return this.usage;
  }
}
