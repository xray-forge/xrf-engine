import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";

import { TARGET_GAME_DATA_DIR } from "#/globals/paths";
import { IDialogInspectReport, IDialogListReport } from "#/mcp/dialogs/dialog_cli_types";
import { IToolResult } from "#/mcp/mcp_tool_types";
import { createGameTools, IGameToolsContext } from "#/mcp/mcp_tools";
import { McpPipeClient } from "#/mcp/McpPipeClient";
import { IJsonRpcResponse, McpStdioServer } from "#/mcp/McpStdioServer";
import { findFlow } from "#/mcp/tools/game_tools";
import { waitForScreenshot } from "#/mcp/tools/screenshot_tools";
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
    workspace: {
      dumps: path.join(directory, "dumps"),
      saves: path.join(directory, "saves"),
      probes: path.join(directory, "probes"),
      crashes: path.join(directory, "crashes"),
    },
    startGame: jest.fn(async () => {}),
    isGameRunning: jest.fn(async () => false),
    isEndpointBuilt: () => true,
    getPaths: async () => ({
      logs: directory,
      reports: path.join(directory, "reports"),
      screenshots: directory,
      savedgames: path.join(directory, "saves_game"),
    }),
    getEngineLogPath: async () => path.join(directory, "openxray_test.log"),
    getTextEncoding: async () => "windows-1251",
    keepScreenshot: jest.fn((file: string) => `${file}.kept`),
    scaleScreenshot: jest.fn(async () => Buffer.from([0xff, 0xd8, 0xff])),
    runXrfCli: jest.fn(async () => ({ exitCode: 0, error: null, result: null })),
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
    jest.useRealTimers();
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
      "game_dialog",
      "game_dump",
      "game_errors",
      "game_flow",
      "game_load",
      "game_log",
      "game_lua",
      "game_quit",
      "game_save",
      "game_saves",
      "game_screenshot",
      "game_start",
      "game_status",
      "game_wait",
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
    expect(client.waitForReady).toHaveBeenCalledWith(120_000, null, expect.any(AbortSignal));
    expect(client.textEncoding).toBe("windows-1251");
    expect(JSON.parse(textOf(result)).session).toBe("session-1");
    expect(result.content).toHaveLength(1);
  });

  it("should keep the logs of a crashed run before starting the next one", async () => {
    const { call, context, directory } = setup();

    directories.push(directory);
    fs.writeFileSync(
      path.join(directory, "openxray_test.log"),
      "Loading...\nFATAL ERROR\n[error] Expression : false\n"
    );

    const result: IToolResult = await call("game_start", { timeoutSeconds: 60 });
    const kept: Array<string> = fs.readdirSync(context.workspace.crashes);

    expect(kept).toHaveLength(1);
    expect(fs.existsSync(path.join(context.workspace.crashes, kept[0], "openxray_test.log"))).toBe(true);
    expect((result.content[1] as { text: string }).text).toContain(path.join(context.workspace.crashes, kept[0]));

    expect((await call("game_start", { timeoutSeconds: 60 })).content).toHaveLength(1);
  });

  it("should stop waiting and show the engine error when the game process exits before it greets", async () => {
    const { call, client, context, directory } = setup();

    directories.push(directory);
    fs.writeFileSync(
      path.join(directory, "openxray_test.log"),
      "Loading objects...\nFATAL ERROR\n[error] Description   : Saved game doesn't correspond to the spawn\n"
    );
    jest
      .mocked(context.isGameRunning)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true)
      .mockResolvedValue(false);
    client.waitForReady.mockImplementationOnce(
      (_timeout, _session, signal) =>
        new Promise((_, reject) =>
          signal?.addEventListener("abort", () => reject(new Error("Stopped waiting for the game.")))
        )
    );

    const result: IToolResult = await call("game_start", { timeoutSeconds: 60 });

    expect(result.isError).toBe(true);
    expect(textOf(result)).toContain("The game process exited before it greeted");
    expect(textOf(result)).toContain("FATAL ERROR\n[error] Description   : Saved game doesn't correspond to the spawn");
    expect(textOf(result)).not.toContain("Loading objects");
  }, 10_000);

  it("should refuse to start a game without the endpoint, beside a running one, or with a mode its save contradicts", async () => {
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
    expect(textOf(await call("game_start", { mode: "new", save: "mcp_bar" }))).toContain("takes no save");
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

  it("should run a probe file from the workspace, needing either code or a file", async () => {
    const { call, client, context, directory } = setup();

    directories.push(directory);
    fs.mkdirSync(context.workspace.probes, { recursive: true });
    fs.writeFileSync(path.join(context.workspace.probes, "probe.lua"), "return level.name()");

    await call("game_lua", { file: "probe.lua" });

    expect(client.request).toHaveBeenLastCalledWith("lua", { code: "return level.name()" }, 30_000);
    expect(textOf(await call("game_lua", { code: "1", file: "probe.lua" }))).toBe("Pass either 'code' or 'file'.");
    expect(textOf(await call("game_lua", { file: "missing.lua" }))).toContain("No probe at");
  });

  it("should filter log lines by a pattern and summarize log problems", async () => {
    const { call, directory } = setup();

    directories.push(directory);
    fs.writeFileSync(
      path.join(directory, "openxray_test.log"),
      [
        "Starting engine...",
        "[LUA]  [1][ReleaseBodyManager][info] Register corpse object: bandit, 1/15",
        "! SV:ge_destroy: [11222] not found on server",
        "! SV:ge_destroy: [13421] not found on server",
        "[LUA]  [2][ReleaseBodyManager][info] Register corpse object: stalker, 2/15",
      ].join("\n")
    );

    expect(textOf(await call("game_log", { match: "register corpse", lines: 1 }))).toBe(
      "5: [LUA]  [2][ReleaseBodyManager][info] Register corpse object: stalker, 2/15"
    );
    expect(textOf(await call("game_log", { match: "nothing like it" }))).toBe("No engine log line matches.");
    expect(textOf(await call("game_errors"))).toBe(
      "engine log: 2 problem lines in 1 kinds.\n- 2x (first at line 3) ! SV:ge_destroy: [11222] not found on server"
    );
  });

  it("should keep a dump in the workspace and compare a later one with it", async () => {
    const { call, client, context, directory } = setup();

    directories.push(directory);
    client.request.mockResolvedValueOnce({
      id: "1",
      ok: true,
      result: { WeatherManager: { weatherPeriodDuration: 21_600, nextUpdateAt: 1 } },
    });

    expect(JSON.parse(textOf(await call("game_dump", { name: "before" })))).toEqual({
      file: path.join(context.workspace.dumps, "before.json"),
      managers: { WeatherManager: 48 },
    });

    client.request.mockResolvedValueOnce({
      id: "2",
      ok: true,
      result: { WeatherManager: { weatherPeriodDuration: 25_200, nextUpdateAt: 2 } },
    });

    const compared: string = textOf(
      await call("game_dump", { name: "after", managers: "WeatherManager", compareWith: "before" })
    );

    expect(compared).toContain("1 differences in 1 managers, 1 clock or ignored fields left out.");
    expect(compared).toContain("~ weatherPeriodDuration: 21600 -> 25200");
    expect(fs.existsSync(path.join(context.workspace.dumps, "after.diff.txt"))).toBe(true);
    expect(client.request).toHaveBeenLastCalledWith(
      "lua",
      { code: expect.stringContaining("local only = { WeatherManager = true }") },
      60_000
    );
    expect(textOf(await call("game_dump", { name: "next", compareWith: "missing" }))).toContain("No dump 'missing'");
    expect(textOf(await call("game_dump", { name: "../escape" }))).toContain("Dump names take");
  });

  it("should bank a save, list it and load it back in a level, the main menu, or a new game process", async () => {
    const { call, client, context, directory } = setup();
    const { savedgames } = await context.getPaths();

    directories.push(directory);
    fs.mkdirSync(savedgames, { recursive: true });
    client.request.mockImplementation(async (kind: string, args?: Record<string, unknown>) => {
      if (kind === "console" && String(args?.command).startsWith("save ")) {
        fs.writeFileSync(path.join(savedgames, "mcp_bar.scop"), "save");
        fs.writeFileSync(path.join(savedgames, "mcp_bar.scopx"), "xrf");
      }

      return { id: "1", ok: true, result: { level: "zaton", gameTime: "09:50 08/03/2012" } };
    });

    expect(JSON.parse(textOf(await call("game_save", { name: "mcp_bar", note: "bar" })))).toMatchObject({
      name: "mcp_bar",
      files: ["mcp_bar.scop", "mcp_bar.scopx"],
      level: "zaton",
      note: "bar",
    });
    expect(JSON.parse(textOf(await call("game_saves")))).toHaveLength(1);
    expect(textOf(await call("game_save", { name: "bad name" }))).toContain("Save names take");

    fs.rmSync(path.join(savedgames, "mcp_bar.scop"));
    jest.mocked(context.isGameRunning).mockResolvedValue(true);

    await call("game_load", { name: "mcp_bar" });

    expect(fs.existsSync(path.join(savedgames, "mcp_bar.scop"))).toBe(true);
    expect(client.request).toHaveBeenCalledWith("console", { command: "load mcp_bar" });

    client.request.mockResolvedValue({ id: "1", ok: true, result: {} });

    await call("game_load", { name: "mcp_bar" });

    expect(client.request).toHaveBeenCalledWith("console", {
      command: "start server(mcp_bar/single/alife/load) client(localhost)",
    });

    jest.mocked(context.isGameRunning).mockResolvedValue(false);

    await call("game_load", { name: "mcp_bar" });

    expect(context.startGame).toHaveBeenCalledWith(expect.objectContaining({ load: "mcp_bar", mcp: true }));
    expect(textOf(await call("game_start", { mode: "load", save: "mcp_missing" }))).toContain("No save 'mcp_missing'");
    // A save alone means loading it, not a new game that drops it.
    expect(textOf(await call("game_start", { save: "mcp_missing" }))).toContain("No save 'mcp_missing'");
  });

  it("should wait for a time, or until a Lua expression holds", async () => {
    const { call, client, directory } = setup();

    directories.push(directory);
    jest.useFakeTimers();
    client.request
      .mockRejectedValueOnce(new Error("The game did not answer."))
      .mockResolvedValueOnce({ id: "1", ok: true, result: false })
      .mockResolvedValueOnce({ id: "2", ok: true, result: 207 });

    const matched: Promise<IToolResult> = call("game_wait", { seconds: 10, until: "surge.finished and elapsed" });

    await jest.advanceTimersByTimeAsync(2_000);

    expect(JSON.parse(textOf(await matched))).toEqual({ matched: true, waitedSeconds: 2, value: 207 });
    expect(client.request).toHaveBeenLastCalledWith("lua", { code: "surge.finished and elapsed" }, 5_000);

    client.request.mockResolvedValue({ id: "3", ok: true, result: null });

    const missed: Promise<IToolResult> = call("game_wait", { seconds: 3, until: "false" });

    await jest.advanceTimersByTimeAsync(3_000);

    expect(JSON.parse(textOf(await missed))).toMatchObject({ matched: false, waitedSeconds: 3, value: null });

    client.request.mockResolvedValue({ id: "4", ok: true, result: { level: "zaton" } });

    const status: Promise<IToolResult> = call("game_wait", { seconds: 5 });

    await jest.advanceTimersByTimeAsync(5_000);

    expect(JSON.parse(textOf(await status))).toEqual({ level: "zaton" });
    expect(client.request).toHaveBeenLastCalledWith("status");
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

  it("should take a connection closed before the quit answer as the quit", async () => {
    const { call, client, directory } = setup();

    directories.push(directory);
    client.request.mockRejectedValueOnce(new Error("The game connection closed before answering."));

    expect(textOf(await call("game_quit"))).toBe("The game quit.");

    client.isConnected.mockReturnValueOnce(true);
    client.request.mockRejectedValueOnce(new Error("Timed out."));

    expect(await call("game_quit")).toMatchObject({ isError: true, content: [{ text: "Timed out." }] });
  });
  describe("game_dialog", () => {
    const LIST: IDialogListReport = {
      language: "eng",
      profile: { id: "snag", characters: ["snag"] },
      dialogs: [
        {
          id: "snag_cache_dialog",
          logicalPath: "configs\\gameplay\\dialogs_zaton.xml",
          priority: null,
          phrases: 2,
          captionKey: "snag_cache_0",
          caption: null,
          elements: [{ name: "dont_has_info", kind: "dontHasInfo", value: "known" }],
          offers: [{ kind: "start", character: "snag" }],
        },
        {
          id: "actor_break_dialog",
          logicalPath: "configs\\gameplay\\dialogs.xml",
          priority: null,
          phrases: 1,
          captionKey: "actor_break_0",
          caption: null,
          elements: [],
          offers: [{ kind: "info", info: "global_dialogs" }],
        },
      ],
    };

    /**
     * @param id - Dialog id.
     * @returns What `xrf-cli dialog inspect` answers for a two phrase dialog.
     */
    function inspected(id: string): IDialogInspectReport {
      return {
        alsoDeclaredIn: [],
        dialog: {
          id,
          logicalPath: "configs\\gameplay\\dialogs_zaton.xml",
          elements: [],
          phrases: [
            { id: "0", textKey: `${id}_0`, next: ["1"], elements: [] },
            {
              id: "1",
              textKey: `${id}_1`,
              next: [],
              elements: [{ name: "give_info", kind: "giveInfo", value: "known" }],
            },
          ],
        },
      };
    }

    /**
     * @param context - Tools context to answer `xrf-cli` for.
     * @param answers - Results by subcommand.
     */
    function answerXrfCli(
      context: IGameToolsContext,
      answers: Record<string, (parameters: Array<string>) => unknown>
    ): void {
      (context.runXrfCli as jest.Mock<IGameToolsContext["runXrfCli"]>).mockImplementation(async (parameters) => ({
        exitCode: 0,
        error: null,
        result: answers[parameters[1]](parameters),
      }));
    }

    it("should list the dialogs an NPC offers through xrf-cli for the game to judge", async () => {
      const { call, client, context, directory } = setup();

      directories.push(directory);
      answerXrfCli(context, { list: () => LIST });
      client.request
        .mockResolvedValueOnce({ id: "1", ok: true, result: { profile: "snag", scriptedStartDialog: null } })
        .mockResolvedValueOnce({ id: "2", ok: true, result: { dialogs: [] } });

      expect(JSON.parse(textOf(await call("game_dialog", { npc: "zat_b33_stalker_snag" })))).toEqual({ dialogs: [] });
      expect(context.runXrfCli).toHaveBeenCalledWith([
        "dialog",
        "list",
        "--profile",
        "snag",
        "--path",
        TARGET_GAME_DATA_DIR,
        "--source",
        "directory",
      ]);
      expect(client.request).toHaveBeenNthCalledWith(1, "dialog_npc", { npc: "zat_b33_stalker_snag" });
      expect(client.request).toHaveBeenLastCalledWith("dialog", {
        npc: "zat_b33_stalker_snag",
        dialogs: [
          {
            id: "snag_cache_dialog",
            caption: "snag_cache_0",
            isStartedByNpc: true,
            offeringInfos: [],
            hasInfo: [],
            dontHasInfo: ["known"],
            preconditions: [],
          },
          {
            id: "actor_break_dialog",
            caption: "actor_break_0",
            isStartedByNpc: false,
            offeringInfos: ["global_dialogs"],
            hasInfo: [],
            dontHasInfo: [],
            preconditions: [],
          },
        ],
      });
    });

    it("should open with the start dialog a script set in place of the character's own", async () => {
      const { call, client, context, directory } = setup();

      directories.push(directory);
      answerXrfCli(context, { list: () => LIST, inspect: (parameters) => inspected(parameters[2]) });
      client.request
        .mockResolvedValueOnce({
          id: "1",
          ok: true,
          result: { profile: "snag", scriptedStartDialog: "snag_gun_dialog" },
        })
        .mockResolvedValueOnce({ id: "2", ok: true, result: {} });

      await call("game_dialog", { npc: "7119" });

      const { dialogs } = client.request.mock.calls[1][1] as {
        dialogs: Array<{ id: string; isStartedByNpc: boolean }>;
      };

      expect(client.request).toHaveBeenNthCalledWith(1, "dialog_npc", { npc: 7119 });
      expect(dialogs.map((it) => [it.id, it.isStartedByNpc])).toEqual([
        ["snag_gun_dialog", true],
        ["actor_break_dialog", false],
      ]);
    });

    it("should walk a dialog opened by the NPC whose start dialog it is, or by whoever opener names", async () => {
      const { call, client, context, directory } = setup();

      directories.push(directory);
      answerXrfCli(context, { list: () => LIST, inspect: (parameters) => inspected(parameters[2]) });
      client.request.mockResolvedValue({ id: "1", ok: true, result: { profile: "snag", scriptedStartDialog: null } });

      await call("game_dialog", { npc: "snag", dialog: "snag_cache_dialog", say: "1" });

      expect(client.request).toHaveBeenLastCalledWith("dialog", {
        npc: "snag",
        walk: {
          choices: ["1"],
          dialog: expect.objectContaining({
            id: "snag_cache_dialog",
            isStartedByNpc: true,
            phrases: expect.objectContaining({ "1": expect.objectContaining({ giveInfo: ["known"] }) }),
          }),
        },
      });

      await call("game_dialog", { npc: "snag", dialog: "snag_cache_dialog", opener: "actor" });

      expect(client.request).toHaveBeenLastCalledWith("dialog", {
        npc: "snag",
        walk: { choices: [], dialog: expect.objectContaining({ isStartedByNpc: false }) },
      });
    });

    it("should refuse a dialog a script builds, and answer an xrf-cli failure as a failed result", async () => {
      const { call, client, context, directory } = setup();

      directories.push(directory);
      client.request.mockResolvedValue({ id: "1", ok: true, result: { profile: "snag", scriptedStartDialog: null } });
      answerXrfCli(context, {
        inspect: (parameters) => ({
          alsoDeclaredIn: [],
          dialog: {
            ...inspected(parameters[2]).dialog,
            elements: [{ name: "init_func", kind: "initFunc", value: "dialogs.build" }],
          },
        }),
      });

      expect(await call("game_dialog", { npc: "snag", dialog: "dm_traveler_dialog" })).toMatchObject({
        isError: true,
        content: [
          { text: "Dialog 'dm_traveler_dialog' is built by 'dialogs.build' at runtime, so it has no phrases to walk." },
        ],
      });

      (context.runXrfCli as jest.Mock<IGameToolsContext["runXrfCli"]>).mockResolvedValue({
        exitCode: 1,
        error: "Not found error: no file declares dialog 'nothing'",
        result: null,
      });

      expect(await call("game_dialog", { npc: "snag", dialog: "nothing" })).toMatchObject({
        isError: true,
        content: [{ text: "Not found error: no file declares dialog 'nothing'" }],
      });
    });
  });
});
