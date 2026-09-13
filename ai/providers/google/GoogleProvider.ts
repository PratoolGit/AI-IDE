import type { AIProvider, ModelInfo, SendOptions, StreamChunk, UsageInfo } from "../../core/types";

const BASE = "https://generativelanguage.googleapis.com/v1beta";

/**
 * Google AI Studio / Gemini API provider.
 * Docs: https://ai.google.dev/api
 *
 * Real network calls — no mocked responses (spec section 38). Requires a
 * valid Google AI Studio key, which the renderer obtained via secure IPC.
 */
export class GoogleProvider implements AIProvider {
  readonly name = "google" as const;
  private usage: UsageInfo = { requestsThisSession: 0, lastStatus: "unknown" };

  async validateKey(apiKey: string) {
    try {
      const res = await fetch(`${BASE}/models?key=${encodeURIComponent(apiKey)}`);
      if (!res.ok) return { valid: false, reason: `HTTP ${res.status}` };
      return { valid: true };
    } catch (err) {
      return { valid: false, reason: (err as Error).message };
    }
  }

  async listModels(apiKey: string): Promise<ModelInfo[]> {
    const res = await fetch(`${BASE}/models?key=${encodeURIComponent(apiKey)}`);
    if (!res.ok) throw new Error(`Google listModels failed: HTTP ${res.status}`);
    const data = await res.json();
    const models: ModelInfo[] = (data.models || [])
      .filter((m: any) => (m.supportedGenerationMethods || []).includes("generateContent"))
      .map((m: any) => ({
        id: m.name.replace("models/", ""),
        label: m.displayName || m.name,
        provider: "google" as const,
        contextWindow: m.inputTokenLimit,
        vision: /vision|flash|pro/.test(m.name), // Gemini multimodal models generally accept images
      }));
    return models;
  }

  private toGeminiContents(messages: SendOptions["messages"]) {
    // Gemini has no "system" role in contents; fold system messages into the
    // first user turn as a prefix instead.
    const systemParts = messages.filter((m) => m.role === "system").map((m) => m.content);
    const rest = messages.filter((m) => m.role !== "system");
    const contents = rest.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));
    if (systemParts.length && contents.length) {
      contents[0].parts[0].text = `${systemParts.join("\n")}\n\n${contents[0].parts[0].text}`;
    }
    return contents;
  }

  async sendMessage(opts: SendOptions): Promise<string> {
    const url = `${BASE}/models/${opts.modelId}:generateContent?key=${encodeURIComponent(opts.apiKey)}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: opts.signal,
      body: JSON.stringify({
        contents: this.toGeminiContents(opts.messages),
        generationConfig: {
          temperature: opts.temperature ?? 0.7,
          maxOutputTokens: opts.maxTokens ?? 4096,
        },
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
    return data.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join("") ?? "";
  }

  async streamMessage(opts: SendOptions, onChunk: (c: StreamChunk) => void): Promise<void> {
    const url = `${BASE}/models/${opts.modelId}:streamGenerateContent?alt=sse&key=${encodeURIComponent(
      opts.apiKey
    )}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: opts.signal,
      body: JSON.stringify({
        contents: this.toGeminiContents(opts.messages),
        generationConfig: {
          temperature: opts.temperature ?? 0.7,
          maxOutputTokens: opts.maxTokens ?? 4096,
        },
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
        if (!line.startsWith("data:")) continue;
        const jsonStr = line.slice(5).trim();
        if (!jsonStr) continue;
        try {
          const parsed = JSON.parse(jsonStr);
          const text = parsed.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join("") ?? "";
          if (text) onChunk({ delta: text, done: false });
        } catch {
          /* partial JSON line, wait for more data */
        }
      }
    }
    onChunk({ delta: "", done: true });
  }

  getUsage() {
    return this.usage;
  }
}
