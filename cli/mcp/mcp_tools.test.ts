import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";

import { IToolResult } from "#/mcp/mcp_tool_types";
import { createGameTools, findFlow, IGameToolsContext, waitForScreenshot } from "#/mcp/mcp_tools";
import { McpPipeClient } from "#/mcp/McpPipeClient";
import { IJsonRpcResponse, McpStdioServer } from "#/mcp/McpStdioServer";
import { EGameDifficulty } from "#/start/start_game";
import { Nullable } from "#/utils/types";

type TCallTool = (name: string, args?: Record<string, unknown>) => Promise<IToolResult>;

/**
 * @returns Tools served the way clients call them, and the context they were given.
 */
function setup(): {
  call: TCallTool;
  client: jest.Mocked<McpPipeClient>;
  context: IGameToolsContext;
  directory: string;
} {
  const directory: string = fs.mkdtempSync(path.join(os.tmpdir(), "xrf-mcp-tools-"));
  const client = {
    session: null,
    isConnected: jest.fn(() => false),
    request: jest.fn(async () => ({ id: "1", ok: true, result: { level: "zaton" } })),
    waitForReady: jest.fn(async () => ({ event: "ready", session: "session-1", level: "zaton" })),
    waitForClose: jest.fn(async () => true),
  } as unknown as jest.Mocked<McpPipeClient>;
  const context: IGameToolsContext = {
    client,
    startGame: jest.fn(async () => {}),
    isGameRunning: jest.fn(async () => false),
    isEndpointBuilt: () => true,
    getPaths: async () => ({ logs: directory, screenshots: directory }),
    getEngineLogPath: async () => path.join(directory, "openxray_test.log"),
    getTextEncoding: async () => "windows-1251",
    keepScreenshot: jest.fn((file: string) => `${file}.kept`),
    scaleScreenshot: jest.fn(async () => Buffer.from([0xff, 0xd8, 0xff])),
  };
  const server: McpStdioServer = new McpStdioServer({ name: "test", version: "0" }, createGameTools(context));

  /**
   * Call a tool as a client does, through the server that checks and defaults its arguments.
   */
  async function call(name: string, args: Record<string, unknown> = {}): Promise<IToolResult> {
    const response: Nullable<IJsonRpcResponse> = await server.handle({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: { name, arguments: args },
    });

    return response?.result as IToolResult;
  }

  return { call, client, context, directory };
}

/**
 * @param result - Tool result.
 * @returns Text of its first content item.
 */
function textOf(result: IToolResult): string {
  return (result.content[0] as { text: string }).text;
}

describe("game MCP tools", () => {
  let directories: Array<string> = [];

  beforeEach(() => {
    directories = [];
  });

  afterEach(() => {
    directories.forEach((it) => fs.rmSync(it, { recursive: true, force: true }));
  });

  it("should create every game tool", () => {
    const { context, directory } = setup();

    directories.push(directory);

    expect(
      createGameTools(context)
        .map((it) => it.name)
        .sort()
    ).toEqual([
      "game_console",
      "game_flow",
      "game_log",
      "game_lua",
      "game_quit",
      "game_screenshot",
      "game_start",
      "game_status",
      "game_wait_ready",
    ]);
  });

  it("should answer with the game result as JSON, and with its error as a failure", async () => {
    const { call, client, directory } = setup();

    directories.push(directory);

    expect(JSON.parse(textOf(await call("game_status")))).toEqual({ level: "zaton" });

    client.request.mockResolvedValueOnce({ id: "2", ok: false, error: "mcp:1: attempt to call nil" });

    const failed: IToolResult = await call("game_lua", { code: "x()", timeoutSeconds: 5 });

    expect(failed.isError).toBe(true);
    expect(textOf(failed)).toBe("mcp:1: attempt to call nil");
    expect(client.request).toHaveBeenLastCalledWith("lua", { code: "x()" }, 5000);

    await call("game_lua", { code: "1" });

    expect(client.request).toHaveBeenLastCalledWith("lua", { code: "1" }, 30_000);
  });

  it("should turn a thrown error and bad arguments into failed results", async () => {
    const { call, client, directory } = setup();

    directories.push(directory);
    client.request.mockRejectedValueOnce(new Error("No game is listening; start one with game_start."));

    const result: IToolResult = await call("game_console", { command: "quit" });

    expect(result.isError).toBe(true);
    expect(textOf(result)).toContain("No game is listening");

    expect(textOf(await call("game_console", {}))).toBe("Invalid arguments: 'command' is required.");
    expect(textOf(await call("game_log", { file: "other" }))).toContain("'file' must be one of engine, lua, checks");
  });

  it("should start an armed game and wait for its level", async () => {
    const { call, context, client, directory } = setup();

    directories.push(directory);

    const result: IToolResult = await call("game_start", { difficulty: EGameDifficulty.VETERAN, timeoutSeconds: 120 });

    expect(context.startGame).toHaveBeenCalledWith({
      new: true,
      load: undefined,
      difficulty: EGameDifficulty.VETERAN,
      flushlog: true,
      mcp: true,
    });
    expect(client.waitForReady).toHaveBeenCalledWith(120_000, null);
    expect(client.textEncoding).toBe("windows-1251");
    expect(JSON.parse(textOf(result)).session).toBe("session-1");
  });

  it("should refuse to start a game without the endpoint, beside a running one, or a load without a save", async () => {
    const { call, context, client, directory } = setup();

    directories.push(directory);

    context.isEndpointBuilt = () => false;
    expect(textOf(await call("game_start"))).toContain("mcp build");

    context.isEndpointBuilt = () => true;
    client.isConnected.mockReturnValueOnce(true);
    expect(textOf(await call("game_start"))).toContain("already connected");

    jest.mocked(context.isGameRunning).mockResolvedValueOnce(true);
    expect(textOf(await call("game_start"))).toContain("already running without this session connected");

    expect(textOf(await call("game_start", { mode: "load" }))).toContain("needs a save");
    expect(context.startGame).not.toHaveBeenCalled();
  });

  it("should run a flow by any of its names and list flows for an unknown one", async () => {
    const { call, client, directory } = setup();

    directories.push(directory);

    const flow = findFlow("quests_zat_b14");

    expect(flow).not.toBeNull();
    expect(findFlow("quests/zat_b14.flow.ts")).toEqual(flow);
    expect(findFlow("flow_quests_zat_b14")).toEqual(flow);

    await call("game_flow", { name: "quests_zat_b14" });

    expect(client.request).toHaveBeenCalledWith(
      "flow",
      { module: flow?.module, identity: "quests_zat_b14" },
      expect.any(Number)
    );

    const unknown: IToolResult = await call("game_flow", { name: "nope" });

    expect(unknown.isError).toBe(true);
    expect(textOf(unknown)).toContain("quests_zat_b14");
  });

  it("should keep the screenshot the game wrote after the request and return it scaled", async () => {
    const { call, client, context, directory } = setup();
    const file: string = path.join(directory, "ss_test_01-01-26_00-00-00_(zaton).jpg");

    directories.push(directory);
    client.request.mockImplementationOnce(async () => {
      fs.writeFileSync(file, Buffer.from([0xff, 0xd8, 0xff, 0xe0]));

      return { id: "3", ok: true, result: { queued: true } };
    });

    const result: IToolResult = await call("game_screenshot");

    expect(context.keepScreenshot).toHaveBeenCalledWith(file);
    expect(context.scaleScreenshot).toHaveBeenCalledWith(`${file}.kept`, 1600);
    expect(result.content).toEqual([
      { type: "image", data: "/9j/", mimeType: "image/jpeg" },
      { type: "text", text: `${file}.kept` },
    ]);
  });

  it("should ignore screenshots older than the request", async () => {
    const directory: string = fs.mkdtempSync(path.join(os.tmpdir(), "xrf-mcp-shots-"));
    const old: string = path.join(directory, "ss_old.jpg");

    directories.push(directory);
    fs.writeFileSync(old, "");
    fs.utimesSync(old, new Date(2020, 1, 1), new Date(2020, 1, 1));

    expect(await waitForScreenshot(directory, Date.now(), 300)).toBeNull();
  });

  it("should read the last lines of each log", async () => {
    const { call, directory } = setup();

    directories.push(directory);
    fs.writeFileSync(
      path.join(directory, "openxray_test.log"),
      Buffer.concat([Buffer.from("one\ntwo\nthree "), Buffer.from([0xc0, 0xe2, 0xe3]), Buffer.from("\n")])
    );
    fs.writeFileSync(path.join(directory, "xrf_lua.log"), "lua line\n");

    expect(textOf(await call("game_log", { lines: 2 }))).toContain("three Авг");
    expect(textOf(await call("game_log", { lines: 2 }))).not.toContain("one");
    expect(textOf(await call("game_log", { file: "lua" }))).toContain("lua line");
    expect((await call("game_log", { file: "checks" })).isError).toBe(true);
  });

  it("should quit the game and wait until its connection and process are gone", async () => {
    const { call, client, context, directory } = setup();

    directories.push(directory);
    jest.mocked(context.isGameRunning).mockResolvedValueOnce(true).mockResolvedValueOnce(false);

    expect(textOf(await call("game_quit"))).toBe("The game quit.");
    expect(client.request).toHaveBeenCalledWith("quit");
    expect(client.waitForClose).toHaveBeenCalled();
    expect(context.isGameRunning).toHaveBeenCalledTimes(2);

    client.waitForClose.mockResolvedValueOnce(false);

    expect(textOf(await call("game_quit"))).toBe("The game did not close its connection in time.");
  });
});
