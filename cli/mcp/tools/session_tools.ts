import * as fs from "node:fs";
import * as path from "node:path";

import { findCrashLines, IGameCrash, keepGameCrash } from "#/mcp/game_crash";
import { IMcpTool, IToolArgumentSchema, IToolResult } from "#/mcp/mcp_tool_types";
import { IGameResponse } from "#/mcp/McpPipeClient";
import { restoreSave } from "#/mcp/save_bank";
import { answer, IGameToolsContext, json, readGameLog, schema, sleep, text } from "#/mcp/tools/tool_kit";
import { EGameDifficulty } from "#/start/start_game";
import { Nullable, Optional } from "#/utils/types";

const QUIT_WAIT_MS: number = 30_000;
const PROCESS_POLL_MS: number = 1_000;
// How long a launched game may take to show up as a process before it counts as gone.
const PROCESS_START_GRACE_MS: number = 15_000;
// Engine log lines searched for a fatal error, which the engine writes among its last.
const LOG_SCAN_LINES: number = 150;
const LOG_TAIL_LINES: number = 20;

/**
 * @param context - What the tools reach outside the pipe.
 * @returns Engine log lines from its last fatal error on, or its last lines when it has none.
 */
export async function readEngineCrash(context: IGameToolsContext): Promise<string> {
  const logPath: Nullable<string> = await context.getEngineLogPath();

  if (!logPath || !fs.existsSync(logPath)) {
    return "No engine log found.";
  }

  const lines: Array<string> = await readGameLog(logPath, LOG_SCAN_LINES, await context.getTextEncoding());

  return (findCrashLines(lines) ?? lines.slice(-LOG_TAIL_LINES)).join("\n").trim();
}

/**
 * Keep the previous run's logs when it crashed, as the next launch overwrites them.
 *
 * @param context - What the tools reach outside the pipe.
 * @returns The kept crash, or null when the previous run did not crash or is kept already.
 */
export async function keepPreviousCrash(context: IGameToolsContext): Promise<Nullable<IGameCrash>> {
  const logPath: Nullable<string> = await context.getEngineLogPath();

  if (!logPath || !fs.existsSync(logPath)) {
    return null;
  }

  const { logs, reports } = await context.getPaths();

  return keepGameCrash(
    logPath,
    await readGameLog(logPath, LOG_SCAN_LINES, await context.getTextEncoding()),
    logs,
    reports,
    context.workspace.crashes
  );
}

/**
 * Wait until the game greets past a session, failing at once with the engine's error when its process exits first.
 *
 * @param context - What the tools reach outside the pipe.
 * @param timeoutMs - How long to wait.
 * @param previousSession - Session to wait past.
 * @returns The greeting, or why the game is gone.
 */
export async function waitForGreeting(
  context: IGameToolsContext,
  timeoutMs: number,
  previousSession: Nullable<string>
): Promise<IToolResult> {
  const stop: AbortController = new AbortController();
  const startedAt: number = Date.now();
  let hasRun: boolean = false;
  let hasExited: boolean = false;

  const watch: Promise<void> = (async () => {
    while (!stop.signal.aborted) {
      await sleep(PROCESS_POLL_MS, stop.signal);

      if (stop.signal.aborted) {
        return;
      }

      if (await context.isGameRunning()) {
        hasRun = true;
      } else if (hasRun || Date.now() - startedAt > PROCESS_START_GRACE_MS) {
        hasExited = true;
        stop.abort();
      }
    }
  })();

  try {
    return json(await context.client.waitForReady(timeoutMs, previousSession, stop.signal));
  } catch (error) {
    if (hasExited) {
      return text(`The game process exited before it greeted. Engine log:\n${await readEngineCrash(context)}`, true);
    }

    throw error;
  } finally {
    stop.abort();
    await watch;
  }
}

/**
 * Argument of the tools that bring a level up, choosing whether the actor is invulnerable in it.
 */
export const GOD_MODE_ARGUMENT: IToolArgumentSchema = {
  type: "boolean",
  default: true,
  description:
    "Keep the actor invulnerable with `g_god 1`, as walks need: a death ends one, and a load after one can crash the " +
    "engine. False leaves the actor mortal, for checking death itself.",
};

/**
 * Set god mode in a level that greeted, as the console applies it to the running level's actor.
 *
 * @param context - What the tools reach outside the pipe.
 * @param arrival - What waiting for the level answered.
 * @param isGodMode - Whether the actor is to be invulnerable.
 * @returns The arrival, or why god mode could not be set.
 */
export async function applyGodMode(
  context: IGameToolsContext,
  arrival: IToolResult,
  isGodMode: boolean
): Promise<IToolResult> {
  if (arrival.isError) {
    return arrival;
  }

  const set: IGameResponse = await context.client.request("console", { command: `g_god ${isGodMode ? 1 : 0}` });

  return set.ok ? arrival : answer(set);
}

/**
 * Put a banked save into the game's saves folder, as the bank holds the copy tools rely on.
 *
 * @param context - What the tools reach outside the pipe.
 * @param save - Save name.
 * @returns Error result when the save is neither banked nor in the game's saves folder, null when it can load.
 */
export async function prepareSave(context: IGameToolsContext, save: string): Promise<Nullable<IToolResult>> {
  const { savedgames } = await context.getPaths();

  if (restoreSave(context.workspace.saves, savedgames, save) || fs.existsSync(path.join(savedgames, `${save}.scop`))) {
    return null;
  }

  return text(`No save '${save}' in the bank or the game's saves; list the bank with game_saves.`, true);
}

/**
 * Launch the game armed and wait for its level, refusing while a game runs.
 *
 * @param context - What the tools reach outside the pipe.
 * @param save - Save to load, a new game when null.
 * @param difficulty - Difficulty of a new game.
 * @param timeoutMs - How long to wait for the level.
 * @param isGodMode - Whether the actor is to be invulnerable once the level runs.
 * @returns The greeting, or why the game did not start.
 */
export async function startArmedGame(
  context: IGameToolsContext,
  save: Nullable<string>,
  difficulty: Optional<EGameDifficulty>,
  timeoutMs: number,
  isGodMode: boolean
): Promise<IToolResult> {
  const { client } = context;

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

  const missing: Nullable<IToolResult> = save ? await prepareSave(context, save) : null;

  if (missing) {
    return missing;
  }

  const previous: Nullable<string> = client.session;
  const crash: Nullable<IGameCrash> = await keepPreviousCrash(context);

  await context.startGame({
    new: !save,
    load: save ?? undefined,
    difficulty,
    flushlog: true,
    mcp: true,
  });

  // The launch refreshes the settings copy, whose language may have changed since.
  client.textEncoding = await context.getTextEncoding();

  const result: IToolResult = await applyGodMode(
    context,
    await waitForGreeting(context, timeoutMs, previous),
    isGodMode
  );

  if (!crash) {
    return result;
  }

  return {
    ...result,
    content: [
      ...result.content,
      {
        type: "text",
        text: `The previous run crashed; its logs are kept in ${crash.directory}, with ${crash.reports.length} BugTrap report(s) named in crash.txt.`,
      },
    ],
  };
}

/**
 * @param context - What the tools reach outside the pipe.
 * @returns Tools starting, awaiting and quitting the game.
 */
export function createSessionTools(context: IGameToolsContext): Array<IMcpTool> {
  const { client } = context;

  return [
    {
      name: "game_start",
      description:
        "Start the game with the MCP endpoint armed, in a new game or a save, and wait until a level is running. " +
        "A save from the bank (game_saves) is copied into the game first. Fails when a game already runs.",
      inputSchema: schema({
        mode: {
          type: "string",
          enum: ["new", "load"],
          description: "Start a new game or load a save; a new game unless `save` is given.",
        },
        save: { type: "string", minLength: 1, description: "Save name without extension, to load." },
        difficulty: { type: "string", enum: Object.values(EGameDifficulty), description: "Difficulty of a new game." },
        timeoutSeconds: {
          type: "integer",
          minimum: 1,
          maximum: 900,
          default: 300,
          description: "How long to wait for the level.",
        },
        god: GOD_MODE_ARGUMENT,
      }),
      call: async ({ mode, save, difficulty, timeoutSeconds, god }) => {
        if (mode === "load" && !save) {
          return text("Mode 'load' needs a save name.", true);
        } else if (mode === "new" && save) {
          // Dropping the save would start a new game where the caller meant to continue one.
          return text("Mode 'new' starts a new game and takes no save; ask for mode 'load'.", true);
        }

        return startArmedGame(
          context,
          save ? (save as string) : null,
          difficulty as Optional<EGameDifficulty>,
          (timeoutSeconds as number) * 1000,
          god as boolean
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
        waitForGreeting(
          context,
          (timeoutSeconds as number) * 1000,
          (previousSession as Optional<string>) ?? client.session
        ),
    },
    {
      name: "game_quit",
      description: "Quit the running game and wait until it is gone.",
      inputSchema: schema(),
      call: async () => {
        try {
          const response = await client.request("quit");

          if (!response.ok) {
            return text(response.error ?? "The game reported a failure.", true);
          }
        } catch (error) {
          // Quitting closes the pipe, which can happen before the answer is read.
          if (client.isConnected()) {
            throw error;
          }
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

          await sleep(250);
        }

        return text("The game quit.");
      },
    },
  ];
}
