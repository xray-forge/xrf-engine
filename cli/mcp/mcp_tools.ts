import { IMcpTool } from "#/mcp/mcp_tool_types";
import { createDumpTools } from "#/mcp/tools/dump_tools";
import { createGameTools as createQueryTools } from "#/mcp/tools/game_tools";
import { createLogTools } from "#/mcp/tools/log_tools";
import { createSaveTools } from "#/mcp/tools/save_tools";
import { createScreenshotTools } from "#/mcp/tools/screenshot_tools";
import { createSessionTools } from "#/mcp/tools/session_tools";
import { IGameToolsContext } from "#/mcp/tools/tool_kit";

export type { IGameFolders, IGameToolsContext, IMcpWorkspace } from "#/mcp/tools/tool_kit";

/**
 * Create the game tools. A tool body that throws answers a failed result with the error message.
 *
 * @param context - What the tools reach outside the pipe.
 * @returns Tools to serve.
 */
export function createGameTools(context: IGameToolsContext): Array<IMcpTool> {
  return [
    ...createSessionTools(context),
    ...createQueryTools(context),
    ...createScreenshotTools(context),
    ...createLogTools(context),
    ...createDumpTools(context),
    ...createSaveTools(context),
  ];
}
