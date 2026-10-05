import * as fs from "node:fs";
import * as path from "node:path";

import {
  TARGET_GAME_DATA_CONFIGS_DIR,
  TARGET_GAME_DATA_MCP_EXTENSION_DIR,
  TARGET_MCP_CRASHES_DIR,
  TARGET_MCP_DUMPS_DIR,
  TARGET_MCP_PROBES_DIR,
  TARGET_MCP_SAVES_DIR,
  TARGET_MCP_SCREENSHOTS_DIR,
  XRF_UTILS_PATH,
} from "#/globals/paths";
import { getLogFilePath } from "#/logs/logs_lines";
import { isGameProcessRunning } from "#/mcp/game_process";
import { moveScreenshot, scaleScreenshot } from "#/mcp/game_screenshot";
import { DEFAULT_GAME_TEXT_ENCODING, resolveGameTextEncoding } from "#/mcp/game_text";
import { createGameTools } from "#/mcp/mcp_tools";
import { McpPipeClient } from "#/mcp/McpPipeClient";
import { McpStdioServer } from "#/mcp/McpStdioServer";
import { runXrfCli } from "#/mcp/xrf_cli";
import { cacheXrfCli, stampDirectory } from "#/mcp/xrf_cli_cache";
import { startGame } from "#/start/start_game";
import { getGamePaths } from "#/utils/fs/get_game_paths";
import { NodeLogger } from "#/utils/logging";

const INSTRUCTIONS: string =
  "Tools for a running S.T.A.L.K.E.R. game built from xrf-engine. Build the endpoint once with " +
  "`npm run cli -- mcp build`, then call game_start. The game answers in a level and, once a game has started, in " +
  "the main menu; loading, intros, the outro and credits are silent, so follow them with game_log. Save through " +
  "game_console before anything that can kill the actor or end the game, and call game_wait_ready after a load. " +
  "Load saves with game_load, which picks the right console command in a level or the main menu. Keep test saves " +
  "with game_save in the bank under target/mcp/saves, Lua probes under target/mcp/probes (game_lua `file`), and " +
  "compare manager state with game_dump; check game_errors after each step.";

/**
 * Resolve the game text encoding, the default one without a configured game: the tools still serve then, and starting a
 * game reports what is missing.
 *
 * @returns Encoding of game text.
 */
async function getTextEncoding(): Promise<string> {
  try {
    const { appdata, gamedata } = await getGamePaths();

    return await resolveGameTextEncoding(appdata, gamedata);
  } catch {
    return DEFAULT_GAME_TEXT_ENCODING;
  }
}

/**
 * @returns Whether a game process runs, whichever executable started it.
 */
async function isGameRunning(): Promise<boolean> {
  const { app } = await getGamePaths();

  return isGameProcessRunning(["xrEngine.exe", path.basename(app)]);
}

/**
 * Serve the game tools to an MCP client over stdio, talking to the game through its pipe, until the client closes.
 */
export async function serveMcp(): Promise<void> {
  // Stdout carries the protocol, so nothing else may write to it.
  NodeLogger.IS_CONSOLE_ENABLED = false;
  NodeLogger.IS_FILE_ENABLED = false;

  const client: McpPipeClient = new McpPipeClient();

  // A game may already be running, so answers decode right before any start.
  client.textEncoding = await getTextEncoding();

  const server: McpStdioServer = new McpStdioServer(
    { name: "xrf-game", version: "1.0.0" },
    createGameTools({
      client,
      workspace: {
        dumps: TARGET_MCP_DUMPS_DIR,
        saves: TARGET_MCP_SAVES_DIR,
        probes: TARGET_MCP_PROBES_DIR,
        crashes: TARGET_MCP_CRASHES_DIR,
      },
      startGame,
      isGameRunning,
      isEndpointBuilt: () => fs.existsSync(TARGET_GAME_DATA_MCP_EXTENSION_DIR),
      getPaths: getGamePaths,
      getEngineLogPath: getLogFilePath,
      getTextEncoding,
      keepScreenshot: (file) => moveScreenshot(file, TARGET_MCP_SCREENSHOTS_DIR),
      scaleScreenshot,
      // The tools query configs of the gamedata the game runs, which change only when a build writes them.
      runXrfCli: cacheXrfCli(
        (parameters) => runXrfCli(XRF_UTILS_PATH, parameters),
        () => stampDirectory(TARGET_GAME_DATA_CONFIGS_DIR)
      ),
    }),
    INSTRUCTIONS
  );

  await server.serve(process.stdin, process.stdout);

  client.close();
}
