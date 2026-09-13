export interface ContextItem {
  id: string;
  kind: "file" | "selection" | "upload" | "project-structure";
  label: string;
  path?: string;
  content: string; // truncated preview for large items — full content read lazily on send
}

const NEVER_AUTO_INCLUDE = [/\.env(\..*)?$/, /\.pem$/, /id_rsa/, /secrets?\./i];

/**
 * Explicit-selection context model (spec section 5/19/35): nothing is added
 * to the AI's context automatically except the current file. Everything
 * else — folders, other files, uploads — is opt-in and shown as removable
 * chips in the chat panel.
 */
export class ContextManager {
  private items = new Map<string, ContextItem>();

  add(item: ContextItem) {
    if (NEVER_AUTO_INCLUDE.some((re) => re.test(item.path ?? item.label))) {
      throw new Error(`Refusing to add "${item.label}" to AI context (looks like a secret file).`);
    }
    this.items.set(item.id, item);
  }

  remove(id: string) {
    this.items.delete(id);
  }

  list(): ContextItem[] {
    return [...this.items.values()];
  }

  /** Builds the system-prefix block sent alongside the user's message. */
  toPromptBlock(): string {
    if (this.items.size === 0) return "";
    const parts = this.list().map((i) => `--- ${i.label} ---\n${i.content}`);
    return `Project context provided by the user:\n\n${parts.join("\n\n")}`;
  }
}
