import type { ChatMessage } from "../core/types";
import type { ToolCall, ToolResult } from "../tools/types";
import { DANGEROUS_TOOLS } from "../tools/types";

/**
 * Autonomous AGENT mode (spec section 4/13/18/25): read → plan → call tools
 * → observe results → iterate, with a permission gate on dangerous ops.
 *
 * STATUS: structural scaffold only — the actual tool-call parsing depends on
 * which provider's function-calling format you standardize on (Gemini
 * function-calling, or an OpenAI-style tools[] array for NVIDIA/Groq), and
 * the executor needs to be wired to the renderer's window.ide.fs / terminal
 * bridge. Per the spec's own rule 38 ("don't fake functionality"), this is
 * intentionally left as a real interface with TODOs rather than a canned
 * response loop — see the two-approach comparison in the chat reply for why
 * this is the highest-risk piece to get right, and which of the two
 * implementation paths to pick.
 */
export interface AgentDeps {
  runTool: (call: ToolCall) => Promise<ToolResult>;
  requestPermission: (call: ToolCall) => Promise<boolean>;
  sendToModel: (messages: ChatMessage[]) => Promise<{ text: string; toolCalls: ToolCall[] }>;
  onStep: (event: { type: "thought" | "tool_call" | "tool_result" | "done"; detail: string }) => void;
  maxIterations?: number;
}

export async function runAgentLoop(initialMessages: ChatMessage[], deps: AgentDeps): Promise<void> {
  const messages = [...initialMessages];
  const maxIterations = deps.maxIterations ?? 12;

  for (let i = 0; i < maxIterations; i++) {
    // TODO: replace with a real provider call using each provider's native
    // tool/function-calling schema (see comparison in chat reply: "native
    // function-calling" vs "structured-text protocol").
    const { text, toolCalls } = await deps.sendToModel(messages);
    if (text) deps.onStep({ type: "thought", detail: text });
    messages.push({ role: "assistant", content: text });

    if (toolCalls.length === 0) {
      deps.onStep({ type: "done", detail: "Agent finished — no further tool calls." });
      return;
    }

    for (const call of toolCalls) {
      if (DANGEROUS_TOOLS.includes(call.name)) {
        const allowed = await deps.requestPermission(call);
        if (!allowed) {
          messages.push({
            role: "user",
            content: `Tool call ${call.name} was denied by the user. Choose a different approach.`,
          });
          continue;
        }
      }
      deps.onStep({ type: "tool_call", detail: `${call.name}(${JSON.stringify(call.args)})` });
      const result = await deps.runTool(call);
      deps.onStep({ type: "tool_result", detail: result.output.slice(0, 500) });
      messages.push({
        role: "user",
        content: `Tool result for ${result.name} (ok=${result.ok}): ${result.output}`,
      });
    }
  }
  deps.onStep({ type: "done", detail: "Reached max iterations without natural completion." });
}
