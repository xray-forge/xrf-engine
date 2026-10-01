import { ini_file } from "xray16";
import { IniFile } from "xray16/alias";

import { readIniNumber } from "@/engine/core/ini";

export const ALIFE_CONFIG_LTX: IniFile = new ini_file("alife.ltx");

// Values of the engine alife config used by scripts.
export const alifeConfig = {
  OBJECT_CAPTURE_SCRIPT_NAME: "xrf",
  SWITCH_DISTANCE: readIniNumber(ALIFE_CONFIG_LTX, "alife", "switch_distance", true),
  SWITCH_DISTANCE_SQR: Math.pow(readIniNumber(ALIFE_CONFIG_LTX, "alife", "switch_distance", true), 2),
  OBJECT_INITIAL_SPAWN_BUFFER_TIME: readIniNumber(ALIFE_CONFIG_LTX, "alife", "object_initial_spawn_buffer_time", true),
  OBJECTS_PER_UPDATE: readIniNumber(ALIFE_CONFIG_LTX, "alife", "objects_per_update", true),
};
