import { consoleCommands, executeConsoleCommand, extern } from "xray16/lib";

/**
 * Handle UI changes after credits tutorial.
 */
extern("xr_effects.after_credits", (): void => {
  executeConsoleCommand(consoleCommands.main_menu, "on");
});
