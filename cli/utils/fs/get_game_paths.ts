import * as path from "node:path";

import { getAppPath } from "steam-path";

import { default as config } from "#/config.json";
import { exists } from "#/utils/fs/exists";

const GAME_PATHS = {
  root: "",
  app: config.targets.stalker_app_path || "Stalker-COP.exe",
  appdata: "_appdata_",
  logs: "_appdata_/logs",
  savedgames: "_appdata_/savedgames",
  screenshots: "_appdata_/screenshots",
  gamedata: "gamedata",
  bin: "bin",
  binXrfBackup: "bin_xrf_backup",
  binJson: "bin/bin.json",
};

type TGamePaths = typeof GAME_PATHS;

/**
 * Get absolute paths to the game assets/executables/directories.
 * Todo: Memoize paths?
 */
export async function getGamePaths(): Promise<TGamePaths> {
  const { path: gamePath } = await getAppPath(config.targets.stalker_game_steam_id).catch(() => {
    // Cases:
    // - Steam not found
    // - Game is not installed
    // - Game was installed, but windows registry was not updated (or no OS reset after install)
    return { path: config.targets.stalker_game_fallback_path };
  });

  if (!(await exists(gamePath))) {
    throw new Error(`Suggested game path does not exist: '${gamePath}'.`);
  }

  return Object.entries(GAME_PATHS).reduce((paths, [name, location]) => {
    const normalPath: string = path.normalize(location);
    const isAbsolute: boolean = path.isAbsolute(normalPath);

    paths[name as keyof TGamePaths] = isAbsolute ? normalPath : path.join(gamePath, normalPath);

    return paths;
  }, {} as TGamePaths);
}
