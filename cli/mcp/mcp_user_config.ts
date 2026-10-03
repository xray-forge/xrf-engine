import * as fs from "node:fs/promises";
import * as path from "node:path";

import { exists } from "#/utils/fs/exists";

/**
 * Settings file an MCP launch passes to `-ltx`, beside `user.ltx` in the app data folder.
 */
export const MCP_USER_CONFIG: string = "user_mcp.ltx";

/**
 * Console lines an MCP launch plays with: the game keeps running unfocused, a loaded level starts without waiting for a
 * key press, which also skips the new game intro that key press would start, and it renders with DirectX 11 whatever
 * renderer the owner last picked.
 */
export const MCP_FORCED_SETTINGS: ReadonlyArray<string> = [
  "rs_always_active on",
  "keypress_on_start 0",
  "renderer renderer_r4",
];

/**
 * Write the settings an MCP launch plays with: the owner's `user.ltx` with the forced settings replacing their own.
 * The console loads and saves the file `-ltx` names, so an agent's run never writes the owner's own settings.
 *
 * @param appdata - Game app data folder.
 * @returns Path of the written settings file.
 */
export async function prepareMcpUserConfig(appdata: string): Promise<string> {
  const source: string = path.join(appdata, "user.ltx");
  const target: string = path.join(appdata, MCP_USER_CONFIG);
  const forced: Set<string> = new Set(MCP_FORCED_SETTINGS.map((line) => line.split(" ")[0]));
  // Latin-1 keeps every byte as it is, whatever encoding the console wrote.
  const text: string = (await exists(source)) ? await fs.readFile(source, "latin1") : "";
  const lines: Array<string> = text.split(/\r?\n/).filter((line) => !forced.has(line.trim().split(/\s+/)[0]));

  while (lines.length > 0 && lines[lines.length - 1] === "") {
    lines.pop();
  }

  lines.push(...MCP_FORCED_SETTINGS);

  await fs.writeFile(target, lines.join("\r\n") + "\r\n", "latin1");

  return target;
}
