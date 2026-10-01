import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { device, game, hit, level } from "xray16";
import { GameObject, Time } from "xray16/alias";
import { ACTOR_ID, AnyObject, createTime, TDuration, TRUE } from "xray16/lib";
import { MockGameObject } from "xray16/mocks";
import { replaceFunctionMock, resetFunctionMock } from "xray16/testing/utils";

import { animations, postProcessors } from "@/engine/constants/animation";
import { getManager, registry } from "@/engine/core/database";
import { parseConditionsList, TConditionList } from "@/engine/core/ini";
import { updateAnomalyZonesDisplay } from "@/engine/core/managers/map/utils";
import { SoundManager } from "@/engine/core/managers/sounds/SoundManager";
import { surgeConfig } from "@/engine/core/managers/surge/SurgeConfig";
import { SurgeManager } from "@/engine/core/managers/surge/SurgeManager";
import {
  getNearestAvailableSurgeCover,
  initializeSurgeCovers,
  isSurgeEnabledOnLevel,
  killAllSurgeUnhidden,
  launchSurgeSignalRockets,
  playSurgeEndedSound,
  playSurgeStartingSound,
  playSurgeWillHappenSoonSound,
} from "@/engine/core/managers/surge/utils";
import { mockRegisteredActor, resetRegistry } from "@/fixtures/engine";

jest.mock("@/engine/core/managers/map/utils");
jest.mock("@/engine/core/managers/surge/utils");

describe("SurgeManager update stages", () => {
  let manager: SurgeManager;
  let soundManager: SoundManager;

  /**
   * Drive the manager into an active surge that has been running for the requested amount of seconds.
   */
  function updateWithDuration(duration: TDuration): void {
    const now: Time = createTime(2012, 6, 12, 20, 15, 30, 200);

    jest.spyOn(now, "diffSec").mockImplementation(() => duration);
    replaceFunctionMock(game.get_game_time, () => now);
    replaceFunctionMock(level.get_time_factor, () => 1);

    manager.update();
  }

  beforeEach(() => {
    resetRegistry();
    mockRegisteredActor();

    resetFunctionMock(initializeSurgeCovers);
    resetFunctionMock(getNearestAvailableSurgeCover);
    resetFunctionMock(isSurgeEnabledOnLevel);
    resetFunctionMock(killAllSurgeUnhidden);
    resetFunctionMock(launchSurgeSignalRockets);
    resetFunctionMock(playSurgeEndedSound);
    resetFunctionMock(playSurgeStartingSound);
    resetFunctionMock(playSurgeWillHappenSoonSound);
    resetFunctionMock(updateAnomalyZonesDisplay);

    surgeConfig.IS_STARTED = true;
    surgeConfig.IS_TIME_FORWARDED = false;

    manager = getManager(SurgeManager);
    soundManager = getManager(SoundManager);

    manager.currentDuration = -1;
    manager.isAfterGameLoad = false;

    jest.mocked(isSurgeEnabledOnLevel).mockReturnValue(true);
    jest.spyOn(soundManager, "play").mockImplementation(() => null);
    jest.spyOn(soundManager, "playLooped").mockImplementation(() => {});
    jest.spyOn(soundManager, "setLoopedSoundVolume").mockImplementation(jest.fn());
    jest.spyOn(manager as AnyObject, "giveSurgeHideTask").mockImplementation(() => {});
  });

  it("should do nothing while the screen is black", () => {
    const deviceState: AnyObject = device() as unknown as AnyObject;
    const precacheFrame: number = deviceState.precache_frame as number;

    deviceState.precache_frame = 1;

    try {
      updateWithDuration(50);

      expect(launchSurgeSignalRockets).toHaveBeenCalledTimes(0);
    } finally {
      deviceState.precache_frame = precacheFrame;
    }
  });

  it("should reschedule the next surge after time was forwarded", () => {
    const now: Time = createTime(2012, 6, 12, 20, 15, 30, 200);

    surgeConfig.IS_STARTED = false;
    surgeConfig.IS_TIME_FORWARDED = true;

    manager.nextScheduledSurgeDelay = 100;

    jest.spyOn(now, "diffSec").mockImplementation(() => 100);
    replaceFunctionMock(game.get_game_time, () => now);

    manager.update();

    expect(surgeConfig.IS_TIME_FORWARDED).toBe(false);
    expect(manager.nextScheduledSurgeDelay).toBe(surgeConfig.INTERVAL_MAX_AFTER_TIME_FORWARD + 100);
  });

  it("should keep the schedule when the forwarded time is still far from the surge", () => {
    const now: Time = createTime(2012, 6, 12, 20, 15, 30, 200);

    surgeConfig.IS_STARTED = false;
    surgeConfig.IS_TIME_FORWARDED = true;

    manager.nextScheduledSurgeDelay = 10_000_000;

    jest.spyOn(now, "diffSec").mockImplementation(() => 0);
    replaceFunctionMock(game.get_game_time, () => now);

    manager.update();

    expect(surgeConfig.IS_TIME_FORWARDED).toBe(false);
    expect(manager.nextScheduledSurgeDelay).toBe(10_000_000);
  });

  it("should end the surge when it is disabled on the current level", () => {
    jest.mocked(isSurgeEnabledOnLevel).mockReturnValue(false);
    jest.spyOn(manager, "endSurge").mockImplementation(jest.fn());

    updateWithDuration(10);

    expect(manager.endSurge).toHaveBeenCalledTimes(1);
    expect(launchSurgeSignalRockets).toHaveBeenCalledTimes(0);
  });

  it("should end the surge once its duration is over", () => {
    jest.spyOn(manager, "endSurge").mockImplementation(jest.fn());

    updateWithDuration(surgeConfig.DURATION + 1);

    expect(playSurgeEndedSound).toHaveBeenCalledTimes(1);
    expect(manager.endSurge).toHaveBeenCalledTimes(1);
  });

  it("should start the hide task and weather effects at the surge beginning", () => {
    updateWithDuration(1);

    expect(launchSurgeSignalRockets).toHaveBeenCalledTimes(1);
    expect(playSurgeStartingSound).toHaveBeenCalledTimes(1);
    expect(level.set_weather_fx).toHaveBeenCalledWith("fx_surge_day_3");
  });

  it("should start blowout sounds after the first stage", () => {
    manager.isTaskGiven = true;

    updateWithDuration(40);

    expect(soundManager.play).toHaveBeenCalledWith(ACTOR_ID, "blowout_begin");
    expect(soundManager.playLooped).toHaveBeenCalledWith(ACTOR_ID, "blowout_rumble");
    expect(soundManager.setLoopedSoundVolume).toHaveBeenCalledWith(ACTOR_ID, "blowout_rumble", 0.25);
    expect(manager.isBlowoutSoundStarted).toBe(true);
  });

  it("should add the shock post process effector at the second stage", () => {
    manager.isTaskGiven = true;
    manager.isBlowoutSoundStarted = true;

    updateWithDuration(110);

    expect(level.add_pp_effector).toHaveBeenCalledWith(
      postProcessors.surge_shock,
      surgeConfig.SURGE_SHOCK_PP_EFFECTOR_ID,
      true
    );
    expect(manager.isEffectorSet).toBe(true);
  });

  it("should warn the actor and shake the camera at the third stage", () => {
    manager.isTaskGiven = true;
    manager.isBlowoutSoundStarted = true;
    manager.isEffectorSet = true;

    jest.mocked(getNearestAvailableSurgeCover).mockReturnValue(null);

    updateWithDuration(150);

    expect(playSurgeWillHappenSoonSound).toHaveBeenCalledTimes(1);
    expect(level.add_cam_effector).toHaveBeenCalledWith(
      animations.camera_effects_earthquake,
      surgeConfig.EARTHQUAKE_CAM_EFFECTOR_ID,
      true,
      ""
    );
    expect(manager.isSecondMessageGiven).toBe(true);
    // Actor outside of a cover starts taking telepathic damage.
    expect(registry.actor.hit).toHaveBeenCalledTimes(1);
    expect(jest.mocked(registry.actor.hit).mock.calls[0][0].type).toBe(hit.telepatic);
  });

  it("should not hit the actor while they are inside a cover", () => {
    const cover: GameObject = MockGameObject.mock();

    manager.isTaskGiven = true;
    manager.isBlowoutSoundStarted = true;
    manager.isEffectorSet = true;
    manager.isSecondMessageGiven = true;

    jest.spyOn(cover, "inside").mockImplementation(() => true);
    jest.mocked(getNearestAvailableSurgeCover).mockReturnValue(cover);

    updateWithDuration(150);

    expect(registry.actor.hit).toHaveBeenCalledTimes(0);
  });

  it("should cap the damage when the actor is able to survive the surge", () => {
    const canSurvive: TConditionList = surgeConfig.CAN_SURVIVE_SURGE;

    manager.isTaskGiven = true;
    manager.isBlowoutSoundStarted = true;
    manager.isEffectorSet = true;
    manager.isSecondMessageGiven = true;

    jest.mocked(getNearestAvailableSurgeCover).mockReturnValue(null);

    // Health setter on the mock applies a delta, so this drops the actor to near-death.
    registry.actor.health = -0.99;
    surgeConfig.CAN_SURVIVE_SURGE = parseConditionsList(TRUE);

    try {
      updateWithDuration(184);

      expect(registry.actor.hit).toHaveBeenCalledTimes(1);
      // Health is below the raw hit power, so the damage is clamped to leave the actor alive.
      expect(jest.mocked(registry.actor.hit).mock.calls[0][0].power).toBe(0);
    } finally {
      surgeConfig.CAN_SURVIVE_SURGE = canSurvive;
    }
  });

  it("should reduce the damage down to the survivable amount", () => {
    const canSurvive: TConditionList = surgeConfig.CAN_SURVIVE_SURGE;

    manager.isTaskGiven = true;
    manager.isBlowoutSoundStarted = true;
    manager.isEffectorSet = true;
    manager.isSecondMessageGiven = true;

    jest.mocked(getNearestAvailableSurgeCover).mockReturnValue(null);

    registry.actor.health = -0.9;
    surgeConfig.CAN_SURVIVE_SURGE = parseConditionsList(TRUE);

    try {
      updateWithDuration(184);

      expect(jest.mocked(registry.actor.hit).mock.calls[0][0].power).toBeCloseTo(0.05, 5);
    } finally {
      surgeConfig.CAN_SURVIVE_SURGE = canSurvive;
    }
  });

  it("should kill unhidden objects and disable the ui at the last stage", () => {
    manager.isTaskGiven = true;
    manager.isBlowoutSoundStarted = true;
    manager.isEffectorSet = true;
    manager.isSecondMessageGiven = true;

    jest.mocked(getNearestAvailableSurgeCover).mockReturnValue(null);

    updateWithDuration(186);

    expect(killAllSurgeUnhidden).toHaveBeenCalledTimes(1);
    expect(manager.isUiDisabled).toBe(true);
  });

  it("should restore active effects after a game load", () => {
    manager.isAfterGameLoad = true;
    manager.isTaskGiven = true;
    manager.isBlowoutSoundStarted = true;
    manager.isEffectorSet = true;
    manager.isSecondMessageGiven = true;

    jest.mocked(getNearestAvailableSurgeCover).mockReturnValue(null);

    updateWithDuration(120);

    expect(soundManager.playLooped).toHaveBeenCalledWith(ACTOR_ID, "blowout_rumble");
    expect(soundManager.playLooped).toHaveBeenCalledWith(ACTOR_ID, "surge_earthquake_sound_looped");
    expect(level.add_pp_effector).toHaveBeenCalledWith(
      postProcessors.surge_shock,
      surgeConfig.SURGE_SHOCK_PP_EFFECTOR_ID,
      true
    );
    expect(level.add_cam_effector).toHaveBeenCalledTimes(1);
    expect(manager.isAfterGameLoad).toBe(false);
  });

  it("should scale the running effects with the surge duration", () => {
    manager.isTaskGiven = true;
    manager.isBlowoutSoundStarted = true;
    manager.isEffectorSet = true;
    manager.isSecondMessageGiven = true;

    jest.mocked(getNearestAvailableSurgeCover).mockReturnValue(null);

    updateWithDuration(90);

    expect(level.set_pp_effector_factor).toHaveBeenCalledWith(surgeConfig.SURGE_SHOCK_PP_EFFECTOR_ID, 1, 0.1);
    expect(soundManager.setLoopedSoundVolume).toHaveBeenCalledWith(ACTOR_ID, "blowout_rumble", 0.5);
  });

  it("should do nothing when the duration did not change since the last update", () => {
    manager.isTaskGiven = true;
    manager.currentDuration = 40;

    updateWithDuration(40);

    expect(launchSurgeSignalRockets).toHaveBeenCalledTimes(0);
  });
});
