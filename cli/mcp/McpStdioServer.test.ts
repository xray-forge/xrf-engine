import { PassThrough } from "node:stream";

import { describe, expect, it, jest } from "@jest/globals";

import { IMcpTool } from "#/mcp/mcp_tool_types";
import { EJsonRpcError, MCP_PROTOCOL_VERSIONS, McpStdioServer } from "#/mcp/McpStdioServer";

/**
 * @returns Server with one echoing tool, and the tool.
 */
function setup(): { server: McpStdioServer; tool: IMcpTool } {
  const tool: IMcpTool = {
    name: "echo",
    description: "Echo the text.",
    inputSchema: {
      type: "object",
      properties: {
        text: { type: "string", minLength: 1, description: "Text to echo." },
        times: { type: "integer", minimum: 1, maximum: 3, default: 1, description: "How many times." },
      },
      required: ["text"],
      additionalProperties: false,
    },
    call: jest.fn(async ({ text, times }: Record<string, unknown>) => ({
      content: [{ type: "text" as const, text: String(text).repeat(times as number) }],
    })),
  };

  return { server: new McpStdioServer({ name: "test", version: "1.0.0" }, [tool]), tool };
}

describe("McpStdioServer", () => {
  it("should negotiate the protocol version the client asks for when it speaks it", async () => {
    const { server } = setup();

    expect(
      await server.handle({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18" } })
    ).toEqual({
      jsonrpc: "2.0",
      id: 1,
      result: {
        protocolVersion: "2025-06-18",
        capabilities: { tools: {} },
        serverInfo: { name: "test", version: "1.0.0" },
      },
    });

    expect(
      await server.handle({ jsonrpc: "2.0", id: 2, method: "initialize", params: { protocolVersion: "2099-01-01" } })
    ).toMatchObject({ result: { protocolVersion: MCP_PROTOCOL_VERSIONS[0] } });
  });

  it("should introduce itself with instructions when given some", async () => {
    const instructed: McpStdioServer = new McpStdioServer({ name: "test", version: "1.0.0" }, [], "Start first.");

    expect(await instructed.handle({ jsonrpc: "2.0", id: 1, method: "initialize", params: {} })).toMatchObject({
      result: { instructions: "Start first." },
    });
  });

  it("should answer pings, list tools and ignore notifications", async () => {
    const { server, tool } = setup();

    expect(await server.handle({ jsonrpc: "2.0", id: "a", method: "ping" })).toEqual({
      jsonrpc: "2.0",
      id: "a",
      result: {},
    });
    expect(await server.handle({ jsonrpc: "2.0", id: 3, method: "tools/list" })).toEqual({
      jsonrpc: "2.0",
      id: 3,
      result: { tools: [{ name: "echo", description: "Echo the text.", inputSchema: tool.inputSchema }] },
    });
    expect(await server.handle({ jsonrpc: "2.0", method: "notifications/initialized" })).toBeNull();
  });

  it("should call a tool with defaults applied, and fail bad arguments and throwing tools as tool results", async () => {
    const { server, tool } = setup();

    expect(
      await server.handle({
        jsonrpc: "2.0",
        id: 4,
        method: "tools/call",
        params: { name: "echo", arguments: { text: "a" } },
      })
    ).toEqual({ jsonrpc: "2.0", id: 4, result: { content: [{ type: "text", text: "a" }] } });
    expect(tool.call).toHaveBeenCalledWith({ text: "a", times: 1 });

    expect(
      await server.handle({
        jsonrpc: "2.0",
        id: 5,
        method: "tools/call",
        params: { name: "echo", arguments: { times: 9, other: true } },
      })
    ).toEqual({
      jsonrpc: "2.0",
      id: 5,
      result: {
        content: [
          {
            type: "text",
            text: "Invalid arguments: 'other' is not an argument; 'text' is required; 'times' must be from 1 to 3.",
          },
        ],
        isError: true,
      },
    });

    jest.mocked(tool.call).mockRejectedValueOnce(new Error("broken"));

    expect(
      await server.handle({
        jsonrpc: "2.0",
        id: 6,
        method: "tools/call",
        params: { name: "echo", arguments: { text: "a" } },
      })
    ).toEqual({ jsonrpc: "2.0", id: 6, result: { content: [{ type: "text", text: "broken" }], isError: true } });
  });

  it("should answer protocol errors for unknown tools and methods, bad messages and unparsable lines", async () => {
    const { server } = setup();

    expect(await server.handle({ jsonrpc: "2.0", id: 7, method: "tools/call", params: { name: "nope" } })).toEqual({
      jsonrpc: "2.0",
      id: 7,
      error: { code: EJsonRpcError.INVALID_PARAMS, message: "Unknown tool 'nope'." },
    });
    expect(await server.handle({ jsonrpc: "2.0", id: 8, method: "resources/list" })).toMatchObject({
      error: { code: EJsonRpcError.METHOD_NOT_FOUND },
    });
    expect(await server.handle({ jsonrpc: "2.0", id: 9 })).toMatchObject({
      id: 9,
      error: { code: EJsonRpcError.INVALID_REQUEST },
    });
    expect(await server.handle([])).toMatchObject({ id: null, error: { code: EJsonRpcError.INVALID_REQUEST } });
    expect(await server.handleLine("{not json")).toEqual({
      jsonrpc: "2.0",
      id: null,
      error: { code: EJsonRpcError.PARSE_ERROR, message: "Parse error." },
    });
  });

  it("should serve newline-delimited messages from a stream until it ends", async () => {
    const { server } = setup();
    const input: PassThrough = new PassThrough();
    const output: PassThrough = new PassThrough();
    const written: Array<string> = [];

    output.setEncoding("utf8");
    output.on("data", (chunk: string) => written.push(chunk));

    const served: Promise<void> = server.serve(input, output);

    input.write('{"jsonrpc":"2.0","id":1,"method":"ping"}\n{"jsonrpc":"2.0","method":"notifications/initialized"}\n');
    input.write('{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"echo",');
    input.end('"arguments":{"text":"b","times":2}}}\n');

    await served;
    await new Promise((resolve) => setImmediate(resolve));

    expect(
      written
        .join("")
        .trim()
        .split("\n")
        .map((line) => JSON.parse(line))
    ).toEqual([
      { jsonrpc: "2.0", id: 1, result: {} },
      { jsonrpc: "2.0", id: 2, result: { content: [{ type: "text", text: "bb" }] } },
    ]);
  });
});
