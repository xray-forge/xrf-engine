import { beforeEach, describe, expect, it } from "@jest/globals";
import { get_console } from "xray16";
import { Console } from "xray16/alias";
import { resetFunctionMock } from "xray16/testing/utils";

import { getManager } from "@/engine/core/database";
import { WeatherManager } from "@/engine/core/managers/weather";
import { resetDof, updateDof } from "@/engine/core/managers/weather/utils/weather_dof";
import { resetRegistry } from "@/fixtures/engine";

describe("resetDof", () => {
  beforeEach(() => {
    resetFunctionMock(get_console().execute);
  });

  it("should correctly apply dof commands", () => {
    const console: Console = get_console();

    resetDof();

    expect(console.execute).toHaveBeenCalledTimes(2);
    expect(console.execute).toHaveBeenCalledWith("r2_dof_far 800");
    expect(console.execute).toHaveBeenCalledWith("r2_dof_kernel 2");
  });
});

describe("updateDof", () => {
  beforeEach(() => {
    resetRegistry();
    resetFunctionMock(get_console().execute);
  });

  it("should correctly fail if weather is not set / initialized", () => {
    const manager: WeatherManager = getManager(WeatherManager);

    expect(() => updateDof(manager)).toThrow(
      "Could not find fog distance descriptor for weather switch pair 'nil -> nil'"
    );

    manager.currentWeatherSection = "test";

    expect(() => updateDof(manager)).toThrow(
      "Could not find fog distance descriptor for weather switch pair 'test -> nil'"
    );

    manager.currentWeatherSection = null;
    manager.nextWeatherSection = "test";

    expect(() => updateDof(manager)).toThrow(
      "Could not find fog distance descriptor for weather switch pair 'nil -> test'"
    );
  });

  it("should correctly switch dof without weather fx", () => {
    const manager: WeatherManager = getManager(WeatherManager);
    const console: Console = get_console();

    manager.currentWeatherSection = "clear";
    manager.nextWeatherSection = "veryfoggy";
    manager.lastUpdatedAtHour = 10;

    updateDof(manager);

    expect(console.execute).toHaveBeenCalledWith("r2_dof_far 265");
    expect(console.execute).toHaveBeenCalledWith("r2_dof_kernel 6");

    manager.weatherFxStartedAt = 1;
    manager.lastUpdatedAtSecond = 10;

    updateDof(manager);

    expect(console.execute).toHaveBeenCalledWith("r2_dof_far 200");
    expect(console.execute).toHaveBeenCalledWith("r2_dof_kernel 4");

    manager.lastUpdatedAtSecond = 16;

    updateDof(manager);

    expect(manager.weatherFxStartedAt).toBeNull();
    expect(manager.weatherFxEndedAt).toBeNull();
  });

  it("should correctly switch dof with weather fx", () => {
    const manager: WeatherManager = getManager(WeatherManager);
    const console: Console = get_console();

    manager.weatherFx = "test";
    manager.currentWeatherSection = "clear";
    manager.nextWeatherSection = "veryfoggy";
    manager.lastUpdatedAtHour = 10;

    updateDof(manager);

    expect(console.execute).toHaveBeenCalledTimes(0);

    manager.weatherFxStartedAt = 5;
    manager.lastUpdatedAtSecond = 15;

    updateDof(manager);

    expect(console.execute).toHaveBeenCalledWith("r2_dof_far 247");
    expect(console.execute).toHaveBeenCalledWith("r2_dof_kernel 5");

    manager.lastUpdatedAtSecond = 16;

    updateDof(manager);

    expect(console.execute).toHaveBeenCalledTimes(4);

    manager.weatherFxEndedAt = 15;

    updateDof(manager);

    expect(console.execute).toHaveBeenCalledTimes(4);
  });
});
