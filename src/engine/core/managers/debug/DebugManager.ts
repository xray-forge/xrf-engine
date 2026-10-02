import { getFS } from "xray16";
import { AnyObject, TCount, TPath } from "xray16/lib";
import { $filename } from "xray16/macros";

import { roots } from "@/engine/constants/roots";
import { SYSTEM_INI } from "@/engine/core/database";
import { AbstractManager } from "@/engine/core/managers/abstract";
import { EGameEvent, EventsManager } from "@/engine/core/managers/events";
import { saveTextToFile } from "@/engine/core/utils/fs";
import { LuaLogger } from "@/engine/core/utils/logging";
import { toJSON } from "@/engine/core/utils/transform";

const logger: LuaLogger = new LuaLogger($filename);

/**
 * Manager to handle debugging actions / switching / dumps etc.
 */
export class DebugManager extends AbstractManager {
  /**
   * Force collection of unreachable Lua values.
   */
  public collectLuaGarbage(): void {
    collectgarbage("collect");
  }

  /**
   * Get the memory currently allocated by the Lua VM.
   *
   * @returns Memory usage in kilobytes.
   */
  public getLuaMemoryUsed(): TCount {
    return collectgarbage("count");
  }

  /**
   * Dump in-memory lua data from various configs / managers.
   */
  public dumpLuaData(): AnyObject {
    const folder: TPath = getFS().update_path(roots.appDataRoot, "dumps");
    const name: TPath = "lua_data.json";

    logger.info("Dumping LUA state data as '%s'", name);

    const data: AnyObject = {};

    EventsManager.emitEvent(EGameEvent.DUMP_LUA_DATA, data);

    saveTextToFile(folder, name, toJSON(data));

    return data;
  }

  /**
   * Dump in-memory system.ini representation as text file.
   * Combines all included files as single text entity.
   */
  public dumpSystemIni(): void {
    const path: TPath = getFS().update_path(roots.appDataRoot, "dumps\\system.ltx");

    logger.info("Saving system ini as '%s'", path);
    SYSTEM_INI.save_as(path);
  }
}
