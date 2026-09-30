import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { game, level } from "xray16";
import { AnyObject } from "xray16/lib";
import { EMockPacketDataType, MockNetProcessor } from "xray16/mocks";
import { getFunctionMock, resetFunctionMock } from "xray16/testing/utils";

import { disposeManager, getManager } from "@/engine/core/database";
import { parseConditionsList } from "@/engine/core/ini";
import { EGameEvent, EventsManager } from "@/engine/core/managers/events";
import { SurgeManager } from "@/engine/core/managers/surge";
import { EWeatherPeriodType } from "@/engine/core/managers/weather/weather_types";
import { weatherConfig } from "@/engine/core/managers/weather/WeatherConfig";
import { WeatherManager } from "@/engine/core/managers/weather/WeatherManager";
import { resetRegistry } from "@/fixtures/engine";

describe("WeatherManager", () => {
  beforeEach(() => {
    resetRegistry();

    weatherConfig.IS_UNDERGROUND_WEATHER = false;

    resetFunctionMock(level.is_wfx_playing);
    resetFunctionMock(level.set_weather);
    resetFunctionMock(level.start_weather_fx_from_time);
    getFunctionMock(level.is_wfx_playing).mockReturnValue(false);
  });

  it("should correctly initialize and destroy", () => {
    const weatherManager: WeatherManager = getManager(WeatherManager);
    const eventsManager: EventsManager = getManager(EventsManager);

    expect(weatherManager.weatherPeriod).toBe("good");
    expect(weatherManager.weatherPeriodDuration).toBe(0);
    expect(weatherManager.weatherState).toBeNull();
    expect(weatherManager.savedWeatherFx).toBeNull();

    expect(eventsManager.getSubscribersCount()).toBe(3);
    expect(eventsManager.getEventSubscribersCount(EGameEvent.DUMP_LUA_DATA)).toBe(1);
    expect(eventsManager.getEventSubscribersCount(EGameEvent.ACTOR_UPDATE_2500)).toBe(1);
    expect(eventsManager.getEventSubscribersCount(EGameEvent.ACTOR_GO_ONLINE)).toBe(1);

    disposeManager(WeatherManager);

    expect(eventsManager.getSubscribersCount()).toBe(0);
  });

  it("should play a state of the level graph on actor spawn", () => {
    const manager: WeatherManager = getManager(WeatherManager);

    jest.spyOn(level, "name").mockImplementation(() => "zaton");

    EventsManager.emitEvent(EGameEvent.ACTOR_GO_ONLINE);

    expect(weatherConfig.IS_UNDERGROUND_WEATHER).toBe(false);
    expect(manager.weatherPeriod).toBe("good");
    expect(manager.weatherPeriodDuration).toBeGreaterThan(0);
    expect(manager.weatherSection).toBe("dynamic_clear_foggy");
    expect(manager.weatherState).toMatch(/^(clear|partly|foggy)$/);
    expect(level.set_weather).toHaveBeenCalledWith(`w_${manager.weatherState}`, true);
    expect(level.start_weather_fx_from_time).not.toHaveBeenCalled();
  });

  it("should keep the loaded state of the level graph on actor spawn", () => {
    const manager: WeatherManager = getManager(WeatherManager);

    jest.spyOn(level, "name").mockImplementation(() => "zaton");

    manager.weatherSection = "dynamic_clear_foggy";
    manager.weatherState = "foggy";

    EventsManager.emitEvent(EGameEvent.ACTOR_GO_ONLINE);

    expect(manager.weatherState).toBe("foggy");
    expect(level.set_weather).toHaveBeenCalledWith("w_foggy", true);
  });

  it("should pick a new state when the level plays another graph", () => {
    const manager: WeatherManager = getManager(WeatherManager);

    jest.spyOn(level, "name").mockImplementation(() => "zaton");

    manager.weatherSection = "dynamic_rainy";
    manager.weatherState = "storm";

    EventsManager.emitEvent(EGameEvent.ACTOR_GO_ONLINE);

    expect(manager.weatherSection).toBe("dynamic_clear_foggy");
    expect(manager.weatherState).toMatch(/^(clear|partly|foggy)$/);
  });

  it("should resume the saved weather effect once its cycle is set on actor spawn", () => {
    const manager: WeatherManager = getManager(WeatherManager);

    jest.spyOn(level, "name").mockImplementation(() => "zaton");

    manager.savedWeatherFx = "fx_surge_day_3";
    manager.savedWeatherFxTime = 42;

    EventsManager.emitEvent(EGameEvent.ACTOR_GO_ONLINE);

    expect(level.start_weather_fx_from_time).toHaveBeenCalledWith("fx_surge_day_3", 42);
    expect(getFunctionMock(level.set_weather).mock.invocationCallOrder[0]).toBeLessThan(
      getFunctionMock(level.start_weather_fx_from_time).mock.invocationCallOrder[0]
    );
    expect(manager.savedWeatherFx).toBeNull();
  });

  it("should play the named cycle for levels with fixed weather", () => {
    const manager: WeatherManager = getManager(WeatherManager);

    manager.weatherConditionList = parseConditionsList("indoor");
    manager.weatherState = "clear";
    manager.updateWeather(true);

    expect(manager.weatherSection).toBe("indoor");
    expect(manager.weatherState).toBeNull();
    expect(level.set_weather).toHaveBeenCalledWith("indoor", true);
  });

  it("should not cut into a playing weather effect", () => {
    const manager: WeatherManager = getManager(WeatherManager);

    getFunctionMock(level.is_wfx_playing).mockReturnValue(true);

    manager.weatherConditionList = parseConditionsList("indoor");
    manager.updateWeather(true);

    expect(level.set_weather).toHaveBeenCalledWith("indoor", false);
  });

  it("should correctly save and load data", () => {
    const manager: WeatherManager = getManager(WeatherManager);
    const processor: MockNetProcessor = new MockNetProcessor();

    manager.weatherSection = "dynamic_clear";
    manager.weatherState = "partly";
    manager.weatherPeriod = EWeatherPeriodType.BAD;

    manager.save(processor.asNetPacket());

    expect(processor.writeDataOrder).toEqual([
      EMockPacketDataType.STRING,
      EMockPacketDataType.STRING,
      EMockPacketDataType.STRING,
      EMockPacketDataType.U8,
      EMockPacketDataType.U8,
      EMockPacketDataType.U8,
      EMockPacketDataType.U8,
      EMockPacketDataType.U8,
      EMockPacketDataType.U8,
      EMockPacketDataType.U16,
      EMockPacketDataType.STRING,
      EMockPacketDataType.U16,
    ]);

    disposeManager(WeatherManager);

    const newManager: WeatherManager = getManager(WeatherManager);

    newManager.load(processor.asNetReader());

    expect(processor.readDataOrder).toEqual(processor.writeDataOrder);
    expect(processor.dataList).toHaveLength(0);
    expect(newManager).not.toBe(manager);
    expect(newManager.weatherSection).toBe("dynamic_clear");
    expect(newManager.weatherState).toBe("partly");
    expect(newManager.weatherPeriod).toBe(EWeatherPeriodType.BAD);
    expect(newManager.weatherPeriodChangedAt.diffSec(manager.weatherPeriodChangedAt)).toBe(0);
    expect(newManager.savedWeatherFx).toBeNull();
  });

  it("should correctly save and load a fixed weather during a weather effect", () => {
    const manager: WeatherManager = getManager(WeatherManager);
    const processor: MockNetProcessor = new MockNetProcessor();

    getFunctionMock(level.is_wfx_playing).mockReturnValue(true);
    jest.spyOn(level, "get_weather").mockReturnValueOnce("fx_surge_day_3");
    jest.spyOn(level, "get_wfx_time").mockReturnValueOnce(42);

    manager.weatherSection = "indoor";
    manager.weatherState = null;

    manager.save(processor.asNetPacket());

    expect(processor.writeDataOrder.slice(-3)).toEqual([
      EMockPacketDataType.STRING,
      EMockPacketDataType.F32,
      EMockPacketDataType.U16,
    ]);

    disposeManager(WeatherManager);

    const newManager: WeatherManager = getManager(WeatherManager);

    newManager.load(processor.asNetReader());

    expect(processor.readDataOrder).toEqual(processor.writeDataOrder);
    expect(processor.dataList).toHaveLength(0);
    expect(newManager.weatherSection).toBe("indoor");
    expect(newManager.weatherState).toBeNull();
    expect(newManager.savedWeatherFx).toBe("fx_surge_day_3");
    expect(newManager.savedWeatherFxTime).toBe(42);
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
    expect(level.set_weather).toHaveBeenCalledWith("test_weather", true);
  });

  it("should pick a new state once every game hour", () => {
    const manager: WeatherManager = getManager(WeatherManager);
    let stateOnUpdate: unknown = undefined;

    manager.lastUpdatedAtHour = 5;
    manager.weatherState = "clear";

    jest.spyOn(level, "get_time_hours").mockReturnValue(6);
    jest.spyOn(manager, "changePeriod").mockImplementation(jest.fn());
    jest.spyOn(manager, "updateWeather").mockImplementation(() => (stateOnUpdate = manager.weatherState));

    manager.update();
    manager.update();

    expect(manager.lastUpdatedAtHour).toBe(6);
    expect(manager.changePeriod).toHaveBeenCalledTimes(1);
    expect(manager.updateWeather).toHaveBeenCalledTimes(1);
    expect(stateOnUpdate).toBeNull();
  });

  it("should correctly handle debug dump event", () => {
    const manager: WeatherManager = getManager(WeatherManager);
    const data: AnyObject = {};

    EventsManager.emitEvent(EGameEvent.DUMP_LUA_DATA, data);

    expect(data).toEqual({ WeatherManager: expect.any(Object) });
    expect(manager.onDebugDump({})).toEqual({ WeatherManager: expect.any(Object) });
  });
});
