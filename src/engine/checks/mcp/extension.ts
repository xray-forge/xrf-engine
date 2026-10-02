import { time_global } from "xray16";
import { Nullable, TName } from "xray16/lib";
import { $filename } from "xray16/macros";

import { isMcpArmed } from "@/engine/checks/mcp/extension_check";
import { McpEndpoint } from "@/engine/checks/mcp/McpEndpoint";
import { NamedPipeTransport } from "@/engine/checks/mcp/NamedPipeTransport";
import { getManager } from "@/engine/core/database";
import { EGameEvent, EventsManager } from "@/engine/core/managers/events";
import { LuaLogger } from "@/engine/core/utils/logging";

const logger: LuaLogger = new LuaLogger($filename);

export const name: TName = "Game MCP endpoint";
// Started by the launch flag alone, not from the extensions menu.
export const canToggle: boolean = false;

/**
 * @returns Id of this game start or load, which a load changes as it restarts the Lua state.
 */
export function createMcpSession(): string {
  return `${os.time()}-${math.floor(time_global())}`;
}

/**
 * Start the endpoint and poll it on every actor update, and on every main menu update while the menu pauses the
 * game, when the launch flag armed it.
 *
 * @returns The endpoint started, or null when not armed.
 */
export function register(): Nullable<McpEndpoint> {
  if (!isMcpArmed()) {
    return null;
  }

  const endpoint: McpEndpoint = new McpEndpoint(new NamedPipeTransport(), createMcpSession());

  const eventsManager: EventsManager = getManager(EventsManager);

  eventsManager.registerCallback(EGameEvent.ACTOR_UPDATE, endpoint.update, endpoint);
  eventsManager.registerCallback(EGameEvent.MAIN_MENU_UPDATE, endpoint.update, endpoint);

  logger.info("Game MCP endpoint started: %s", endpoint.context.session);

  return endpoint;
}
