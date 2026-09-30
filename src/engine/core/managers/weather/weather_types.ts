import { TDuration, TName, TProbability } from "xray16/lib";

/**
 * Level `weathers` value for dynamic weather: period graphs of weather states, `dynamic_<period>` sections.
 *
 * @inline
 */
export const DYNAMIC_WEATHER: TName = "dynamic";

/**
 * Prefix of the weather cycles dynamic weather plays, one per weather state.
 *
 * @inline
 */
export const WEATHER_CYCLE_PREFIX: TName = "w_";

/**
 * Type of active period.
 * Where good weather is clear and shiny, bad - storms, rain, fog.
 */
export const enum EWeatherPeriodType {
  GOOD = "good",
  BAD = "bad",
}

/**
 * Weather period a level plays, the `dynamic_<period>` graph of its good or bad weather.
 */
export const enum EWeatherPeriod {
  CLEAR = "clear",
  CLEAR_FOGGY = "clear_foggy",
  FOGGY = "foggy",
  FOGGY_RAINY = "foggy_rainy",
  RAINY = "rainy",
  STORMY = "stormy",
}

/**
 * Weather graph: weights of the weather states it picks one of every game hour.
 */
export type TWeatherGraph = LuaTable<TName, TProbability>;

/**
 * Dynamic weather periods of a level, with their lengths in hours.
 */
export interface ILevelWeatherPeriods {
  periodGood: EWeatherPeriod;
  periodGoodLength: TDuration;
  periodBad: EWeatherPeriod;
  periodBadLength: TDuration;
}
