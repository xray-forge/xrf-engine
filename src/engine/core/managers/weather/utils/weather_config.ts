import { ini_file } from "xray16";
import { IniFile } from "xray16/alias";
import { hoursToWeatherPeriod, TCount, TDistance, TName, TSection } from "xray16/lib";
import { $filename } from "xray16/macros";

import { readIniNumber, readIniString } from "@/engine/core/ini";
import {
  ATMOSFEAR_CYCLE_PREFIX,
  EWeatherPeriod,
  IAtmosfearLevelWeatherConfig,
} from "@/engine/core/managers/weather/weather_types";
import { LuaLogger } from "@/engine/core/utils/logging";

const logger: LuaLogger = new LuaLogger($filename);

/**
 * Read fog distance based on current weather cycles/periods.
 *
 * @param ini - Target ini to read fog distances from.
 * @returns Object defining weather fog distance based on active cycle and daytime.
 */
export function readFogDistances(ini: IniFile): LuaTable<TSection, LuaTable<TSection, TDistance>> {
  const distances: LuaTable<TSection, LuaTable<TSection, TDistance>> = new LuaTable();
  const count: TCount = ini.line_count("dof_kernels");

  for (const index of $range(0, count - 1)) {
    const [, cycle] = ini.r_line("dof_kernels", index, "", "");

    const weatherCycle: LuaTable<TSection, TDistance> = new LuaTable();
    const weatherCycleLtx: IniFile = new ini_file(`environment\\weathers\\${ATMOSFEAR_CYCLE_PREFIX}${cycle}.ltx`);

    for (const index of $range(0, 23)) {
      const timePeriod: TSection = hoursToWeatherPeriod(index);

      weatherCycle.set(timePeriod, readIniNumber(weatherCycleLtx, timePeriod, "fog_distance", false, 500));
    }

    distances.set(cycle, weatherCycle);
  }

  logger.info("Read fog distances for %s cycles", count);

  return distances;
}

/**
 * Read configuration of level weathers.
 * Defines periods and durations of weather for specific levels.
 *
 * @param ini - File to read data from or fallback to defaults.
 * @returns Configuration of weather for levels.
 */
export function readLevelWeathersConfiguration(ini: IniFile): LuaTable<TName, IAtmosfearLevelWeatherConfig> {
  const list: LuaTable<TName, IAtmosfearLevelWeatherConfig> = new LuaTable();

  list.set("default", {
    periodBad: EWeatherPeriod.FOGGY_RAINY,
    periodBadLength: 6,
    periodGood: EWeatherPeriod.CLEAR_FOGGY,
    periodGoodLength: 6,
  });

  ini.section_for_each((level: TName): void => {
    list.set(level, {
      periodGood: readIniString(ini, level, "period_good", false, null, EWeatherPeriod.CLEAR_FOGGY),
      periodGoodLength: readIniNumber(ini, level, "period_good_length", false, 6),
      periodBad: readIniString(ini, level, "period_bad", false, null, EWeatherPeriod.FOGGY_RAINY),
      periodBadLength: readIniNumber(ini, level, "period_bad_length", false, 6),
    });
  });

  return list;
}
