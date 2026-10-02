import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { level } from "xray16";
import { Console, GameObject, ServerObject } from "xray16/alias";
import { AnyObject } from "xray16/lib";
import { MockAlifeItem, MockConsole, MockGameObject } from "xray16/mocks";

import { animations, postProcessors } from "@/engine/constants/animation";
import { consoleCommands } from "@/engine/constants/console_commands";
import { infoPortions } from "@/engine/constants/info_portions";
import { drugs } from "@/engine/constants/items/drugs";
import { disposeManager, getManager, registerSimulator } from "@/engine/core/database";
import { ActorInputManager, EActorControlHandle, EActorControlPolicy } from "@/engine/core/managers/actor";
import { EGameEvent, EventsManager } from "@/engine/core/managers/events";
import { SleepManager } from "@/engine/core/managers/sleep";
import { surgeConfig, SurgeManager } from "@/engine/core/managers/surge";
import { WeatherManager } from "@/engine/core/managers/weather";
import { SleepDialog } from "@/engine/core/ui/game/sleep";
import { giveInfoPortion, hasInfoPortion } from "@/engine/core/utils/info_portion";
import { mockRegisteredActor, resetRegistry } from "@/fixtures/engine";

jest.mock("@/engine/core/ui/game/sleep", () => ({
  SleepDialog: class {
    public show = jest.fn();
  },
}));

describe("SleepManager", () => {
  beforeEach(() => {
    resetRegistry();
    MockConsole.reset();

    surgeConfig.IS_STARTED = false;
    surgeConfig.IS_TIME_FORWARDED = false;
  });

  it("should correctly initialize and destroy", () => {
    getManager(SleepManager);

    const eventsManager: EventsManager = getManager(EventsManager);

    expect(eventsManager.getSubscribersCount()).toBe(2);
    expect(eventsManager.getEventSubscribersCount(EGameEvent.DUMP_LUA_DATA)).toBe(1);
    expect(eventsManager.getEventSubscribersCount(EGameEvent.ACTOR_USE_ITEM)).toBe(1);

    disposeManager(SleepManager);

    expect(eventsManager.getSubscribersCount()).toBe(0);
  });

  it("should correctly show and initialize sleep dialog", () => {
    const sleepManager: SleepManager = getManager(SleepManager);

    expect(sleepManager.sleepDialog).toBeNull();

    sleepManager.showSleepDialog();

    expect(sleepManager.sleepDialog).toBeInstanceOf(SleepDialog);
    expect(sleepManager.sleepDialog?.show).toHaveBeenCalled();
  });

  it("should correctly show and initialize sleep dialog if already dialog exists", () => {
    const sleepManager: SleepManager = getManager(SleepManager);
    const sleepDialog: SleepDialog = new SleepDialog(sleepManager);

    sleepManager.sleepDialog = sleepDialog;

    sleepManager.showSleepDialog();

    expect(sleepManager.sleepDialog).toBe(sleepDialog);
    expect(sleepDialog.show).toHaveBeenCalled();
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
    jest.spyOn(surgeManager, "enableSkipNotification").mockImplementation(jest.fn());

    expect(sleepManager.nextSleepDuration).toBe(0);

    sleepManager.startSleep(14);

    expect(sleepManager.nextSleepDuration).toBe(14);
    expect(actorInputManager.acquireControl).toHaveBeenCalledWith(
      EActorControlHandle.SLEEP,
      "sleep",
      EActorControlPolicy.FULL_UI,
      true
    );

    expect(level.add_cam_effector).toHaveBeenCalledWith(
      animations.camera_effects_sleep,
      10,
      false,
      "engine.on_start_sleeping"
    );
    expect(level.add_pp_effector).toHaveBeenCalledWith(postProcessors.sleep_fade, 11, false);

    expect(hasInfoPortion(infoPortions.actor_is_sleeping)).toBe(true);
    expect(surgeManager.enableSkipNotification).toHaveBeenCalled();

    expect(sleepManager.musicVolume).toBe(0.25);
    expect(sleepManager.effectsVolume).toBe(0.35);

    expect(console.execute).toHaveBeenCalledWith("snd_volume_music 0");
    expect(console.execute).toHaveBeenCalledWith("snd_volume_eff 0");
  });

  it("should correctly handle sleeping callbacks start", () => {
    const { actorGameObject } = mockRegisteredActor({ power: 0.5 });

    surgeConfig.IS_STARTED = true;

    const sleepManager: SleepManager = getManager(SleepManager);
    const eventsManager: EventsManager = getManager(EventsManager);

    jest.spyOn(eventsManager, "emitEvent").mockImplementation(jest.fn());

    jest.spyOn(level, "is_wfx_playing").mockReturnValue(true);

    sleepManager.nextSleepDuration = 6;
    sleepManager.onStartSleeping();

    expect(level.add_cam_effector).toHaveBeenCalledWith(
      animations.camera_effects_sleep,
      10,
      false,
      "engine.on_finish_sleeping"
    );
    expect(level.change_game_time).toHaveBeenCalledWith(0, 6, 0);
    expect(eventsManager.emitEvent).toHaveBeenCalledWith(EGameEvent.GAME_TIME_FORWARDED);
    // The surge slept through stops its own weather effect once it ends.
    expect(level.stop_weather_fx).not.toHaveBeenCalled();

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

    sleepManager.musicVolume = 0.51;
    sleepManager.effectsVolume = 0.52;

    sleepManager.onFinishSleeping();

    expect(actorInputManager.releaseGameUiControl).toHaveBeenCalledWith(EActorControlHandle.SLEEP, true);

    expect(console.execute).toHaveBeenCalledWith("snd_volume_music 0.51");
    expect(console.execute).toHaveBeenCalledWith("snd_volume_eff 0.52");

    expect(sleepManager.musicVolume).toBe(0);
    expect(sleepManager.effectsVolume).toBe(0);

    expect(hasInfoPortion(infoPortions.tutorial_sleep)).toBe(true);
    expect(hasInfoPortion(infoPortions.actor_is_sleeping)).toBe(false);
    expect(hasInfoPortion(infoPortions.sleep_active)).toBe(false);

    expect(eventsManager.emitEvent).toHaveBeenCalledWith(EGameEvent.ACTOR_FINISH_SLEEP);
  });

  it("should fall asleep only on anabiotic items", () => {
    registerSimulator();

    const sleepManager: SleepManager = getManager(SleepManager);
    const item: ServerObject = MockAlifeItem.mock();
    const anabiotic: ServerObject = MockAlifeItem.mock({ section: drugs.drug_anabiotic });

    jest.spyOn(sleepManager, "startAnabioticSleep").mockImplementation(jest.fn());

    EventsManager.emitEvent(EGameEvent.ACTOR_USE_ITEM, null);
    EventsManager.emitEvent(EGameEvent.ACTOR_USE_ITEM, MockGameObject.mock({ id: item.id }));

    expect(sleepManager.startAnabioticSleep).not.toHaveBeenCalled();

    EventsManager.emitEvent(EGameEvent.ACTOR_USE_ITEM, MockGameObject.mock({ id: anabiotic.id }) as GameObject);

    expect(sleepManager.startAnabioticSleep).toHaveBeenCalledTimes(1);
  });

  it("should correctly start anabiotic sleep", () => {
    mockRegisteredActor();

    const console: Console = MockConsole.getInstanceMock();
    const sleepManager: SleepManager = getManager(SleepManager);
    const actorInputManager: ActorInputManager = getManager(ActorInputManager);

    jest.spyOn(console, "get_float").mockReturnValueOnce(0.9).mockReturnValue(0.8);
    jest.spyOn(actorInputManager, "acquireControl").mockImplementation(jest.fn());

    sleepManager.startAnabioticSleep();

    expect(actorInputManager.acquireControl).toHaveBeenCalledWith(
      EActorControlHandle.ANABIOTIC,
      "anabiotic",
      EActorControlPolicy.UI_ONLY,
      true
    );
    expect(level.add_cam_effector).toHaveBeenCalledWith(
      animations.camera_effects_surge_02,
      10,
      false,
      "engine.on_anabiotic_sleep"
    );
    expect(level.add_pp_effector).toHaveBeenCalledWith(postProcessors.surge_fade, 11, false);
    expect(hasInfoPortion(infoPortions.anabiotic_in_process)).toBe(true);

    expect(sleepManager.musicVolume).toBe(0.9);
    expect(sleepManager.effectsVolume).toBe(0.8);
    expect(console.execute).toHaveBeenCalledWith("snd_volume_music 0");
    expect(console.execute).toHaveBeenCalledWith("snd_volume_eff 0");
  });

  it("should pass the anabiotic sleep through the surge before advancing the game time", () => {
    const sleepManager: SleepManager = getManager(SleepManager);
    const surgeManager: SurgeManager = getManager(SurgeManager);
    const weatherManager: WeatherManager = getManager(WeatherManager);

    jest.spyOn(surgeManager, "forwardSurgeTime").mockImplementation(jest.fn());
    jest.spyOn(weatherManager, "forceWeatherChange").mockImplementation(jest.fn());

    sleepManager.onAnabioticSleep();

    const minutes: number = jest.mocked(surgeManager.forwardSurgeTime).mock.calls[0][0];

    expect(minutes).toBeGreaterThanOrEqual(35);
    expect(minutes).toBeLessThanOrEqual(45);
    expect(level.add_cam_effector).toHaveBeenCalledWith(
      animations.camera_effects_surge_01,
      10,
      false,
      "engine.on_anabiotic_wake_up"
    );
    expect(level.change_game_time).toHaveBeenCalledWith(0, 0, minutes);
    expect(jest.mocked(surgeManager.forwardSurgeTime).mock.invocationCallOrder[0]).toBeLessThan(
      jest.mocked(level.change_game_time).mock.invocationCallOrder[0]
    );
    expect(weatherManager.forceWeatherChange).toHaveBeenCalledTimes(1);
  });

  it("should correctly wake up from anabiotic sleep", () => {
    mockRegisteredActor();

    const console: Console = MockConsole.getInstanceMock();
    const sleepManager: SleepManager = getManager(SleepManager);
    const actorInputManager: ActorInputManager = getManager(ActorInputManager);

    jest.spyOn(actorInputManager, "releaseGameUiControl").mockImplementation(jest.fn());

    giveInfoPortion(infoPortions.anabiotic_in_process);

    sleepManager.musicVolume = 0.7;
    sleepManager.effectsVolume = 0.4;

    sleepManager.onAnabioticWakeUp();

    expect(actorInputManager.releaseGameUiControl).toHaveBeenCalledWith(EActorControlHandle.ANABIOTIC, true);
    expect(console.execute).toHaveBeenCalledWith("snd_volume_music 0.7");
    expect(console.execute).toHaveBeenCalledWith("snd_volume_eff 0.4");
    expect(sleepManager.musicVolume).toBe(0);
    expect(sleepManager.effectsVolume).toBe(0);
    expect(hasInfoPortion(infoPortions.anabiotic_in_process)).toBe(false);
  });

  it("should correctly handle debug dump event", () => {
    const manager: SleepManager = getManager(SleepManager);
    const data: AnyObject = {};

    EventsManager.emitEvent(EGameEvent.DUMP_LUA_DATA, data);

    expect(data).toEqual({ SleepManager: expect.any(Object) });
    expect(manager.onDebugDump({})).toEqual({ SleepManager: expect.any(Object) });
  });
});
