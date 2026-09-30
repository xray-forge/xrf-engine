import { Nillable, TDuration, TName, TProbability, TSection } from "xray16/lib";

/**
 * Name of atmosfear weather base.
 *
 * @inline
 */
export const ATMOSFEAR_WEATHER: TName = "atmosfear";

/**
 * Prefix of the weather cycles atmosfear weather plays, one per weather state.
 *
 * @inline
 */
export const ATMOSFEAR_CYCLE_PREFIX: TName = "w_";

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
 * Definition of generic level weather configuration.
 */
export interface IAtmosfearLevelWeatherConfig {
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
