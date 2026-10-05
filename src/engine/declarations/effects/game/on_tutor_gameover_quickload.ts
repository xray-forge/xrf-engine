import { consoleCommands, executeConsoleCommand, extern } from "xray16/lib";

/**
 * Handle UI changes when force load last save on quick load.
 */
extern("xr_effects.on_tutor_gameover_quickload", (): void => {
  executeConsoleCommand(consoleCommands.load_last_save);
});
