import { IniFile } from "xray16/alias";
import { TName } from "xray16/lib";

import { readIniNumber, readIniString } from "@/engine/core/ini";
import { EWeatherPeriod, ILevelWeatherPeriods } from "@/engine/core/managers/weather/weather_types";

/**
 * Read dynamic weather periods of levels, with defaults for levels the file does not list.
 *
 * @param ini - File to read data from or fallback to defaults.
 * @returns Weather periods by level name, `default` for unlisted levels.
 */
export function readLevelWeatherPeriods(ini: IniFile): LuaTable<TName, ILevelWeatherPeriods> {
  const list: LuaTable<TName, ILevelWeatherPeriods> = new LuaTable();

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
