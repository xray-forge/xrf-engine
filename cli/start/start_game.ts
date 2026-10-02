import * as cp from "node:child_process";
import * as path from "node:path";

import { green, yellowBright } from "chalk";

import { MCP_USER_CONFIG, prepareMcpUserConfig } from "#/mcp/mcp_user_config";
import { exists } from "#/utils/fs/exists";
import { getGamePaths } from "#/utils/fs/get_game_paths";
import { NodeLogger } from "#/utils/logging";

import { mcpConfig } from "@/engine/checks/mcp/McpConfig";

const log: NodeLogger = NodeLogger.forFile(__filename);

/** Enumeration of game difficulties possible to provide on game start. */
export enum EGameDifficulty {
  NOVICE = "gd_novice",
  STALKER = "gd_stalker",
  VETERAN = "gd_veteran",
  MASTER = "gd_master",
}

export interface IStartGameCommandParameters {
  new?: boolean;
  load?: string;
  difficulty?: EGameDifficulty;
  intro?: boolean;
  flushlog?: boolean;
  mcp?: boolean;
}

const START_GAME_ARGUMENTS: ReadonlyArray<string> = ["-dump_bindings"];
// Never `-nogameintro`: the engine checks `-nogame` by substring and would start without the game module.
const START_GAME_NO_INTRO_ARGUMENTS: ReadonlyArray<string> = ["-nointro"];
const NEW_GAME_SPAWN: string = "all";
const GAME_SAVE_EXTENSION: string = ".scop";

/**
 * Start game executable provided in config.json file.
 * Optionally starts game world right away to skip main menu when testing.
 */
export async function startGame(parameters: IStartGameCommandParameters = {}): Promise<void> {
  log.info("Starting game");

  const { app, appdata, bin, root, savedgames } = await getGamePaths();

  if (parameters.new && parameters.load) {
    throw new Error("Cannot start new game and load game save at the same time.");
  }

  if (parameters.load) {
    const save: string = path.join(savedgames, parameters.load + GAME_SAVE_EXTENSION);

    if (!(await exists(save))) {
      throw new Error(`Provided game save does not exist: '${save}'.`);
    }
  }

  const engineApp: string = path.join(bin, "xrEngine.exe");
  const startApp: string = (await exists(engineApp)) ? engineApp : app;
  const startArguments: Array<string> = [...START_GAME_ARGUMENTS];

  // Hard crashes lose the buffered engine log tail, flushing every line keeps it complete at some performance cost.
  if (parameters.flushlog) {
    startArguments.push("-force_flushlog");
  }

  // Arms the game MCP endpoint, with settings of its own that keep the game running unfocused.
  if (parameters.mcp) {
    await prepareMcpUserConfig(appdata);
    startArguments.push(mcpConfig.LAUNCH_FLAG, "-ltx", MCP_USER_CONFIG);
  }

  // The logo plays only before the main menu, which an instant start skips anyway.
  if (parameters.intro === false) {
    startArguments.push(...START_GAME_NO_INTRO_ARGUMENTS);
  }

  if (parameters.new || parameters.load) {
    // Note: engine reads it as `-$<command> <parameter>`, single space breaks parsing of the arguments.
    if (parameters.difficulty) {
      startArguments.push("-$g_game_difficulty", parameters.difficulty);
    }

    // Note: `-start` is parsed as whole remaining command line, so it should be provided last.
    startArguments.push(
      "-start",
      parameters.new ? `server(${NEW_GAME_SPAWN}/single/alife/new)` : `server(${parameters.load}/single/alife/load)`,
      "client(localhost)"
    );
  }

  log.info("Starting game app:", yellowBright(startApp), startArguments.join(" "));

  const game = cp.spawn(startApp, startArguments, {
    cwd: root,
    detached: true,
    stdio: "ignore",
  });

  game.once("error", (error: Error) => {
    log.error("Failed to start process:", error, "\n");
  });

  game.once("spawn", () => {
    game.unref();
    log.info("Started process:", green("OK"), "\n");
  });
}
