import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { game, level } from "xray16";
import { AnyObject, TName, TProbability } from "xray16/lib";
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
    resetFunctionMock(level.set_weather);
    getFunctionMock(level.is_wfx_playing).mockReturnValue(false);
  });

  it("should correctly initialize and destroy", () => {
    const weatherManager: WeatherManager = getManager(WeatherManager);
    const eventsManager: EventsManager = getManager(EventsManager);

    expect(weatherManager.weatherPeriod).toBe("good");
    expect(weatherManager.weatherPeriodDuration).toBe(0);
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

    jest.spyOn(level, "name").mockImplementation(() => "zaton");

    eventsManager.emitEvent(EGameEvent.ACTOR_GO_ONLINE);

    expect(weatherConfig.IS_UNDERGROUND_WEATHER).toBe(false);
    expect(manager.weatherPeriod).toBe("good");
    expect(manager.weatherPeriodDuration).toBeGreaterThan(0);
    expect(manager.weatherSection).toBe("dynamic_clear_foggy");
    expect(String(getFunctionMock(level.set_weather).mock.calls[0][0])).toMatch(/^w_(clear|partly|foggy)$/);
  });

  it("should play the named cycle for levels with fixed weather", () => {
    const manager: WeatherManager = getManager(WeatherManager);

    manager.weatherConditionList = parseConditionsList("indoor");
    manager.updateWeather(true);

    expect(manager.weatherSection).toBe("indoor");
    expect(manager.weatherState).toEqualLuaTables({});
    expect(level.set_weather).toHaveBeenCalledWith("indoor", true);
  });

  it("should correctly set state", () => {
    const manager: WeatherManager = getManager(WeatherManager);

    manager.setStateAsString("dynamic_clear=clear,partly;atmosfear_clear=clear,partly");

    expect(table.size(manager.weatherState)).toBe(1);
    expect(manager.weatherState).toEqualLuaTables(
      $fromObject<string, IWeatherState>({
        dynamic_clear: {
          currentState: "clear",
          weatherGraph: $fromObject<TName, TProbability>({
            clear: 0.5,
            cloudy: 0,
            foggy: 0,
            partly: 0.5,
            rain: 0,
            storm: 0,
            veryfoggy: 0,
          }),
          weatherName: "dynamic_clear",
          nextState: "partly",
        },
      })
    );
  });

  it("should correctly save and load data", () => {
    const manager: WeatherManager = getManager(WeatherManager);
    const processor: MockNetProcessor = new MockNetProcessor();

    manager.setStateAsString("dynamic_clear=clear,partly");
    manager.weatherSection = "test_weather";
    manager.weatherPeriod = EWeatherPeriodType.GOOD;
    manager.lastUpdatedAtHour = 11;

    manager.save(processor.asNetPacket());

    expect(processor.writeDataOrder).toEqual([
      EMockPacketDataType.STRING,
      EMockPacketDataType.STRING,
      EMockPacketDataType.U8,
      EMockPacketDataType.U8,
      EMockPacketDataType.U8,
      EMockPacketDataType.U8,
      EMockPacketDataType.U8,
      EMockPacketDataType.U8,
      EMockPacketDataType.U16,
      EMockPacketDataType.U32,
      EMockPacketDataType.STRING,
      EMockPacketDataType.STRING,
      EMockPacketDataType.U16,
    ]);

    disposeManager(WeatherManager);

    const newManager: WeatherManager = getManager(WeatherManager);

    newManager.load(processor.asNetReader());

    expect(processor.readDataOrder).toEqual(processor.writeDataOrder);
    expect(processor.dataList).toHaveLength(0);
    expect(newManager).not.toBe(manager);
    expect(newManager.weatherSection).toBe("test_weather");
    expect(newManager.lastUpdatedAtHour).toBe(11);
    expect(newManager.weatherPeriodChangedAt.diffSec(manager.weatherPeriodChangedAt)).toBe(0);
    expect(manager.weatherState).toEqual(newManager.weatherState);
    expect(manager.weatherFx).toEqual(newManager.weatherFx);
  });

  it("should keep weather periods until their duration passed", () => {
    const manager: WeatherManager = getManager(WeatherManager);
    const surgeManager: SurgeManager = getManager(SurgeManager);
    const changedAt = game.get_game_time();
    const now = { diffSec: (it: unknown) => (it === changedAt ? 1800 : 0) };

    surgeManager.nextScheduledSurgeDelay = 100_000;
    manager.weatherPeriod = EWeatherPeriodType.GOOD;
    manager.weatherPeriodChangedAt = changedAt;
    manager.weatherPeriodDuration = 3600;

    jest.spyOn(game, "get_game_time").mockImplementationOnce(() => now as never);

    manager.changePeriod();

    expect(manager.weatherPeriod).toBe(EWeatherPeriodType.GOOD);
    expect(manager.weatherPeriodChangedAt).toBe(changedAt);
    expect(manager.isWeatherPeriodTransition).toBe(false);
  });

  it("should change weather periods after a time skip past their change", () => {
    const manager: WeatherManager = getManager(WeatherManager);
    const surgeManager: SurgeManager = getManager(SurgeManager);
    const changedAt = game.get_game_time();
    const now = { diffSec: (it: unknown) => (it === changedAt ? 8 * 3600 : 0) };

    surgeManager.nextScheduledSurgeDelay = 100_000;
    manager.weatherPeriod = EWeatherPeriodType.GOOD;
    manager.weatherPeriodChangedAt = changedAt;
    manager.weatherPeriodDuration = 3600;

    jest.spyOn(game, "get_game_time").mockImplementationOnce(() => now as never);

    manager.changePeriod();

    expect(manager.weatherPeriod).toBe(EWeatherPeriodType.BAD);
    expect(manager.weatherPeriodChangedAt).toBe(now);
    expect(manager.weatherPeriodDuration).toBeGreaterThan(0);
    expect(manager.isWeatherPeriodTransition).toBe(true);
  });

  it("should hold the weather period an hour longer before a surge", () => {
    const manager: WeatherManager = getManager(WeatherManager);
    const surgeManager: SurgeManager = getManager(SurgeManager);
    const changedAt = game.get_game_time();
    const now = { diffSec: (it: unknown) => (it === changedAt ? 3600 : 100_000 - 3000) };

    surgeManager.nextScheduledSurgeDelay = 100_000;
    manager.weatherPeriod = EWeatherPeriodType.GOOD;
    manager.weatherPeriodChangedAt = changedAt;
    manager.weatherPeriodDuration = 3600;

    jest.spyOn(game, "get_game_time").mockImplementationOnce(() => now as never);

    manager.changePeriod();

    expect(manager.isWeatherPeriodPreBlowout).toBe(true);
    expect(manager.weatherPeriodDuration).toBe(7200);
    expect(manager.weatherPeriod).toBe(EWeatherPeriodType.GOOD);
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
