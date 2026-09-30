import { describe, expect, it, jest } from "@jest/globals";
import { level } from "xray16";
import { TProbability, TSection } from "xray16/lib";
import { $fromObject } from "xray16/macros";

import { EWeatherPeriodType, TWeatherGraph } from "@/engine/core/managers/weather";
import {
  getLevelWeatherPeriods,
  getNextWeatherFromGraph,
  getWeatherPeriodDuration,
  isIndoorWeather,
  isPreBlowoutWeather,
  isTransitionWeather,
} from "@/engine/core/managers/weather/utils/weather_generic";

describe("getNextWeatherFromGraph", () => {
  it("should correctly get next possible weather from graph", () => {
    const graph: TWeatherGraph = $fromObject<TSection, TProbability>({
      clear: 0.25,
      cloudy: 0.25,
      rainy: 0.25,
      storm: 0.25,
    });

    jest.spyOn(math, "random").mockImplementationOnce(() => 1);
    expect(getNextWeatherFromGraph(graph)).toBe("storm");

    jest.spyOn(math, "random").mockImplementationOnce(() => 0.75);
    expect(getNextWeatherFromGraph(graph)).toBe("rainy");

    jest.spyOn(math, "random").mockImplementationOnce(() => 0.5);
    expect(getNextWeatherFromGraph(graph)).toBe("cloudy");

    jest.spyOn(math, "random").mockImplementationOnce(() => 0.25);
    expect(getNextWeatherFromGraph(graph)).toBe("clear");

    jest.spyOn(math, "random").mockImplementationOnce(() => 0);
    expect(getNextWeatherFromGraph(graph)).toBe("clear");
  });

  it("should correctly get next possible weather from empty graph", () => {
    expect(getNextWeatherFromGraph($fromObject<TSection, TProbability>({}))).toBeNull();
  });
});

describe("getLevelWeatherPeriods", () => {
  it("should get weather periods of levels", () => {
    jest.spyOn(level, "name").mockImplementationOnce(() => "unknown");
    expect(getLevelWeatherPeriods()).toEqual({
      periodBad: "foggy_rainy",
      periodBadLength: 6,
      periodGood: "clear_foggy",
      periodGoodLength: 6,
    });

    jest.spyOn(level, "name").mockImplementationOnce(() => "zaton");
    expect(getLevelWeatherPeriods()).toEqual({
      periodBad: "rainy",
      periodBadLength: 6,
      periodGood: "clear_foggy",
      periodGoodLength: 6,
    });

    jest.spyOn(level, "name").mockImplementationOnce(() => "jupiter");
    expect(getLevelWeatherPeriods()).toEqual({
      periodBad: "foggy_rainy",
      periodBadLength: 4,
      periodGood: "clear",
      periodGoodLength: 8,
    });
  });
});

describe("getWeatherPeriodDuration", () => {
  it("should get period durations for zaton", () => {
    jest.spyOn(level, "name").mockImplementationOnce(() => "zaton");
    jest.spyOn(math, "random").mockImplementationOnce((_, max) => max || 0);
    expect(getWeatherPeriodDuration(EWeatherPeriodType.GOOD)).toBe(7 * 3600);

    jest.spyOn(level, "name").mockImplementationOnce(() => "zaton");
    jest.spyOn(math, "random").mockImplementationOnce((min) => min || 0);
    expect(getWeatherPeriodDuration(EWeatherPeriodType.GOOD)).toBe(5 * 3600);

    jest.spyOn(level, "name").mockImplementationOnce(() => "zaton");
    jest.spyOn(math, "random").mockImplementationOnce((_, max) => max || 0);
    expect(getWeatherPeriodDuration(EWeatherPeriodType.BAD)).toBe(7 * 3600);

    jest.spyOn(level, "name").mockImplementationOnce(() => "zaton");
    jest.spyOn(math, "random").mockImplementationOnce((min) => min || 0);
    expect(getWeatherPeriodDuration(EWeatherPeriodType.BAD)).toBe(5 * 3600);
  });

  it("should get period durations for jupiter", () => {
    jest.spyOn(level, "name").mockImplementationOnce(() => "jupiter");
    jest.spyOn(math, "random").mockImplementationOnce((_, max) => max || 0);
    expect(getWeatherPeriodDuration(EWeatherPeriodType.GOOD)).toBe(9 * 3600);

    jest.spyOn(level, "name").mockImplementationOnce(() => "jupiter");
    jest.spyOn(math, "random").mockImplementationOnce((min) => min || 0);
    expect(getWeatherPeriodDuration(EWeatherPeriodType.GOOD)).toBe(7 * 3600);

    jest.spyOn(level, "name").mockImplementationOnce(() => "jupiter");
    jest.spyOn(math, "random").mockImplementationOnce((_, max) => max || 0);
    expect(getWeatherPeriodDuration(EWeatherPeriodType.BAD)).toBe(5 * 3600);

    jest.spyOn(level, "name").mockImplementationOnce(() => "jupiter");
    jest.spyOn(math, "random").mockImplementationOnce((min) => min || 0);
    expect(getWeatherPeriodDuration(EWeatherPeriodType.BAD)).toBe(4 * 3600);
  });
});

describe("isIndoorWeather", () => {
  it("should check indoor weathers", () => {
    expect(isIndoorWeather("indoor_default")).toBe(true);
    expect(isIndoorWeather("indoor")).toBe(true);
    expect(isIndoorWeather("dynamic_default")).toBe(false);
    expect(isIndoorWeather("dynamic")).toBe(false);
    expect(isIndoorWeather("default")).toBe(false);
    expect(isIndoorWeather("another")).toBe(false);
  });
});

describe("isPreBlowoutWeather", () => {
  it("should check pre-blowout weathers", () => {
    expect(isPreBlowoutWeather("pre_blowout_default")).toBe(true);
    expect(isPreBlowoutWeather("pre_blowout")).toBe(true);
    expect(isPreBlowoutWeather("dynamic_default")).toBe(false);
    expect(isPreBlowoutWeather("dynamic")).toBe(false);
    expect(isPreBlowoutWeather("default")).toBe(false);
    expect(isPreBlowoutWeather("another")).toBe(false);
  });
});

describe("isTransitionWeather", () => {
  it("should check isTransitionWeather weathers", () => {
    expect(isTransitionWeather("transition_default")).toBe(true);
    expect(isTransitionWeather("transition")).toBe(true);
    expect(isTransitionWeather("pre_blowout")).toBe(false);
    expect(isTransitionWeather("dynamic_default")).toBe(false);
    expect(isTransitionWeather("dynamic")).toBe(false);
    expect(isTransitionWeather("default")).toBe(false);
    expect(isTransitionWeather("another")).toBe(false);
  });
});
