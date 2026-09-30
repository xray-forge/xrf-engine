import { ini_file } from "xray16";
import { IniFile } from "xray16/alias";

import { readIniSectionAsNumberMap } from "@/engine/core/ini";
import { readFogDistances, readLevelWeathersConfiguration } from "@/engine/core/managers/weather/utils/weather_config";

export const DYNAMIC_WEATHER_GRAPHS_LTX: IniFile = new ini_file("environment\\dynamic_weather_graphs.ltx");
export const WEATHER_MANAGER_LEVELS_LTX: IniFile = new ini_file("managers\\weather\\weather_manager_levels.ltx");

export const weatherConfig = {
  ATMOSFEAR_LEVEL_CONFIGS: readLevelWeathersConfiguration(WEATHER_MANAGER_LEVELS_LTX),
  // DOF settings based on weather section.
  // Key - section, value - probability.
  DOF_KERNELS: readIniSectionAsNumberMap(DYNAMIC_WEATHER_GRAPHS_LTX, "dof_kernels"),
  DOF_RATE: 1,
  // Weather section based fog setting.
  // Defines how far fog should be based on time / weather section.
  FOG_DISTANCES: readFogDistances(DYNAMIC_WEATHER_GRAPHS_LTX),
  // Whether current weather is considered underground.
  IS_UNDERGROUND_WEATHER: false,
};
