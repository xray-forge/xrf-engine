import { Nillable, TDuration, TName, TProbability, TSection } from "xray16/lib";

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
 * Actual weather period.
 */
export const enum EWeatherPeriod {
  CLEAR = "clear",
  CLEAR_FOGGY = "clear_foggy",
  FOGGY = "foggy",
  FOGGY_RAINY = "foggy_rainy",
  RAINY = "rainy",
  PARTLY = "partly",
  STORMY = "stormy",
}

/**
 * Weather graph defining transitions between weathers.
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

/**
 * State of weather manager describing current graph node.
 */
export interface IWeatherState {
  currentState: Nillable<TSection>;
  nextState: Nillable<TSection>;
  weatherName: TName;
  weatherGraph: TWeatherGraph;
}
