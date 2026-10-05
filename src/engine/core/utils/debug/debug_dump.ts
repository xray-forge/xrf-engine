import { getFS } from "xray16";
import { AnyObject, TPath } from "xray16/lib";
import { $filename } from "xray16/macros";

import { roots } from "@/engine/constants/roots";
import { SYSTEM_INI } from "@/engine/core/database";
import { EGameEvent, EventsManager } from "@/engine/core/managers/events";
import { saveTextToFile } from "@/engine/core/utils/fs";
import { LuaLogger } from "@/engine/core/utils/logging";
import { toJSON } from "@/engine/core/utils/transform";

const logger: LuaLogger = new LuaLogger($filename);

/**
 * Dump the in-memory Lua data managers report through the dump event as JSON, into the user data `dumps` folder.
 *
 * @returns Path of the dump.
 */
export function dumpLuaData(): TPath {
  const data: AnyObject = {};

  EventsManager.emitEvent(EGameEvent.DUMP_LUA_DATA, data);

  return saveTextToFile(getFS().update_path(roots.appDataRoot, "dumps"), "lua_data.json", toJSON(data));
}

/**
 * Dump the in-memory `system.ini`, with every included file combined, into the user data `dumps` folder.
 *
 * @returns Path of the dump.
 */
export function dumpSystemIni(): TPath {
  const path: TPath = getFS().update_path(roots.appDataRoot, "dumps\\system.ltx");

  logger.info("Saving system ini as '%s'", path);
  SYSTEM_INI.save_as(path);

  return path;
}
