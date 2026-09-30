import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { level } from "xray16";
import { GameObject, ServerObject } from "xray16/alias";
import { MockAlifeItem, MockGameObject } from "xray16/mocks";

import { animations, postProcessors } from "@/engine/constants/animation";
import { drugs } from "@/engine/constants/items/drugs";
import { getManager, registerSimulator, registry } from "@/engine/core/database";
import { EActorControlHandle, EActorControlPolicy } from "@/engine/core/managers/actor/actor_input_types";
import { ActorInputManager } from "@/engine/core/managers/actor/ActorInputManager";
import { surgeConfig } from "@/engine/core/managers/surge/SurgeConfig";
import { SurgeManager } from "@/engine/core/managers/surge/SurgeManager";
import { WeatherManager } from "@/engine/core/managers/weather/WeatherManager";
import { hasInfoPortion } from "@/engine/core/utils/info_portion";
import { mockRegisteredActor, resetRegistry } from "@/fixtures/engine";

describe("ActorInputManager anabiotic handling", () => {
  beforeEach(() => {
    resetRegistry();
    registerSimulator();
    mockRegisteredActor();
  });

  it("onActorUseItem should ignore missing objects and non-anabiotic items", () => {
    const manager: ActorInputManager = getManager(ActorInputManager);
    const item: ServerObject = MockAlifeItem.mock();
    const object: GameObject = MockGameObject.mock({ id: item.id });

    jest.spyOn(manager, "processAnabioticItemUsage").mockImplementation(jest.fn());

    manager.onActorUseItem(null);
    manager.onActorUseItem(object);

    expect(manager.processAnabioticItemUsage).toHaveBeenCalledTimes(0);
  });

  it("onActorUseItem should intercept anabiotic usage", () => {
    const manager: ActorInputManager = getManager(ActorInputManager);
    const item: ServerObject = MockAlifeItem.mock({ section: drugs.drug_anabiotic });
    const object: GameObject = MockGameObject.mock({ id: item.id });

    jest.spyOn(manager, "processAnabioticItemUsage").mockImplementation(jest.fn());

    manager.onActorUseItem(object);

    expect(manager.processAnabioticItemUsage).toHaveBeenCalledTimes(1);
  });

  it("onAnabioticSleep should pass the slept minutes through the surge before advancing the game time", () => {
    const manager: ActorInputManager = getManager(ActorInputManager);
    const surgeManager: SurgeManager = getManager(SurgeManager);
    const weatherManager: WeatherManager = getManager(WeatherManager);

    jest.spyOn(surgeManager, "forwardSurgeTime").mockImplementation(jest.fn());
    jest.spyOn(weatherManager, "forceWeatherChange").mockImplementation(jest.fn());

    manager.onAnabioticSleep();

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

  it("onAnabioticWakeUp should restore volumes and release the ui lock", () => {
    const manager: ActorInputManager = getManager(ActorInputManager);

    registry.musicVolume = 0.7;
    registry.effectsVolume = 0.4;

    manager.acquireControl(EActorControlHandle.ANABIOTIC, "anabiotic", EActorControlPolicy.UI_ONLY, true);
    manager.onAnabioticWakeUp();

    expect(registry.musicVolume).toBe(0);
    expect(registry.effectsVolume).toBe(0);
    expect(hasInfoPortion("anabiotic_in_process")).toBe(false);
  });

  it("onSurgeSurviveStart should apply the sleep camera effector", () => {
    const manager: ActorInputManager = getManager(ActorInputManager);

    manager.onSurgeSurviveStart();

    expect(level.add_cam_effector).toHaveBeenCalledWith(
      animations.camera_effects_surge_01,
      surgeConfig.SLEEP_CAM_EFFECTOR_ID,
      false,
      "engine.surge_survive_end"
    );
  });

  it("onSurgeSurviveEnd should release the surge ui lock", () => {
    const manager: ActorInputManager = getManager(ActorInputManager);

    jest.spyOn(manager, "releaseGameUiControl").mockImplementation(jest.fn());

    manager.onSurgeSurviveEnd();

    expect(manager.releaseGameUiControl).toHaveBeenCalledWith(EActorControlHandle.SURGE);
  });

  it("processAnabioticItemUsage should apply the sleep effectors", () => {
    const manager: ActorInputManager = getManager(ActorInputManager);

    manager.processAnabioticItemUsage();

    expect(level.add_cam_effector).toHaveBeenCalledWith(
      animations.camera_effects_surge_02,
      10,
      false,
      "engine.on_anabiotic_sleep"
    );
    expect(level.add_pp_effector).toHaveBeenCalledWith(postProcessors.surge_fade, 11, false);
  });
});
