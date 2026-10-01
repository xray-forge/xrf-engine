import { beforeAll, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { level } from "xray16";
import { MockGameObject } from "xray16/mocks";

import { getManager } from "@/engine/core/database";
import { surgeConfig, SurgeManager } from "@/engine/core/managers/surge";
import { WeatherManager } from "@/engine/core/managers/weather";
import { callXrEffect, resetRegistry } from "@/fixtures/engine";

beforeAll(() => {
  require("@/engine/declarations/effects/world/set_game_time");
});

beforeEach(() => {
  resetRegistry();
});

describe("set_game_time", () => {
  it("should advance the clock to the next requested time and force weather refresh", () => {
    const weatherManager: WeatherManager = getManager(WeatherManager);

    getManager(SurgeManager);

    jest.spyOn(level, "get_time_hours").mockReturnValue(12);
    jest.spyOn(level, "get_time_minutes").mockReturnValue(30);
    jest.spyOn(weatherManager, "forceWeatherChange").mockImplementation(jest.fn());

    callXrEffect("set_game_time", MockGameObject.mockActor(), MockGameObject.mock(), "14", "15");

    expect(level.change_game_time).toHaveBeenCalledWith(0, 1, 45);
    expect(weatherManager.forceWeatherChange).toHaveBeenCalledTimes(1);
    expect(surgeConfig.IS_TIME_FORWARDED).toBe(true);
  });

  it("should wrap to the next day when the requested hour already passed", () => {
    jest.spyOn(getManager(WeatherManager), "forceWeatherChange").mockImplementation(jest.fn());
    jest.spyOn(level, "get_time_hours").mockReturnValue(20);
    jest.spyOn(level, "get_time_minutes").mockReturnValue(30);

    callXrEffect("set_game_time", MockGameObject.mockActor(), MockGameObject.mock(), "8", "45");

    expect(level.change_game_time).toHaveBeenCalledWith(0, 12, 15);
  });

  it("should only move the minutes when the requested hour is the current one", () => {
    jest.spyOn(getManager(WeatherManager), "forceWeatherChange").mockImplementation(jest.fn());
    jest.spyOn(level, "get_time_hours").mockReturnValue(12);
    jest.spyOn(level, "get_time_minutes").mockReturnValue(10);

    callXrEffect("set_game_time", MockGameObject.mockActor(), MockGameObject.mock(), "12", "40");

    expect(level.change_game_time).toHaveBeenCalledWith(0, 0, 30);
  });

  it("should default the minutes to zero when they are not provided", () => {
    jest.spyOn(getManager(WeatherManager), "forceWeatherChange").mockImplementation(jest.fn());
    jest.spyOn(level, "get_time_hours").mockReturnValue(10);
    jest.spyOn(level, "get_time_minutes").mockReturnValue(20);

    callXrEffect("set_game_time", MockGameObject.mockActor(), MockGameObject.mock(), "12");

    expect(level.change_game_time).toHaveBeenCalledWith(0, 1, 40);
  });
});
