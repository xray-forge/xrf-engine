import { beforeAll, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { level } from "xray16";
import { MockGameObject } from "xray16/mocks";

import { getManager } from "@/engine/core/database";
import { surgeConfig, SurgeManager } from "@/engine/core/managers/surge";
import { WeatherManager } from "@/engine/core/managers/weather";
import { callXrEffect, resetRegistry } from "@/fixtures/engine";

beforeAll(() => {
  require("@/engine/declarations/effects/world/forward_game_time");
});

beforeEach(() => {
  resetRegistry();
});

describe("forward_game_time", () => {
  it("should advance the clock by the requested duration and force weather refresh", () => {
    const weatherManager: WeatherManager = getManager(WeatherManager);

    getManager(SurgeManager);

    jest.spyOn(weatherManager, "forceWeatherChange").mockImplementation(jest.fn());

    callXrEffect("forward_game_time", MockGameObject.mockActor(), MockGameObject.mock(), "2", "15");

    expect(level.change_game_time).toHaveBeenCalledWith(0, 2, 15);
    expect(weatherManager.forceWeatherChange).toHaveBeenCalledTimes(1);
    expect(surgeConfig.IS_TIME_FORWARDED).toBe(true);
  });
});
