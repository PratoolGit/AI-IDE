import { OpenAICompatibleProvider } from "../shared/OpenAICompatibleProvider";
import type { ModelInfo, ProviderName } from "../../core/types";

/**
 * NVIDIA NIM / build.nvidia.com API. OpenAI-compatible chat completions.
 * Docs: https://docs.nvidia.com/nim/
 */
export class NvidiaProvider extends OpenAICompatibleProvider {
  readonly name: ProviderName = "nvidia";
  protected baseUrl = "https://integrate.api.nvidia.com/v1";

  // Fallback/curated list — the live /models call in the base class will
  // override or extend this with whatever NVIDIA currently hosts, per spec
  // section 8 ("do not assume model names will remain constant").
  protected fallbackModels: ModelInfo[] = [
    { id: "deepseek-ai/deepseek-r1", label: "DeepSeek R1", provider: "nvidia", speedTier: "strong" },
    { id: "moonshotai/kimi-k2-instruct", label: "Kimi K2", provider: "nvidia", speedTier: "balanced" },
    { id: "nvidia/llama-3.1-nemotron-70b-instruct", label: "Nemotron 70B", provider: "nvidia", speedTier: "balanced" },
  ];
}
