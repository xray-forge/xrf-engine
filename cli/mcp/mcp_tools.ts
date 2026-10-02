import * as fs from "node:fs";
import * as path from "node:path";

import { discoverChecks, ICheckDescriptor } from "#/checks/utils/discover_checks";
import { decodeGameText } from "#/mcp/game_text";
import { IMcpTool, IToolArgumentSchema, IToolInputSchema, IToolResult } from "#/mcp/mcp_tool_types";
import { IGameResponse, McpPipeClient } from "#/mcp/McpPipeClient";
import { EGameDifficulty, IStartGameCommandParameters } from "#/start/start_game";
import { readLastLinesOfFile } from "#/utils/fs/read_last_lines_of_file";
import { Nullable, Optional } from "#/utils/types";

/**
 * What the tools reach outside the pipe, replaced in tests.
 */
export interface IGameToolsContext {
  client: McpPipeClient;
  startGame: (parameters: IStartGameCommandParameters) => Promise<void>;
  isGameRunning: () => Promise<boolean>;
  isEndpointBuilt: () => boolean;
  getPaths: () => Promise<{ logs: string; screenshots: string }>;
  getEngineLogPath: () => Promise<Nullable<string>>;
  getTextEncoding: () => Promise<string>;
  keepScreenshot: (file: string) => string;
  scaleScreenshot: (file: string, width: number) => Promise<Buffer>;
}

const SCREENSHOT_WAIT_MS: number = 10_000;
const QUIT_WAIT_MS: number = 30_000;
const FLOW_WAIT_MS: number = 60_000;

/**
 * @param text - Text to answer with.
 * @param isError - Whether the tool failed.
 * @returns Tool result holding the text.
 */
function text(text: string, isError: boolean = false): IToolResult {
  return { content: [{ type: "text", text }], isError };
}

/**
 * @param response - Answer from the game.
 * @returns Its result as JSON, or its error.
 */
function answer(response: IGameResponse): IToolResult {
  return response.ok
    ? text(JSON.stringify(response.result ?? null, null, 2))
    : text(response.error ?? "The game reported a failure.", true);
}

/**
 * @param properties - Arguments by name.
 * @param required - Arguments without a default that must be given.
 * @returns Input schema of a tool.
 */
function schema(
  properties: Record<string, IToolArgumentSchema> = {},
  required: ReadonlyArray<string> = []
): IToolInputSchema {
  return { type: "object", properties, required, additionalProperties: false };
}

/**
 * @param name - Flow identity (`quests_zat_b14`), source (`quests/zat_b14.flow.ts`) or launcher (`flow_quests_zat_b14`).
 * @returns The flow, or null when none matches.
 */
export function findFlow(name: string): Nullable<ICheckDescriptor> {
  return (
    discoverChecks().find(
      (it) => it.identity === name || it.relative === name || it.launcher === name || it.launcher === `${name}.script`
    ) ?? null
  );
}

/**
 * Wait for a screenshot written after a moment.
 *
 * @param directory - Folder screenshots are written to.
 * @param since - Moment the screenshot was asked for, in milliseconds.
 * @param timeoutMs - How long to wait.
 * @returns Path of the newest screenshot written since, or null.
 */
export async function waitForScreenshot(
  directory: string,
  since: number,
  timeoutMs: number
): Promise<Nullable<string>> {
  const deadline: number = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (fs.existsSync(directory)) {
      const newest: Nullable<{ file: string; time: number }> = fs
        .readdirSync(directory)
        .filter((file) => file.startsWith("ss_") && file.endsWith(".jpg"))
        .map((file) => ({ file, time: fs.statSync(path.join(directory, file)).mtimeMs }))
        .filter((it) => it.time >= since - 1000)
        .reduce<Nullable<{ file: string; time: number }>>(
          (best, it) => (!best || it.time > best.time ? it : best),
          null
        );

      if (newest) {
        return path.join(directory, newest.file);
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  return null;
}

/**
 * Create the game tools. A tool body that throws answers a failed result with the error message.
 *
 * @param context - What the tools reach outside the pipe.
 * @returns Tools to serve.
 */
export function createGameTools(context: IGameToolsContext): Array<IMcpTool> {
  const { client } = context;

  return [
    {
      name: "game_start",
      description:
        "Start the game with the MCP endpoint armed, in a new game or a save, and wait until a level is running. " +
        "Fails when a game already runs.",
      inputSchema: schema({
        mode: {
          type: "string",
          enum: ["new", "load"],
          default: "new",
          description: "Start a new game or load a save.",
        },
        save: { type: "string", minLength: 1, description: "Save name without extension, for mode 'load'." },
        difficulty: { type: "string", enum: Object.values(EGameDifficulty), description: "Difficulty of a new game." },
        timeoutSeconds: {
          type: "integer",
          minimum: 1,
          maximum: 900,
          default: 300,
          description: "How long to wait for the level.",
        },
      }),
      call: async ({ mode, save, difficulty, timeoutSeconds }) => {
        if (!context.isEndpointBuilt()) {
          return text("The game MCP endpoint is not built; run `npm run cli mcp build` first.", true);
        }

        if (client.isConnected()) {
          return text(`A game is already connected (session ${client.session ?? "pending"}); quit it first.`, true);
        }

        if (await context.isGameRunning()) {
          return text(
            "A game is already running without this session connected: it was started without the endpoint armed, " +
              "or another session holds its pipe. Quit it first.",
            true
          );
        }

        if (mode === "load" && !save) {
          return text("Mode 'load' needs a save name.", true);
        }

        const previous: Nullable<string> = client.session;

        await context.startGame({
          new: mode === "new",
          load: mode === "load" ? (save as string) : undefined,
          difficulty: difficulty as Optional<EGameDifficulty>,
          flushlog: true,
          mcp: true,
        });

        // The launch refreshes the settings copy, whose language may have changed since.
        client.textEncoding = await context.getTextEncoding();

        return text(JSON.stringify(await client.waitForReady((timeoutSeconds as number) * 1000, previous), null, 2));
      },
    },
    {
      name: "game_status",
      description:
        "Report the session, level, game time and actor of the running game, and the time since the previous " +
        "actor update, which is how often the game answers.",
      inputSchema: schema(),
      call: async () => answer(await client.request("status")),
    },
    {
      name: "game_console",
      description:
        "Run a game console command after answering. Commands that load or quit restart the game's scripts; " +
        "call game_wait_ready afterwards. A command that takes an argument does nothing without one.",
      inputSchema: schema(
        { command: { type: "string", minLength: 1, description: "Console command, e.g. `time_factor 10`." } },
        ["command"]
      ),
      call: async ({ command }) => answer(await client.request("console", { command })),
    },
    {
      name: "game_lua",
      description:
        "Run Lua in the game and return its value as JSON. Tried as an expression first, so `level.name()` works " +
        "without `return`. Game objects come back as placeholders; return their fields instead.",
      inputSchema: schema(
        {
          code: { type: "string", minLength: 1, description: "Lua expression or chunk." },
          timeoutSeconds: {
            type: "integer",
            minimum: 1,
            maximum: 300,
            default: 30,
            description: "How long to wait for the answer.",
          },
        },
        ["code"]
      ),
      call: async ({ code, timeoutSeconds }) =>
        answer(await client.request("lua", { code }, (timeoutSeconds as number) * 1000)),
    },
    {
      name: "game_flow",
      description:
        "Run an in-game check flow and return how far it got, what failed, and the lines it reported, which say " +
        "what to do to reach a pending step.",
      inputSchema: schema(
        {
          name: { type: "string", minLength: 1, description: "Flow identity (`quests_zat_b14`), source or launcher." },
        },
        ["name"]
      ),
      call: async ({ name }) => {
        const flow: Nullable<ICheckDescriptor> = findFlow(name as string);

        if (!flow) {
          return text(
            `Unknown flow '${name}'. Available: ${discoverChecks()
              .map((it) => it.identity)
              .join(", ")}.`,
            true
          );
        }

        return answer(await client.request("flow", { module: flow.module, identity: flow.identity }, FLOW_WAIT_MS));
      },
    },
    {
      name: "game_screenshot",
      description:
        "Take a screenshot of the running game and return the image, scaled down to a width. The full picture is " +
        "kept under target/mcp/screenshots.",
      inputSchema: schema({
        width: {
          type: "integer",
          minimum: 320,
          maximum: 7680,
          default: 1600,
          description: "Width to scale the image down to.",
        },
      }),
      call: async ({ width }) => {
        const since: number = Date.now();
        const response: IGameResponse = await client.request("screenshot");

        if (!response.ok) {
          return answer(response);
        }

        const file: Nullable<string> = await waitForScreenshot(
          (await context.getPaths()).screenshots,
          since,
          SCREENSHOT_WAIT_MS
        );

        if (!file) {
          return text("The game took no screenshot in time.", true);
        }

        const kept: string = context.keepScreenshot(file);
        const image: Buffer = await context.scaleScreenshot(kept, width as number);

        return {
          content: [
            { type: "image", data: image.toString("base64"), mimeType: "image/jpeg" },
            { type: "text", text: kept },
          ],
        };
      },
    },
    {
      name: "game_log",
      description:
        "Read the last lines of a game log, while the game runs, loads or is paused, or after it crashed: the " +
        "engine log, the xrf Lua log, or the check flows log.",
      inputSchema: schema({
        file: {
          type: "string",
          enum: ["engine", "lua", "checks"],
          default: "engine",
          description: "Which log to read.",
        },
        lines: { type: "integer", minimum: 1, maximum: 2000, default: 100, description: "How many last lines." },
      }),
      call: async ({ file, lines }) => {
        const { logs } = await context.getPaths();
        const logPath: Nullable<string> =
          file === "engine"
            ? await context.getEngineLogPath()
            : path.join(logs, file === "lua" ? "xrf_lua.log" : "xrf_checks.log");

        if (!logPath || !fs.existsSync(logPath)) {
          return text(`No ${file} log found.`, true);
        }

        const encoding: string = await context.getTextEncoding();
        // Latin-1 keeps every byte, so each line decodes as the game wrote it.
        const raw: string = await readLastLinesOfFile(logPath, lines as number, "latin1");

        return text(
          raw
            .split("\n")
            .map((line) => decodeGameText(Buffer.from(line, "latin1"), encoding))
            .join("\n")
        );
      },
    },
    {
      name: "game_wait_ready",
      description: "Wait until the game greets again after a load, a level change or a start, and return the session.",
      inputSchema: schema({
        previousSession: { type: "string", description: "Session to wait past; the current one by default." },
        timeoutSeconds: { type: "integer", minimum: 1, maximum: 900, default: 300, description: "How long to wait." },
      }),
      call: async ({ previousSession, timeoutSeconds }) =>
        text(
          JSON.stringify(
            await client.waitForReady(
              (timeoutSeconds as number) * 1000,
              (previousSession as Optional<string>) ?? client.session
            ),
            null,
            2
          )
        ),
    },
    {
      name: "game_quit",
      description: "Quit the running game and wait until it is gone.",
      inputSchema: schema(),
      call: async () => {
        const response: IGameResponse = await client.request("quit");

        if (!response.ok) {
          return answer(response);
        }

        const deadline: number = Date.now() + QUIT_WAIT_MS;

        if (!(await client.waitForClose(QUIT_WAIT_MS))) {
          return text("The game did not close its connection in time.", true);
        }

        // The process outlives the connection briefly, and game_start refuses while it runs.
        while (await context.isGameRunning()) {
          if (Date.now() >= deadline) {
            return text("The game closed its connection but its process still runs.", true);
          }

          await new Promise((resolve) => setTimeout(resolve, 250));
        }

        return text("The game quit.");
      },
    },
  ];
}
