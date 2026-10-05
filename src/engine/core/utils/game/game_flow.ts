import { consoleCommands, executeConsoleCommand } from "xray16/lib";
import { $filename } from "xray16/macros";

import { LuaLogger } from "@/engine/core/utils/logging";

const logger: LuaLogger = new LuaLogger($filename);

/**
 * Disconnect from current game.
 * Shows main menu and ends current game progress.
 */
export function disconnectFromGame(): void {
  logger.info("Game disconnect");
  executeConsoleCommand(consoleCommands.disconnect);
}
