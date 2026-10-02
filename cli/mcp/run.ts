import { Command, Option } from "commander";

import { buildMcp } from "#/mcp/build_mcp";
import { cleanMcp } from "#/mcp/clean_mcp";
import { serveMcp } from "#/mcp/serve_mcp";

/**
 * Setup game MCP commands.
 *
 * The game MCP lets agents drive a running game. Its endpoint is built only on demand, never by a release build.
 */
export function setupMcpCommands(command: Command): void {
  const mcpCommand: Command = command.command("mcp").description("game MCP endpoint for agents");

  mcpCommand
    .command("build")
    .description("transpile the game MCP endpoint into gamedata and write its extension")
    .addOption(new Option("-v, --verbose", "print verbose logs").default(false))
    .action(buildMcp);

  mcpCommand
    .command("clean")
    .description("remove the game MCP endpoint and its extension from gamedata")
    .addOption(new Option("-v, --verbose", "print verbose logs").default(false))
    .action(cleanMcp);

  mcpCommand.command("serve").description("serve the game tools to an MCP client over stdio").action(serveMcp);
}
