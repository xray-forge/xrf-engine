import * as fs from "node:fs";
import * as path from "node:path";

import { LAUNCHER_PREFIXES } from "#/checks/utils/discover_checks";
import { TARGET_GAME_DATA_CHECKS_DIR, TARGET_GAME_DATA_DIR, TARGET_GAME_DATA_MCP_EXTENSION_DIR } from "#/globals/paths";

/**
 * Folders of dev-only output inside a gamedata tree: the check flows with the game MCP endpoint, and its extension.
 */
const DEV_ONLY_DIRECTORIES: Array<string> = [
  path.relative(TARGET_GAME_DATA_DIR, TARGET_GAME_DATA_CHECKS_DIR),
  path.relative(TARGET_GAME_DATA_DIR, TARGET_GAME_DATA_MCP_EXTENSION_DIR),
];

/**
 * @param gamedataDir - Gamedata tree to inspect.
 * @returns Dev-only output found in it, as paths relative to it: check flows, their launchers, the game MCP endpoint.
 */
export function findDevOnlyArtifacts(gamedataDir: string): Array<string> {
  const found: Array<string> = DEV_ONLY_DIRECTORIES.filter((it) => fs.existsSync(path.join(gamedataDir, it)));
  const scriptsDir: string = path.join(gamedataDir, "scripts");

  if (fs.existsSync(scriptsDir)) {
    for (const file of fs.readdirSync(scriptsDir)) {
      if (LAUNCHER_PREFIXES.some((prefix) => file.startsWith(prefix))) {
        found.push(path.join("scripts", file));
      }
    }
  }

  return found;
}

/**
 * Refuse to package a gamedata tree holding dev-only output, so moving its source by mistake breaks the build instead
 * of shipping check flows or the game MCP endpoint.
 *
 * @param gamedataDir - Gamedata tree about to be packaged or already copied into a package.
 */
export function assertNoDevOnlyArtifacts(gamedataDir: string): void {
  const found: Array<string> = findDevOnlyArtifacts(gamedataDir);

  if (found.length > 0) {
    throw new Error(
      `Refusing to package dev-only files in '${gamedataDir}': ${found.join(", ")}. ` +
        "Run `npm run cli checks clean`, which removes the game MCP endpoint too, and pack with `--clean` if an " +
        "earlier package kept them."
    );
  }
}
