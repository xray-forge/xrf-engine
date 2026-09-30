import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { level } from "xray16";
import { Console } from "xray16/alias";
import { AnyObject } from "xray16/lib";
import { MockConsole, MockCUITrackBar } from "xray16/mocks";

import { animations, postProcessors } from "@/engine/constants/animation";
import { consoleCommands } from "@/engine/constants/console_commands";
import { infoPortions } from "@/engine/constants/info_portions";
import { disposeManager, getManager, registry } from "@/engine/core/database";
import { ActorInputManager, EActorControlHandle, EActorControlPolicy } from "@/engine/core/managers/actor";
import { EGameEvent, EventsManager } from "@/engine/core/managers/events";
import { sleepConfig, SleepManager } from "@/engine/core/managers/sleep";
import { surgeConfig, SurgeManager } from "@/engine/core/managers/surge";
import { WeatherManager } from "@/engine/core/managers/weather";
import { SleepDialog } from "@/engine/core/ui/game/sleep";
import { giveInfoPortion, hasInfoPortion } from "@/engine/core/utils/info_portion";
import { mockRegisteredActor, resetRegistry } from "@/fixtures/engine";

jest.mock("@/engine/core/ui/game/sleep", () => ({
  SleepDialog: class {
    public uiTimeTrack = MockCUITrackBar.mock();
    public show = jest.fn();
  },
}));

describe("SleepManager", () => {
  beforeEach(() => {
    resetRegistry();
    MockConsole.reset();

    sleepConfig.SLEEP_DIALOG = null;
    surgeConfig.IS_STARTED = false;
    surgeConfig.IS_TIME_FORWARDED = false;
  });

  it("should correctly initialize and destroy", () => {
    getManager(SleepManager);

    const eventsManager: EventsManager = getManager(EventsManager);

    expect(eventsManager.getSubscribersCount()).toBe(1);
    expect(eventsManager.getEventSubscribersCount(EGameEvent.DUMP_LUA_DATA)).toBe(1);

    disposeManager(SleepManager);

    expect(eventsManager.getSubscribersCount()).toBe(0);
  });

  it("should correctly show and initialize sleep dialog", () => {
    expect(sleepConfig.SLEEP_DIALOG).toBeNull();

    const sleepManager: SleepManager = getManager(SleepManager);

    sleepManager.showSleepDialog();

    expect(sleepConfig.SLEEP_DIALOG).toBeInstanceOf(SleepDialog);
    expect(sleepConfig.SLEEP_DIALOG?.show).toHaveBeenCalled();
    expect(sleepConfig.SLEEP_DIALOG?.uiTimeTrack.SetCurrentValue).toHaveBeenCalled();
  });

  it("should correctly show and initialize sleep dialog if already dialog exists", () => {
    const sleepManager: SleepManager = getManager(SleepManager);
    const sleepDialog: SleepDialog = new SleepDialog(sleepManager);

    sleepConfig.SLEEP_DIALOG = sleepDialog;

    sleepManager.showSleepDialog();

    expect(sleepConfig.SLEEP_DIALOG).toBe(sleepDialog);
    expect(sleepDialog.show).toHaveBeenCalled();
    expect(sleepDialog.uiTimeTrack.SetCurrentValue).toHaveBeenCalled();
  });

  it("should correctly start sleeping", () => {
    mockRegisteredActor();

    const console: Console = MockConsole.getInstanceMock();

    jest.spyOn(console, "get_float").mockImplementation((command) => {
      switch (command) {
        case consoleCommands.snd_volume_music:
          return 0.25;

        case consoleCommands.snd_volume_eff:
          return 0.35;
      }

      return 1;
    });

    const sleepManager: SleepManager = getManager(SleepManager);
    const surgeManager: SurgeManager = getManager(SurgeManager);
    const actorInputManager: ActorInputManager = getManager(ActorInputManager);

    jest.spyOn(actorInputManager, "acquireControl").mockImplementation(jest.fn());
    jest.spyOn(surgeManager, "setSkipResurrectMessage").mockImplementation(jest.fn());

    expect(sleepManager.nextSleepDuration).toBe(0);

    sleepManager.startSleep(14);

    expect(sleepManager.nextSleepDuration).toBe(14);
    expect(actorInputManager.acquireControl).toHaveBeenCalledWith(
      EActorControlHandle.SLEEP,
      "sleep",
      EActorControlPolicy.FULL_UI
    );

    expect(level.add_cam_effector).toHaveBeenCalledWith(
      animations.camera_effects_sleep,
      10,
      false,
      "engine.on_start_sleeping"
    );
    expect(level.add_pp_effector).toHaveBeenCalledWith(postProcessors.sleep_fade, 11, false);

    expect(hasInfoPortion(infoPortions.actor_is_sleeping)).toBe(true);
    expect(surgeManager.setSkipResurrectMessage).toHaveBeenCalled();

    expect(registry.musicVolume).toBe(0.25);
    expect(registry.effectsVolume).toBe(0.35);

    expect(console.execute).toHaveBeenCalledWith("snd_volume_music 0");
    expect(console.execute).toHaveBeenCalledWith("snd_volume_eff 0");
  });

  it("should correctly handle sleeping callbacks start", () => {
    const { actorGameObject } = mockRegisteredActor({ power: 0.5 });

    surgeConfig.IS_STARTED = true;

    const sleepManager: SleepManager = getManager(SleepManager);
    const weatherManager: WeatherManager = getManager(WeatherManager);
    const eventsManager: EventsManager = getManager(EventsManager);

    jest.spyOn(weatherManager, "forceWeatherChange").mockImplementation(jest.fn());
    jest.spyOn(eventsManager, "emitEvent").mockImplementation(jest.fn());

    jest.spyOn(level, "is_wfx_playing").mockReturnValueOnce(true);

    sleepManager.nextSleepDuration = 6;
    sleepManager.onStartSleeping();

    expect(level.add_cam_effector).toHaveBeenCalledWith(
      animations.camera_effects_sleep,
      10,
      false,
      "engine.on_finish_sleeping"
    );
    expect(level.change_game_time).toHaveBeenCalledWith(0, 6, 0);

    expect(weatherManager.forceWeatherChange).toHaveBeenCalledTimes(1);
    expect(surgeConfig.IS_TIME_FORWARDED).toBe(true);
    expect(level.stop_weather_fx).toHaveBeenCalledTimes(1);

    expect(actorGameObject.power).toBe(1);
    expect(eventsManager.emitEvent).toHaveBeenCalledWith(EGameEvent.ACTOR_START_SLEEP);
  });

  it("should correctly handle sleeping callbacks stop", () => {
    mockRegisteredActor();

    const console: Console = MockConsole.getInstanceMock();
    const sleepManager: SleepManager = getManager(SleepManager);
    const actorInputManager: ActorInputManager = getManager(ActorInputManager);
    const eventsManager: EventsManager = getManager(EventsManager);

    jest.spyOn(actorInputManager, "releaseGameUiControl").mockImplementation(jest.fn());
    jest.spyOn(eventsManager, "emitEvent").mockImplementation(jest.fn());

    giveInfoPortion(infoPortions.actor_is_sleeping);
    giveInfoPortion(infoPortions.sleep_active);

    registry.musicVolume = 0.51;
    registry.effectsVolume = 0.52;

    sleepManager.onFinishSleeping();

    expect(actorInputManager.releaseGameUiControl).toHaveBeenCalledWith(EActorControlHandle.SLEEP);

    expect(console.execute).toHaveBeenCalledWith("snd_volume_music 0.51");
    expect(console.execute).toHaveBeenCalledWith("snd_volume_eff 0.52");

    expect(registry.musicVolume).toBe(0);
    expect(registry.effectsVolume).toBe(0);

    expect(hasInfoPortion(infoPortions.tutorial_sleep)).toBe(true);
    expect(hasInfoPortion(infoPortions.actor_is_sleeping)).toBe(false);
    expect(hasInfoPortion(infoPortions.sleep_active)).toBe(false);

    expect(eventsManager.emitEvent).toHaveBeenCalledWith(EGameEvent.ACTOR_FINISH_SLEEP);
  });

  it("should correctly handle debug dump event", () => {
    const manager: SleepManager = getManager(SleepManager);
    const data: AnyObject = {};

    EventsManager.emitEvent(EGameEvent.DUMP_LUA_DATA, data);

    expect(data).toEqual({ SleepManager: expect.any(Object) });
    expect(manager.onDebugDump({})).toEqual({ SleepManager: expect.any(Object) });
  });
});
