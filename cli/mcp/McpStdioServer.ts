import type { Readable, Writable } from "node:stream";

import { IMcpTool, IToolResult } from "#/mcp/mcp_tool_types";
import { readToolArguments } from "#/mcp/tool_arguments";
import { Nullable, Optional } from "#/utils/types";

/**
 * MCP protocol versions the server speaks, the latest first; a client asking for another one gets the latest.
 */
export const MCP_PROTOCOL_VERSIONS: ReadonlyArray<string> = [
  "2025-11-25",
  "2025-06-18",
  "2025-03-26",
  "2024-11-05",
  "2024-10-07",
];

/**
 * JSON-RPC error codes the server answers with.
 */
export enum EJsonRpcError {
  PARSE_ERROR = -32700,
  INVALID_REQUEST = -32600,
  METHOD_NOT_FOUND = -32601,
  INVALID_PARAMS = -32602,
}

/**
 * Id a JSON-RPC request carries, echoed by its response.
 */
export type TJsonRpcId = string | number;

/**
 * JSON-RPC response the server writes.
 */
export interface IJsonRpcResponse {
  jsonrpc: "2.0";
  id: Nullable<TJsonRpcId>;
  result?: unknown;
  error?: { code: EJsonRpcError; message: string };
}

/**
 * Name and version the server introduces itself with.
 */
export interface IMcpServerInfo {
  name: string;
  version: string;
}

/**
 * MCP server over stdio for a fixed set of tools: newline-delimited JSON-RPC 2.0, answering `initialize`, `ping`,
 * `tools/list` and `tools/call`, and ignoring notifications.
 */
export class McpStdioServer {
  public readonly info: IMcpServerInfo;
  public readonly tools: Map<string, IMcpTool>;
  // How to use the tools, which clients show the model beside them.
  public readonly instructions: Nullable<string>;

  public constructor(info: IMcpServerInfo, tools: ReadonlyArray<IMcpTool>, instructions: Nullable<string> = null) {
    this.info = info;
    this.tools = new Map(tools.map((tool) => [tool.name, tool]));
    this.instructions = instructions;
  }

  /**
   * Answer messages from the input until it ends, a line each way.
   *
   * @param input - Stream the client writes to, usually stdin.
   * @param output - Stream the client reads, usually stdout.
   * @returns Promise resolved once the input ends.
   */
  public serve(input: Readable, output: Writable): Promise<void> {
    return new Promise((resolve) => {
      let pending: string = "";

      input.setEncoding("utf8");
      input.on("data", (chunk: string) => {
        pending += chunk;

        for (let index: number = pending.indexOf("\n"); index >= 0; index = pending.indexOf("\n")) {
          const line: string = pending.slice(0, index).trim();

          pending = pending.slice(index + 1);

          if (line) {
            // Requests run concurrently, so a slow tool call does not hold back a ping.
            void this.handleLine(line).then((response) => {
              if (response) {
                output.write(JSON.stringify(response) + "\n");
              }
            });
          }
        }
      });
      input.once("end", () => resolve());
    });
  }

  /**
   * @param line - One message as the client wrote it.
   * @returns Response to write, or null for a notification.
   */
  public async handleLine(line: string): Promise<Nullable<IJsonRpcResponse>> {
    let message: unknown;

    try {
      message = JSON.parse(line);
    } catch {
      return this.fail(null, EJsonRpcError.PARSE_ERROR, "Parse error.");
    }

    return this.handle(message);
  }

  /**
   * @param message - Parsed JSON-RPC message.
   * @returns Response to write, or null for a notification.
   */
  public async handle(message: unknown): Promise<Nullable<IJsonRpcResponse>> {
    if (typeof message !== "object" || message === null || Array.isArray(message)) {
      return this.fail(null, EJsonRpcError.INVALID_REQUEST, "Expected a JSON-RPC message object.");
    }

    const { id, method, params } = message as { id?: Nullable<TJsonRpcId>; method?: unknown; params?: unknown };

    if (id === undefined) {
      return null;
    }

    if (typeof method !== "string") {
      return this.fail(id, EJsonRpcError.INVALID_REQUEST, "Expected a method name.");
    }

    const parameters: Record<string, unknown> =
      typeof params === "object" && params !== null ? (params as Record<string, unknown>) : {};

    switch (method) {
      case "initialize":
        return this.succeed(id, {
          protocolVersion: MCP_PROTOCOL_VERSIONS.includes(parameters.protocolVersion as string)
            ? parameters.protocolVersion
            : MCP_PROTOCOL_VERSIONS[0],
          capabilities: { tools: {} },
          serverInfo: this.info,
          ...(this.instructions ? { instructions: this.instructions } : {}),
        });

      case "ping":
        return this.succeed(id, {});

      case "tools/list":
        return this.succeed(id, {
          tools: [...this.tools.values()].map(({ name, description, inputSchema }) => ({
            name,
            description,
            inputSchema,
          })),
        });

      case "tools/call":
        return this.callTool(id, parameters);

      default:
        return this.fail(id, EJsonRpcError.METHOD_NOT_FOUND, `Method '${method}' not found.`);
    }
  }

  /**
   * @param id - Request id.
   * @param parameters - `tools/call` parameters.
   * @returns Tool result, a failed one for bad arguments or a thrown error, or an error for an unknown tool.
   */
  protected async callTool(id: Nullable<TJsonRpcId>, parameters: Record<string, unknown>): Promise<IJsonRpcResponse> {
    const tool: Optional<IMcpTool> = this.tools.get(parameters.name as string);

    if (!tool) {
      return this.fail(id, EJsonRpcError.INVALID_PARAMS, `Unknown tool '${String(parameters.name)}'.`);
    }

    let result: IToolResult;

    try {
      result = await tool.call(readToolArguments(tool.inputSchema, parameters.arguments));
    } catch (error) {
      result = {
        content: [{ type: "text", text: error instanceof Error ? error.message : String(error) }],
        isError: true,
      };
    }

    return this.succeed(id, result);
  }

  protected succeed(id: Nullable<TJsonRpcId>, result: unknown): IJsonRpcResponse {
    return { jsonrpc: "2.0", id, result };
  }

  protected fail(id: Nullable<TJsonRpcId>, code: EJsonRpcError, message: string): IJsonRpcResponse {
    return { jsonrpc: "2.0", id, error: { code, message } };
  }
}
