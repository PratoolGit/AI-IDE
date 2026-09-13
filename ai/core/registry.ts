import type { AIProvider, ProviderName } from "./types";
import { GoogleProvider } from "../providers/google/GoogleProvider";
import { NvidiaProvider } from "../providers/nvidia/NvidiaProvider";
import { GroqProvider } from "../providers/groq/GroqProvider";

/**
 * Single lookup point for provider instances. Adding a 4th provider later
 * means: implement AIProvider, register it here, add its key-management UI.
 * Nothing else in the app changes (spec section 6 + 36).
 */
const providers: Record<ProviderName, AIProvider> = {
  google: new GoogleProvider(),
  nvidia: new NvidiaProvider(),
  groq: new GroqProvider(),
};

export function getProvider(name: ProviderName): AIProvider {
  return providers[name];
}

export function allProviders(): AIProvider[] {
  return Object.values(providers);
}
