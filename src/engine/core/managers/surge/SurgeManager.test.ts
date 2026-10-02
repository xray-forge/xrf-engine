import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { game, level } from "xray16";
import { GameObject, Time } from "xray16/alias";
import { ACTOR_ID, AnyObject, createTime } from "xray16/lib";
import { EMockPacketDataType, MockGameObject, MockNetProcessor } from "xray16/mocks";
import { replaceFunctionMock, resetFunctionMock } from "xray16/testing/utils";

import { animations } from "@/engine/constants/animation";
import { disposeManager, getManager, registry } from "@/engine/core/database";
import { ActorInputManager, EActorControlHandle } from "@/engine/core/managers/actor";
import { EGameEvent, EventsManager } from "@/engine/core/managers/events";
import { updateAnomalyZonesDisplay } from "@/engine/core/managers/map/utils";
import { SoundManager } from "@/engine/core/managers/sounds/SoundManager";
import { surgeConfig } from "@/engine/core/managers/surge/SurgeConfig";
import { SurgeManager } from "@/engine/core/managers/surge/SurgeManager";
import {
  getNearestAvailableSurgeCover,
  initializeSurgeCovers,
  isSurgeEnabledOnLevel,
  killAllSurgeUnhidden,
} from "@/engine/core/managers/surge/utils";
import { WeatherManager } from "@/engine/core/managers/weather/WeatherManager";
import { resetRegistry } from "@/fixtures/engine";

jest.mock("@/engine/core/managers/map/utils");
jest.mock("@/engine/core/managers/surge/utils");

describe("SurgeManager", () => {
  beforeEach(() => {
    resetRegistry();

    resetFunctionMock(initializeSurgeCovers);
    resetFunctionMock(getNearestAvailableSurgeCover);
    resetFunctionMock(isSurgeEnabledOnLevel);
    resetFunctionMock(killAllSurgeUnhidden);
    resetFunctionMock(updateAnomalyZonesDisplay);
    resetFunctionMock(level.stop_weather_fx);

    surgeConfig.IS_STARTED = false;
    surgeConfig.IS_TIME_FORWARDED = false;
  });

  it("should correctly initialize and destroy", () => {
    const eventsManager: EventsManager = getManager(EventsManager);

    getManager(SurgeManager);

    expect(eventsManager.getSubscribersCount()).toBe(5);
    expect(eventsManager.getEventSubscribersCount(EGameEvent.ACTOR_REINIT)).toBe(1);
    expect(eventsManager.getEventSubscribersCount(EGameEvent.GAME_TIME_FORWARDED)).toBe(1);
    expect(eventsManager.getEventSubscribersCount(EGameEvent.DUMP_LUA_DATA)).toBe(1);
    expect(eventsManager.getEventSubscribersCount(EGameEvent.ACTOR_GO_ONLINE)).toBe(1);
    expect(eventsManager.getEventSubscribersCount(EGameEvent.ACTOR_UPDATE)).toBe(1);

    disposeManager(SurgeManager);

    expect(eventsManager.getSubscribersCount()).toBe(0);
  });

  it("should correctly handle saving/loading in general case", () => {
    const manager: SurgeManager = getManager(SurgeManager);
    const processor: MockNetProcessor = new MockNetProcessor();

    manager.nextScheduledSurgeDelay = 4500;

    manager.save(processor.asNetPacket());

    expect(manager.isAfterGameLoad).toBe(false);

    expect(processor.writeDataOrder).toEqual([
      EMockPacketDataType.BOOLEAN,
      EMockPacketDataType.BOOLEAN,
      EMockPacketDataType.U8,
      EMockPacketDataType.U8,
      EMockPacketDataType.U8,
      EMockPacketDataType.U8,
      EMockPacketDataType.U8,
      EMockPacketDataType.U8,
      EMockPacketDataType.U16,
      EMockPacketDataType.U32,
      EMockPacketDataType.U16,
    ]);
    expect(processor.dataList).toEqual([true, false, 12, 6, 12, 9, 30, 0, 0, 4500, 10]);

    disposeManager(SurgeManager);

    const newManager: SurgeManager = getManager(SurgeManager);

    newManager.load(processor.asNetReader());

    expect(newManager.isAfterGameLoad).toBe(false);
    expect(processor.readDataOrder).toEqual(processor.writeDataOrder);
    expect(processor.dataList).toHaveLength(0);
    expect(newManager).not.toBe(manager);

    expect(newManager.nextScheduledSurgeDelay).toBe(4500);
  });

  it("should correctly handle saving/loading when surge started", () => {
    surgeConfig.IS_STARTED = true;

    const manager: SurgeManager = getManager(SurgeManager);
    const processor: MockNetProcessor = new MockNetProcessor();

    manager.nextScheduledSurgeDelay = 530;

    manager.isTaskGiven = true;
    manager.isEffectorSet = true;
    manager.isSecondMessageGiven = true;
    manager.isUiDisabled = true;
    manager.isBlowoutSoundStarted = true;
    manager.surgeTaskSection = "test_task";

    manager.save(processor.asNetPacket());

    expect(manager.isAfterGameLoad).toBe(false);

    expect(processor.writeDataOrder).toEqual([
      EMockPacketDataType.BOOLEAN,
      EMockPacketDataType.BOOLEAN,
      EMockPacketDataType.U8,
      EMockPacketDataType.U8,
      EMockPacketDataType.U8,
      EMockPacketDataType.U8,
      EMockPacketDataType.U8,
      EMockPacketDataType.U8,
      EMockPacketDataType.U16,
      EMockPacketDataType.U8,
      EMockPacketDataType.U8,
      EMockPacketDataType.U8,
      EMockPacketDataType.U8,
      EMockPacketDataType.U8,
      EMockPacketDataType.U8,
      EMockPacketDataType.U16,
      EMockPacketDataType.BOOLEAN,
      EMockPacketDataType.BOOLEAN,
      EMockPacketDataType.BOOLEAN,
      EMockPacketDataType.BOOLEAN,
      EMockPacketDataType.BOOLEAN,
      EMockPacketDataType.STRING,
      EMockPacketDataType.U32,
      EMockPacketDataType.U16,
    ]);
    expect(processor.dataList).toEqual([
      true,
      true,
      12,
      6,
      12,
      9,
      30,
      0,
      0,
      12,
      6,
      12,
      9,
      30,
      0,
      0,
      true,
      true,
      true,
      true,
      true,
      "test_task",
      530,
      23,
    ]);

    disposeManager(SurgeManager);

    const newManager: SurgeManager = getManager(SurgeManager);

    newManager.load(processor.asNetReader());

    expect(processor.readDataOrder).toEqual(processor.writeDataOrder);
    expect(processor.dataList).toHaveLength(0);
    expect(newManager).not.toBe(manager);

    expect(newManager.isAfterGameLoad).toBe(true);
    expect(newManager.nextScheduledSurgeDelay).toBe(530);
    expect(newManager.isTaskGiven).toBe(true);
    expect(newManager.isEffectorSet).toBe(true);
    expect(newManager.isSecondMessageGiven).toBe(true);
    expect(newManager.isUiDisabled).toBe(true);
    expect(newManager.isBlowoutSoundStarted).toBe(true);
    expect(newManager.surgeTaskSection).toBe("test_task");

    surgeConfig.IS_STARTED = false;
  });

  it("should reset stale transient state when loading an inactive surge", () => {
    const manager: SurgeManager = getManager(SurgeManager);
    const processor: MockNetProcessor = new MockNetProcessor();

    surgeConfig.IS_STARTED = false;
    manager.save(processor.asNetPacket());

    manager.currentDuration = 123;
    manager.isTaskGiven = true;
    manager.isEffectorSet = true;
    manager.isSecondMessageGiven = true;
    manager.isUiDisabled = true;
    manager.shouldNotifySkip = false;
    manager.isBlowoutSoundStarted = true;
    manager.surgeTaskSection = "stale_task";

    manager.load(processor.asNetReader());

    expect(manager.currentDuration).toBe(0);
    expect(manager.isTaskGiven).toBe(false);
    expect(manager.isEffectorSet).toBe(false);
    expect(manager.isSecondMessageGiven).toBe(false);
    expect(manager.isUiDisabled).toBe(false);
    expect(manager.shouldNotifySkip).toBe(true);
    expect(manager.isBlowoutSoundStarted).toBe(false);
    expect(manager.surgeTaskSection).toBe("");
    expect(processor.readDataOrder).toEqual(processor.writeDataOrder);
    expect(processor.dataList).toHaveLength(0);
  });

  it("should mark the surge task as given even for an empty task section", () => {
    const manager: SurgeManager = getManager(SurgeManager);

    manager.surgeTaskSection = "empty";
    (manager as AnyObject).giveSurgeHideTask();

    expect(manager.isTaskGiven).toBe(true);
  });

  it("should correctly get nearest available cover before forcing a surge", () => {
    const manager: SurgeManager = getManager(SurgeManager);
    const cover: GameObject = MockGameObject.mock();

    jest.mocked(getNearestAvailableSurgeCover).mockReturnValue(cover);
    jest.spyOn(manager, "start");

    manager.requestSurgeStart();

    expect(getNearestAvailableSurgeCover).toHaveBeenCalledWith(registry.actor);
    expect(manager.start).toHaveBeenCalledWith(true);
  });

  it("should report only the next skipped surge once enabled", () => {
    const manager: SurgeManager = getManager(SurgeManager);

    jest.spyOn(EventsManager, "emitEvent");

    manager.shouldNotifySkip = false;
    manager.enableSkipNotification();
    manager.skipSurge();
    manager.skipSurge();

    expect(EventsManager.emitEvent).toHaveBeenNthCalledWith(1, EGameEvent.SURGE_SKIPPED, true);
    expect(EventsManager.emitEvent).toHaveBeenNthCalledWith(2, EGameEvent.SURGE_SKIPPED, false);
  });

  it("should skip a surge silently on levels without surges", () => {
    const manager: SurgeManager = getManager(SurgeManager);

    jest.mocked(isSurgeEnabledOnLevel).mockReturnValue(false);
    jest.spyOn(EventsManager, "emitEvent");

    manager.start(true);

    expect(surgeConfig.IS_STARTED).toBe(false);
    expect(EventsManager.emitEvent).toHaveBeenCalledWith(EGameEvent.SURGE_SKIPPED, false);
  });

  it("should correctly set surge task", () => {
    const manager: SurgeManager = getManager(SurgeManager);

    manager.setSurgeTask("custom_surge_task");

    expect(manager.surgeTaskSection).toBe("custom_surge_task");
  });

  it("should check whether the blowout rumble of a started surge plays", () => {
    const manager: SurgeManager = getManager(SurgeManager);

    manager.isBlowoutSoundStarted = true;

    expect(manager.isBlowoutSoundPlaying()).toBe(false);

    surgeConfig.IS_STARTED = true;

    expect(manager.isBlowoutSoundPlaying()).toBe(true);

    manager.isBlowoutSoundStarted = false;

    expect(manager.isBlowoutSoundPlaying()).toBe(false);
  });

  it("should report a skipped and an ended surge for artefacts to respawn", () => {
    const manager: SurgeManager = getManager(SurgeManager);

    jest.spyOn(EventsManager, "emitEvent");

    manager.initializedAt = createTime(2012, 6, 12, 10, 0, 0, 0);
    manager.skipSurge();
    manager.endSurge();

    expect(EventsManager.emitEvent).toHaveBeenCalledWith(EGameEvent.SURGE_SKIPPED, true);
    expect(EventsManager.emitEvent).toHaveBeenCalledWith(EGameEvent.SURGE_ENDED);
  });

  it("should correctly check if is killing all now", () => {
    const manager: SurgeManager = getManager(SurgeManager);

    expect(manager.isKillingAll()).toBe(false);

    surgeConfig.IS_STARTED = true;
    manager.isUiDisabled = true;

    expect(manager.isKillingAll()).toBe(true);
  });

  it("should correctly request surge start only when a cover is available", () => {
    const manager: SurgeManager = getManager(SurgeManager);

    jest.spyOn(manager, "start");

    manager.requestSurgeStart();

    expect(manager.start).not.toHaveBeenCalled();

    jest.mocked(getNearestAvailableSurgeCover).mockReturnValue(MockGameObject.mock());

    manager.requestSurgeStart();

    expect(manager.start).toHaveBeenCalledTimes(1);
    expect(manager.start).toHaveBeenCalledWith(true);
  });

  it("should correctly request surge stop only for an active surge", () => {
    const manager: SurgeManager = getManager(SurgeManager);

    jest.spyOn(manager, "endSurge");

    manager.requestSurgeStop();
    expect(manager.endSurge).not.toHaveBeenCalled();

    surgeConfig.IS_STARTED = true;
    manager.requestSurgeStop();

    expect(manager.endSurge).toHaveBeenCalledWith(true);
  });

  it("should correctly start an enabled forced surge", () => {
    const manager: SurgeManager = getManager(SurgeManager);

    jest.mocked(isSurgeEnabledOnLevel).mockReturnValue(true);

    manager.start(true);

    expect(isSurgeEnabledOnLevel).toHaveBeenCalled();
    expect(manager.initializedAt.get(0, 0, 0, 0, 0, 0, 0)).toEqual(game.get_game_time().get(0, 0, 0, 0, 0, 0, 0));
    expect(surgeConfig.IS_STARTED).toBe(true);
    expect(surgeConfig.IS_FINISHED).toBe(false);
  });

  it("should correctly skip surges", () => {
    const manager: SurgeManager = getManager(SurgeManager);

    manager.initializedAt = createTime(2012, 6, 12, 10, 0, 0, 0);
    manager.isTaskGiven = true;
    manager.isEffectorSet = true;
    manager.isSecondMessageGiven = true;
    manager.isUiDisabled = true;
    manager.isBlowoutSoundStarted = true;

    manager.skipSurge();

    expect(surgeConfig.IS_STARTED).toBe(false);
    expect(surgeConfig.IS_FINISHED).toBe(true);
    // The skipped surge counts as finished once its full duration passed from its start.
    expect(manager.lastSurgeAt.get(0, 0, 0, 0, 0, 0, 0)).toEqual(
      createTime(2012, 6, 12, 10, 0, surgeConfig.DURATION, 0).get(0, 0, 0, 0, 0, 0, 0)
    );
    expect(manager.isTaskGiven).toBe(false);
    expect(manager.isEffectorSet).toBe(false);
    expect(manager.isSecondMessageGiven).toBe(false);
    expect(manager.isUiDisabled).toBe(false);
    expect(manager.isBlowoutSoundStarted).toBe(false);
  });

  it("should correctly end surges", () => {
    const manager: SurgeManager = getManager(SurgeManager);

    surgeConfig.IS_STARTED = true;
    manager.isAfterGameLoad = true;
    manager.isEffectorSet = true;
    manager.isSecondMessageGiven = true;
    manager.isUiDisabled = true;
    manager.isBlowoutSoundStarted = true;

    manager.endSurge();

    expect(surgeConfig.IS_STARTED).toBe(false);
    expect(surgeConfig.IS_FINISHED).toBe(true);
    expect(manager.isEffectorSet).toBe(false);
    expect(manager.isSecondMessageGiven).toBe(false);
    expect(manager.isUiDisabled).toBe(false);
    expect(manager.isBlowoutSoundStarted).toBe(false);
    expect(manager.isAfterGameLoad).toBe(false);
    expect(killAllSurgeUnhidden).toHaveBeenCalledTimes(1);
  });

  it("should stop the blowout rumble when a surge ends before its shock stage", () => {
    const manager: SurgeManager = getManager(SurgeManager);
    const soundManager: SoundManager = getManager(SoundManager);

    jest.spyOn(soundManager, "stopLooped").mockImplementation(jest.fn());

    surgeConfig.IS_STARTED = true;
    manager.isTaskGiven = true;
    manager.isBlowoutSoundStarted = true;

    manager.requestSurgeStop();

    expect(soundManager.stopLooped).toHaveBeenCalledWith(ACTOR_ID, "blowout_rumble");
    expect(soundManager.stopLooped).toHaveBeenCalledWith(ACTOR_ID, "surge_earthquake_sound_looped");
  });

  it("should stop the surge weather effect only when one plays", () => {
    const manager: SurgeManager = getManager(SurgeManager);
    const weatherManager: WeatherManager = getManager(WeatherManager);

    jest.spyOn(weatherManager, "forceWeatherChange").mockImplementation(jest.fn());

    manager.endSurge(true);

    expect(level.stop_weather_fx).not.toHaveBeenCalled();
    expect(weatherManager.forceWeatherChange).not.toHaveBeenCalled();

    jest.spyOn(level, "is_wfx_playing").mockReturnValueOnce(true);

    manager.endSurge(true);

    expect(level.stop_weather_fx).toHaveBeenCalledTimes(1);
    expect(weatherManager.forceWeatherChange).toHaveBeenCalledTimes(1);
  });

  it("should let the surge weather effect run its course when a surge ends on time", () => {
    const manager: SurgeManager = getManager(SurgeManager);

    jest.spyOn(level, "is_wfx_playing").mockReturnValueOnce(true);

    manager.endSurge();

    expect(level.stop_weather_fx).not.toHaveBeenCalled();
  });

  it("should end an active surge with its kill when forwarded time outlasts it", () => {
    const manager: SurgeManager = getManager(SurgeManager);
    const now: Time = createTime(2012, 6, 12, 20, 15, 30, 200);

    surgeConfig.IS_STARTED = true;

    // Almost no surge time left, so 35 minutes pass beyond its end.
    jest.spyOn(now, "diffSec").mockImplementation(() => surgeConfig.DURATION);
    replaceFunctionMock(game.get_game_time, () => now);
    replaceFunctionMock(level.get_time_factor, () => 1);
    jest.spyOn(manager, "endSurge").mockImplementation(jest.fn());

    manager.forwardSurgeTime(35);

    expect(surgeConfig.IS_TIME_FORWARDED).toBe(true);
    expect(manager.isUiDisabled).toBe(true);
    expect(killAllSurgeUnhidden).toHaveBeenCalledTimes(1);
    expect(manager.endSurge).toHaveBeenCalledTimes(1);
  });

  it("should leave an active surge running when forwarded time does not outlast it", () => {
    const manager: SurgeManager = getManager(SurgeManager);
    const now: Time = createTime(2012, 6, 12, 20, 15, 30, 200);

    surgeConfig.IS_STARTED = true;

    jest.spyOn(now, "diffSec").mockImplementation(() => 0);
    replaceFunctionMock(game.get_game_time, () => now);
    replaceFunctionMock(level.get_time_factor, () => 1_000);
    jest.spyOn(manager, "endSurge").mockImplementation(jest.fn());

    manager.forwardSurgeTime(45);

    expect(surgeConfig.IS_TIME_FORWARDED).toBe(false);
    expect(killAllSurgeUnhidden).not.toHaveBeenCalled();
    expect(manager.endSurge).not.toHaveBeenCalled();
  });

  it("should not forward time of a surge that is not running", () => {
    const manager: SurgeManager = getManager(SurgeManager);

    jest.spyOn(manager, "endSurge").mockImplementation(jest.fn());

    manager.forwardSurgeTime(1_000);

    expect(manager.endSurge).not.toHaveBeenCalled();
  });

  it("should correctly handle update event by starting a due surge", () => {
    const manager: SurgeManager = getManager(SurgeManager);

    manager.nextScheduledSurgeDelay = 0;
    jest.mocked(getNearestAvailableSurgeCover).mockReturnValue(MockGameObject.mock());
    jest.spyOn(manager, "start");

    manager.update();

    expect(manager.start).toHaveBeenCalledWith();
  });

  it("should wake the actor knocked out by a survived surge", () => {
    const manager: SurgeManager = getManager(SurgeManager);

    manager.onSurgeSurviveStart();

    expect(level.add_cam_effector).toHaveBeenCalledWith(
      animations.camera_effects_surge_01,
      surgeConfig.SURVIVE_CAM_EFFECTOR_ID,
      false,
      "engine.surge_survive_end"
    );
  });

  it("should show actor UI once the actor woke up from a survived surge", () => {
    const manager: SurgeManager = getManager(SurgeManager);
    const actorInputManager: ActorInputManager = getManager(ActorInputManager);

    jest.spyOn(actorInputManager, "releaseGameUiControl").mockImplementation(jest.fn());

    manager.onSurgeSurviveEnd();

    expect(actorInputManager.releaseGameUiControl).toHaveBeenCalledWith(EActorControlHandle.SURGE, true);
  });

  it("should not read game time while created, as the game starts before game time exists", () => {
    const getGameTime = jest.spyOn(game, "get_game_time");

    getGameTime.mockClear();
    getManager(SurgeManager);

    expect(getGameTime).not.toHaveBeenCalled();
  });

  it("should count the time to the first surge from actor reinit", () => {
    const manager: SurgeManager = getManager(SurgeManager);
    const now = game.get_game_time();

    jest.spyOn(game, "get_game_time").mockImplementationOnce(() => now);

    EventsManager.emitEvent(EGameEvent.ACTOR_REINIT);

    expect(manager.lastSurgeAt).toBe(now);
  });

  it("should correctly handle actor going online", () => {
    const manager: SurgeManager = getManager(SurgeManager);

    expect(initializeSurgeCovers).toHaveBeenCalledTimes(0);

    manager.onActorGoOnline();

    expect(initializeSurgeCovers).toHaveBeenCalledTimes(1);
  });

  it("should note game time forwarded for its schedule", () => {
    getManager(SurgeManager);

    EventsManager.emitEvent(EGameEvent.GAME_TIME_FORWARDED);

    expect(surgeConfig.IS_TIME_FORWARDED).toBe(true);
  });

  it("should correctly handle debug dump event", () => {
    const manager: SurgeManager = getManager(SurgeManager);
    const data: AnyObject = {};

    EventsManager.emitEvent(EGameEvent.DUMP_LUA_DATA, data);

    expect(data).toEqual({ SurgeManager: expect.any(Object) });
    expect(manager.onDebugDump({})).toEqual({ SurgeManager: expect.any(Object) });
  });
});
