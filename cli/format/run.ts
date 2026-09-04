import { Argument, Command, Option } from "commander";

import { formatLtx, IFormatLtxParameters } from "#/format/format_ltx";
import { formatTranslations, IFormatTranslationsParameters } from "#/format/format_translations";

/**
 * Setup format commands.
 */
export function setupFormatCommands(command: Command): void {
  const formatCommand: Command = command.command("format").description("custom formatting commands");

  formatCommand
    .command("ltx")
    .description("format ltx files")
    .addArgument(new Argument("[paths...]", "Files or folders to format, defaults to game configs folder"))
    .addOption(new Option("-c, --check", "Run ltx formatter in check mode").default(false))
    .addOption(new Option("-v, --verbose", "Whether verbose logging mode is enabled").default(false))
    .action((paths: Array<string>, parameters: IFormatLtxParameters) =>
      formatLtx({ ...parameters, paths: paths.length ? paths : undefined })
    );

  formatCommand
    .command("translations")
    .description("format json translation sources")
    .addArgument(new Argument("[paths...]", "Files or folders to format, defaults to translations folder"))
    .addOption(new Option("-c, --check", "Run translations formatter in check mode").default(false))
    .addOption(new Option("-v, --verbose", "Whether verbose logging mode is enabled").default(false))
    .action((paths: Array<string>, parameters: IFormatTranslationsParameters) =>
      formatTranslations({ ...parameters, paths: paths.length ? paths : undefined })
    );
}
