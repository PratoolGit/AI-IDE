export type ToolName =
  | "read_file"
  | "create_file"
  | "edit_file"
  | "delete_file"
  | "rename_file"
  | "search_files"
  | "search_text"
  | "run_command";

export interface ToolCall {
  name: ToolName;
  args: Record<string, unknown>;
}

export interface ToolResult {
  name: ToolName;
  ok: boolean;
  output: string;
}

/** Operations that require explicit user permission before running (spec section 13/31). */
export const DANGEROUS_TOOLS: ToolName[] = ["delete_file", "run_command"];
