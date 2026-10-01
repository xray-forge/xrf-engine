import { ini_file } from "xray16";
import { IniFile } from "xray16/alias";
import { TIndex, TNumberId } from "xray16/lib";

import { readIniNumber } from "@/engine/core/ini";

const RELEASE_BODY_MANAGER_LTX: IniFile = new ini_file("managers\\release_body_manager.ltx");

export const deathConfig = {
  MIN_DISTANCE_SQR: Math.pow(readIniNumber(RELEASE_BODY_MANAGER_LTX, "config", "min_distance") ?? 70, 2),
  IDLE_AFTER_DEATH: readIniNumber(RELEASE_BODY_MANAGER_LTX, "config", "idle_after_death") ?? 60_000,
  MAX_BODY_COUNT: readIniNumber(RELEASE_BODY_MANAGER_LTX, "config", "max_body_count") ?? 15,
  // Identifiers of corpses that can be released, in the order they were registered.
  RELEASE_OBJECTS_REGISTRY: new LuaTable<TIndex, TNumberId>(),
};
