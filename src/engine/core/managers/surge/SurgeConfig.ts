import { ini_file } from "xray16";
import { IniFile } from "xray16/alias";
import { FALSE, TIndex, TRUE } from "xray16/lib";

import { parseConditionsList, readIniNumber, readIniSectionAsSet } from "@/engine/core/ini";
import { ISurgeCoverDescriptor } from "@/engine/core/managers/surge/surge_types";

export const SURGE_MANAGER_CONFIG_LTX: IniFile = new ini_file("managers\\surge_manager.ltx");

export const surgeConfig = {
  IS_STARTED: false,
  IS_FINISHED: true,
  IS_TIME_FORWARDED: false,
  // General.
  CAN_START_SURGE: SURGE_MANAGER_CONFIG_LTX.line_exist("config", "condlist")
    ? parseConditionsList(SURGE_MANAGER_CONFIG_LTX.r_string("config", "condlist"))
    : parseConditionsList(TRUE),
  CAN_SURVIVE_SURGE: SURGE_MANAGER_CONFIG_LTX.line_exist("config", "survive")
    ? parseConditionsList(SURGE_MANAGER_CONFIG_LTX.r_string("config", "survive"))
    : parseConditionsList(FALSE),
  DURATION: readIniNumber(SURGE_MANAGER_CONFIG_LTX, "config", "duration", false, 190),
  INTERVAL_MIN: readIniNumber(SURGE_MANAGER_CONFIG_LTX, "config", "interval_min", false, 43_200),
  INTERVAL_MAX: readIniNumber(SURGE_MANAGER_CONFIG_LTX, "config", "interval_max", false, 86_400),
  INTERVAL_MIN_FIRST_TIME: readIniNumber(SURGE_MANAGER_CONFIG_LTX, "config", "interval_min_first_time", false, 7_200),
  INTERVAL_MAX_FIRST_TIME: readIniNumber(SURGE_MANAGER_CONFIG_LTX, "config", "interval_max_first_time", false, 14_400),
  INTERVAL_MIN_AFTER_TIME_FORWARD: readIniNumber(
    SURGE_MANAGER_CONFIG_LTX,
    "config",
    "interval_min_after_time_forward",
    false,
    3600
  ),
  INTERVAL_MAX_AFTER_TIME_FORWARD: readIniNumber(
    SURGE_MANAGER_CONFIG_LTX,
    "config",
    "interval_max_after_time_forward",
    false,
    10800
  ),
  // Effectors.
  SURGE_SHOCK_PP_EFFECTOR_ID: 1,
  EARTHQUAKE_CAM_EFFECTOR_ID: 2,
  // Effectors of the actor knocked out by a surge they survive.
  SURVIVE_CAM_EFFECTOR_ID: 3,
  SURVIVE_FADE_PP_EFFECTOR_ID: 4,
  // Detailed.
  SURGE_COVERS: new LuaTable<TIndex, ISurgeCoverDescriptor>(),
  IMMUNE_SQUAD_COMMUNITIES: readIniSectionAsSet(SURGE_MANAGER_CONFIG_LTX, "immune_squad_communities"),
  SURGE_DISABLED_LEVELS: readIniSectionAsSet(SURGE_MANAGER_CONFIG_LTX, "surge_disabled_levels"),
  UNDERGROUND_LEVELS: readIniSectionAsSet(SURGE_MANAGER_CONFIG_LTX, "surge_underground_levels"),
};
