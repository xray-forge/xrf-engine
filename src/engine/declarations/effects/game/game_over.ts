import { executeConsoleCommand, extern } from "xray16/lib";
import { $filename } from "xray16/macros";

import { consoleCommands } from "@/engine/constants/console_commands";
import { getManager } from "@/engine/core/database";
import { GameOutroManager } from "@/engine/core/managers/outro";
import { LuaLogger } from "@/engine/core/utils/logging";

const logger: LuaLogger = new LuaLogger($filename);

/**
 * Return to the main menu once the credits rolled after the outro have ended.
 */
extern("xr_effects.game_over", (): void => {
  logger.info("Game over, credits sequence ended");

  if (!getManager(GameOutroManager).isGameoverCreditsStarted) {
    return;
  }

  executeConsoleCommand(consoleCommands.main_menu, "on");
});
