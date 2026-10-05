import { consoleCommands, executeConsoleCommand, extern } from "xray16/lib";

/**
 * Handle UI changes when stop game over tutorial.
 */
extern("xr_effects.on_tutor_gameover_stop", (): void => {
  executeConsoleCommand(consoleCommands.main_menu, "on");
});
