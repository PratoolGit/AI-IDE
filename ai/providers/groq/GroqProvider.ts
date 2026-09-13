import { OpenAICompatibleProvider } from "../shared/OpenAICompatibleProvider";
import type { ModelInfo, ProviderName } from "../../core/types";

/**
 * Groq Console API. OpenAI-compatible chat completions, notably fast
 * inference — good default for the "Fast" model profile (spec section 23).
 * Docs: https://console.groq.com/docs
 */
export class GroqProvider extends OpenAICompatibleProvider {
  readonly name: ProviderName = "groq";
  protected baseUrl = "https://api.groq.com/openai/v1";

  protected fallbackModels: ModelInfo[] = [
    { id: "openai/gpt-oss-120b", label: "GPT-OSS 120B", provider: "groq", speedTier: "fast" },
    { id: "qwen/qwen3-32b", label: "Qwen3 32B", provider: "groq", speedTier: "fast" },
    { id: "llama-3.3-70b-versatile", label: "Llama 3.3 70B", provider: "groq", speedTier: "balanced" },
  ];
}
