/**
 * JSON Schema of one tool argument, the subset the game tools use.
 */
export interface IToolArgumentSchema {
  type: "string" | "integer" | "boolean";
  description: string;
  enum?: ReadonlyArray<string>;
  default?: string | number | boolean;
  minimum?: number;
  maximum?: number;
  minLength?: number;
}

/**
 * JSON Schema of a tool's arguments, as MCP clients receive it.
 */
export interface IToolInputSchema {
  type: "object";
  properties: Record<string, IToolArgumentSchema>;
  required?: ReadonlyArray<string>;
  additionalProperties: false;
}

/**
 * One item of a tool result.
 */
export type TToolContent = { type: "text"; text: string } | { type: "image"; data: string; mimeType: string };

/**
 * Result of a tool call; a failed tool answers `isError` instead of a protocol error.
 */
export interface IToolResult {
  content: Array<TToolContent>;
  isError?: boolean;
}

/**
 * Tool an MCP client can call, with its arguments checked and defaulted before `call` runs.
 */
export interface IMcpTool {
  name: string;
  description: string;
  inputSchema: IToolInputSchema;
  call: (args: Record<string, unknown>) => Promise<IToolResult>;
}
