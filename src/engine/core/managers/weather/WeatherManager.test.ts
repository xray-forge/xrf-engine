import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { game, level } from "xray16";
import { AnyObject, NIL, TName, TProbability } from "xray16/lib";
import { $fromObject } from "xray16/macros";
import { EMockPacketDataType, MockNetProcessor } from "xray16/mocks";
import { getFunctionMock, resetFunctionMock } from "xray16/testing/utils";

import { disposeManager, getManager } from "@/engine/core/database";
import { parseConditionsList } from "@/engine/core/ini";
import { EGameEvent, EventsManager } from "@/engine/core/managers/events";
import { SurgeManager } from "@/engine/core/managers/surge";
import { EWeatherPeriodType, IWeatherState } from "@/engine/core/managers/weather/weather_types";
import { weatherConfig } from "@/engine/core/managers/weather/WeatherConfig";
import { WeatherManager } from "@/engine/core/managers/weather/WeatherManager";
import { resetRegistry } from "@/fixtures/engine";

describe("WeatherManager", () => {
  beforeEach(() => {
    resetRegistry();

    weatherConfig.IS_UNDERGROUND_WEATHER = false;

    resetFunctionMock(level.is_wfx_playing);
    getFunctionMock(level.is_wfx_playing).mockReturnValue(false);
  });

  it("should correctly initialize and destroy", () => {
    const weatherManager: WeatherManager = getManager(WeatherManager);
    const eventsManager: EventsManager = getManager(EventsManager);

    expect(weatherManager.weatherPeriod).toBe("good");
    expect(weatherManager.lastUpdatedAtHour).toBe(0);
    expect(weatherManager.weatherFxTime).toBe(0);

    expect(eventsManager.getSubscribersCount()).toBe(3);
    expect(eventsManager.getEventSubscribersCount(EGameEvent.DUMP_LUA_DATA)).toBe(1);
    expect(eventsManager.getEventSubscribersCount(EGameEvent.ACTOR_UPDATE_2500)).toBe(1);
    expect(eventsManager.getEventSubscribersCount(EGameEvent.ACTOR_GO_ONLINE)).toBe(1);

    disposeManager(WeatherManager);

    expect(eventsManager.getSubscribersCount()).toBe(0);
  });

  it("should correctly handle actor spawn", () => {
    const manager: WeatherManager = getManager(WeatherManager);
    const eventsManager: EventsManager = getManager(EventsManager);

    eventsManager.emitEvent(EGameEvent.ACTOR_GO_ONLINE);

    jest.spyOn(level, "name").mockImplementation(() => "zaton");

    expect(level.name()).toBe("zaton");
    expect(weatherConfig.IS_UNDERGROUND_WEATHER).toBe(false);
    expect(manager.weatherPeriod).toBe("good");
    expect(manager.weatherSection).toBe("atmosfear_clear_foggy");
    expect(String(getFunctionMock(level.set_weather).mock.calls[0][0])).toMatch(/^w_(clear|partly|foggy)$/);

    jest.spyOn(level, "name").mockImplementation(() => "jupiter_underground");

    expect(level.name()).toBe("jupiter_underground");
    expect(weatherConfig.IS_UNDERGROUND_WEATHER).toBe(false);

    jest.spyOn(level, "name").mockImplementation(() => "zaton");
  });

  it("should correctly set state", () => {
    const manager: WeatherManager = getManager(WeatherManager);

    manager.setStateAsString("dynamic_default=clear,cloudy");

    expect(table.size(manager.weatherState)).toBe(1);
    expect(manager.weatherState).toEqualLuaTables(
      $fromObject<string, IWeatherState>({
        dynamic_default: {
          currentState: "clear",
          weatherGraph: $fromObject<TName, TProbability>({
            clear: 0.2,
            cloudy: 0.2,
            foggy: 0.1,
            partly: 0.2,
            rain: 0.1,
            veryfoggy: 0.1,
          }),
          weatherName: "dynamic_default",
          nextState: "cloudy",
        },
      })
    );
  });

  it("should correctly save and load data", () => {
    const manager: WeatherManager = getManager(WeatherManager);
    const processor: MockNetProcessor = new MockNetProcessor();

    manager.setStateAsString("dynamic_default=clear,cloudy");
    manager.weatherSection = "test_weather";
    manager.weatherPeriod = EWeatherPeriodType.GOOD;
    manager.weatherLastPeriodChangeHour = 9;
    manager.weatherNextPeriodChangeHour = 13;
    manager.lastUpdatedAtHour = 11;

    manager.save(processor.asNetPacket());

    expect(processor.writeDataOrder).toEqual([
      EMockPacketDataType.STRING,
      EMockPacketDataType.STRING,
      EMockPacketDataType.U32,
      EMockPacketDataType.U32,
      EMockPacketDataType.U32,
      EMockPacketDataType.STRING,
      EMockPacketDataType.STRING,
      EMockPacketDataType.U16,
    ]);
    expect(processor.dataList).toEqual(["test_weather", "good", 9, 13, 11, "dynamic_default=clear,cloudy", NIL, 7]);

    disposeManager(WeatherManager);

    const newManager: WeatherManager = getManager(WeatherManager);

    newManager.load(processor.asNetReader());

    expect(processor.readDataOrder).toEqual(processor.writeDataOrder);
    expect(processor.dataList).toHaveLength(0);
    expect(newManager).not.toBe(manager);
    expect(manager.weatherState).toEqual(newManager.weatherState);
    expect(manager.weatherFx).toEqual(newManager.weatherFx);
  });

  it("should change weather periods when the scheduled hour is reached", () => {
    const manager: WeatherManager = getManager(WeatherManager);
    const surgeManager: SurgeManager = getManager(SurgeManager);

    jest.spyOn(level, "get_time_hours").mockReturnValue(12);
    surgeManager.lastSurgeAt = game.get_game_time();
    surgeManager.nextScheduledSurgeDelay = 10_000;
    manager.weatherPeriod = EWeatherPeriodType.GOOD;
    manager.weatherNextPeriodChangeHour = 12;

    manager.changePeriod();

    expect(manager.weatherPeriod).toBe(EWeatherPeriodType.BAD);
    expect(manager.weatherLastPeriodChangeHour).toBe(12);
    expect(manager.weatherNextPeriodChangeHour).not.toBe(12);
    expect(manager.isWeatherPeriodTransition).toBe(true);
  });

  it("should force the next weather update to apply immediately", () => {
    const manager: WeatherManager = getManager(WeatherManager);

    manager.weatherConditionList = parseConditionsList("test_weather");

    manager.forceWeatherChange();
    manager.updateWeather();

    expect(manager.shouldForceWeatherChangeOnTimeChange).toBe(false);
    expect(level.set_weather).toHaveBeenCalledWith(expect.any(String), true);
  });

  it("should advance hourly state and update weather", () => {
    const manager: WeatherManager = getManager(WeatherManager);

    manager.initializedAt = game.get_game_time();
    manager.lastUpdatedAtHour = 5;
    jest.spyOn(level, "get_time_hours").mockReturnValue(6);
    jest.spyOn(manager, "changePeriod").mockImplementation(jest.fn());
    jest.spyOn(manager, "updateWeather").mockImplementation(jest.fn());

    manager.update();

    expect(manager.lastUpdatedAtHour).toBe(6);
    expect(manager.changePeriod).toHaveBeenCalledTimes(1);
    expect(manager.updateWeather).toHaveBeenCalledTimes(1);
  });

  it("should correctly handle debug dump event", () => {
    const manager: WeatherManager = getManager(WeatherManager);
    const data: AnyObject = {};

    EventsManager.emitEvent(EGameEvent.DUMP_LUA_DATA, data);

    expect(data).toEqual({ WeatherManager: expect.any(Object) });
    expect(manager.onDebugDump({})).toEqual({ WeatherManager: expect.any(Object) });
  });
});
