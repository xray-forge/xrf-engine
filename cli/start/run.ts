import { Command, Option } from "commander";

import { EGameDifficulty, startGame } from "#/start/start_game";

/**
 * Setup start commands.
 */
export function setupStartCommands(command: Command): void {
  command
    .command("start_game")
    .description("start game executable configured in config.json file")
    .addOption(new Option("-n, --new", "start new game world instantly, skipping main menu"))
    .addOption(new Option("-l, --load <save>", "load game save instantly, skipping main menu").conflicts("new"))
    .addOption(
      new Option("-d, --difficulty <difficulty>", "game difficulty to use with instant start").choices(
        Object.values(EGameDifficulty)
      )
    )
    .addOption(new Option("--ni, --no-intro", "skip the logo video before the main menu"))
    .addOption(new Option("--fl, --flushlog", "flush engine log after every line, useful when diagnosing crashes"))
    .action(startGame);
}
