#! /usr/bin/env ts-node -P ./cli/tsconfig.json

import { Command } from "commander";

import { setupBuildCommands } from "#/build/run";
import { setupChecksCommands } from "#/checks/run";
import { setupCloneCommands } from "#/clone/run";
import { setupCompressCommands } from "#/compress/run";
import { setupEngineCommands } from "#/engine/run";
import { setupFormatCommands } from "#/format/run";
import { setupIconsCommand } from "#/icons/run";
import { setupLinkCommands } from "#/link/run";
import { setupLogsCommands } from "#/logs/run";
import { setupOpenCommands } from "#/open/run";
import { setupPackCommands } from "#/pack/run";
import { setupParseCommands } from "#/parse/run";
import { setupParticlesCommands } from "#/particles/run";
import { setupSpawnCommands } from "#/spawn/run";
import { setupStartCommands } from "#/start/run";
import { setupVerifyCommands } from "#/verify/run";

const program: Command = new Command("cli");

setupBuildCommands(program);
setupCloneCommands(program);
setupCompressCommands(program);
setupEngineCommands(program);
setupFormatCommands(program);
setupIconsCommand(program);
setupLinkCommands(program);
setupLogsCommands(program);
setupOpenCommands(program);
setupPackCommands(program);
setupParseCommands(program);
setupParticlesCommands(program);
setupChecksCommands(program);
setupSpawnCommands(program);
setupStartCommands(program);
setupVerifyCommands(program);

program.parse();
