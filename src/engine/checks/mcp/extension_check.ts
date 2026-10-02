import { command_line } from "xray16";

import { mcpConfig } from "@/engine/checks/mcp/McpConfig";
import { IExtensionCheckResult } from "@/engine/core/extensions";

/**
 * @returns Whether the engine was launched with the flag arming the endpoint, as a whole argument.
 */
export function isMcpArmed(): boolean {
  return ` ${command_line() ?? ""} `.indexOf(` ${mcpConfig.LAUNCH_FLAG} `) >= 0;
}

/**
 * @returns Whether the endpoint may start, which needs the launch flag.
 */
export function check(): IExtensionCheckResult {
  return {
    enabled: isMcpArmed(),
    reason: string.format("Starts only when the game is launched with '%s'.", mcpConfig.LAUNCH_FLAG),
  };
}
