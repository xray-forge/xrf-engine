import { level } from "xray16";
import { containsSubstring, Nillable, TDuration, TName, TRate } from "xray16/lib";

import { EWeatherPeriodType, ILevelWeatherPeriods, TWeatherGraph } from "@/engine/core/managers/weather/weather_types";
import { weatherConfig } from "@/engine/core/managers/weather/WeatherConfig";

/**
 * Get one of possible weathers from change weather graph.
 *
 * @param graph - List of weather-probability pairs to toggle.
 * @returns Next weather selected from possibilities graph.
 */
export function getNextWeatherFromGraph(graph: TWeatherGraph): TName {
  let totalProbability: TRate = 0;

  // todo: Probably store total probability in graph or supply as parameter.
  for (const [, probability] of graph) {
    totalProbability += probability;
  }

  let random: TRate = math.random() * totalProbability;
  let next: Nillable<TName> = null;

  // Iterate over possible weathers and try to pick one of them based on their weight.
  for (const [weatherName, weatherProbability] of graph) {
    next = weatherName;
    random -= weatherProbability;

    if (random <= 0) {
      break;
    }
  }

  return next as TName;
}

/**
 * @returns Dynamic weather periods of the current level, defaults for levels without their own.
 */
export function getLevelWeatherPeriods(): ILevelWeatherPeriods {
  return weatherConfig.LEVEL_WEATHER_PERIODS.get(level.name()) ?? weatherConfig.LEVEL_WEATHER_PERIODS.get("default");
}

/**
 * Get how long a weather period lasts on the current level.
 * Randomized between 2/3 of the configured length and the full length, plus the hour it starts in.
 *
 * @param period - Type of weather period.
 * @returns Period duration in game seconds.
 */
export function getWeatherPeriodDuration(period: EWeatherPeriodType): TDuration {
  const length: TDuration =
    period === EWeatherPeriodType.GOOD
      ? getLevelWeatherPeriods().periodGoodLength
      : getLevelWeatherPeriods().periodBadLength;

  return (1 + math.random(math.ceil((length * 2) / 3), length)) * 3600;
}

/**
 * Check if weather section is pre-blowout.
 *
 * @param weather - Section of weather to check.
 * @returns Whether weather section is pre-blowout.
 */
export function isPreBlowoutWeather(weather: TName): boolean {
  return containsSubstring(weather, "pre_blowout");
}

/**
 * Check if weather section is transition.
 *
 * @param weather - Section of weather to check.
 * @returns Whether weather section is transitioning.
 */
export function isTransitionWeather(weather: TName): boolean {
  return containsSubstring(weather, "transition");
}
