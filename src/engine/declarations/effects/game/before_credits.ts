import { consoleCommands, executeConsoleCommand, extern } from "xray16/lib";

/**
 * Handle UI changes before credits tutorial.
 */
extern("xr_effects.before_credits", (): void => {
  executeConsoleCommand(consoleCommands.main_menu, "off");
});
