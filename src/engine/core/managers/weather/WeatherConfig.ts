import { ini_file } from "xray16";
import { IniFile } from "xray16/alias";

import { readLevelWeatherPeriods } from "@/engine/core/managers/weather/utils/weather_config";

export const DYNAMIC_WEATHER_GRAPHS_LTX: IniFile = new ini_file("environment\\dynamic_weather_graphs.ltx");
export const WEATHER_MANAGER_LEVELS_LTX: IniFile = new ini_file("managers\\weather\\weather_manager_levels.ltx");

export const weatherConfig = {
  LEVEL_WEATHER_PERIODS: readLevelWeatherPeriods(WEATHER_MANAGER_LEVELS_LTX),
  // Whether current weather is considered underground.
  IS_UNDERGROUND_WEATHER: false,
};
