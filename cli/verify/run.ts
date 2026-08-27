import { Command, Option } from "commander";

import { verifyExternManifest } from "#/verify/verify_externs";
import { EGamedataCheck, verifyGamedata } from "#/verify/verify_gamedata";
import { verifyLtx } from "#/verify/verify_ltx";
import { verifyParticlesPacked } from "#/verify/verify_particles_packed";
import { verifyParticlesUnpacked } from "#/verify/verify_particles_unpacked";
import { verifyProject } from "#/verify/verify_project";
import { verifyTranslations } from "#/verify/verify_translations";

/**
 * Setup verify commands.
 */
export function setupVerifyCommands(command: Command): void {
  const verifyCommand: Command = command.command("verify").description("custom verification commands");

  verifyCommand.command("project").description("verify state of ltx project").action(verifyProject);

  verifyCommand
    .command("gamedata")
    .description("verify assembled target gamedata integrity")
    .addOption(
      new Option("-c, --checks <checks...>", "run only selected checks instead of all of them").choices(
        Object.values(EGamedataCheck)
      )
    )
    .addOption(new Option("-r, --report <report>", "write the structured verification report as JSON"))
    .addOption(new Option("-s, --strict", "Fully validate expensive asset payloads").default(false))
    .addOption(new Option("-v, --verbose", "Whether verbose logging mode is enabled").default(false))
    .action(verifyGamedata);

  verifyCommand
    .command("externs")
    .description("verify the tracked extern manifest against declaration sources")
    .action(verifyExternManifest);

  verifyCommand
    .command("ltx")
    .description("verify ltx projects integrity and types")
    .addOption(new Option("-v, --verbose", "Whether verbose logging mode is enabled").default(false))
    .action(verifyLtx);

  verifyCommand
    .command("particles-packed")
    .description("verify packed particles")
    .addOption(new Option("-v, --verbose", "Whether verbose logging mode is enabled").default(false))
    .action(verifyParticlesPacked);

  verifyCommand
    .command("particles-unpacked")
    .description("verify unpacked particles")
    .addOption(new Option("-v, --verbose", "Whether verbose logging mode is enabled").default(false))
    .action(verifyParticlesUnpacked);

  verifyCommand
    .command("translations")
    .description("verify translation dictionaries for missing or invalid entries")
    .addOption(new Option("-l, --language <locale>", "verify single locale instead of all at once"))
    .addOption(new Option("-s, --strict", "Fail on missing entries").default(false))
    .addOption(new Option("-v, --verbose", "Whether verbose logging mode is enabled").default(false))
    .action(verifyTranslations);
}
