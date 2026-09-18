import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { level, time_global } from "xray16";
import { GameObject } from "xray16/alias";
import { ACTOR_ID, TTimestamp } from "xray16/lib";
import { MockGameObject } from "xray16/mocks";
import { replaceFunctionMock, resetFunctionMock } from "xray16/testing/utils";

import { getManager } from "@/engine/core/database";
import { DeimosManager } from "@/engine/core/managers/deimos";
import { SoundManager } from "@/engine/core/managers/sounds";
import { deimosConfig } from "@/engine/core/schemes/restrictor/sr_deimos/DeimosConfig";
import { DeimosController } from "@/engine/core/schemes/restrictor/sr_deimos/DeimosController";
import { ISchemeDeimosState } from "@/engine/core/schemes/restrictor/sr_deimos/sr_deimos_types";
import { trySwitchToAnotherSection } from "@/engine/core/schemes/runtime";
import { EScheme } from "@/engine/core/schemes/types";
import { isBlackScreen } from "@/engine/core/utils/game";
import { mockRegisteredActor, mockSchemeState, resetRegistry } from "@/fixtures/engine";

jest.mock("@/engine/core/schemes/runtime/scheme_switch", () => ({
  trySwitchToAnotherSection: jest.fn(() => false),
}));

jest.mock("@/engine/core/utils/game", () => ({ isBlackScreen: jest.fn(() => false) }));

const NOW: TTimestamp = 100_000;

function createDeimosState(base: Partial<ISchemeDeimosState> = {}): ISchemeDeimosState {
  return mockSchemeState<ISchemeDeimosState>(EScheme.SR_DEIMOS, {
    camEffector: "camera",
    camEffectorRepeatingTime: 1_000,
    disableBound: 0.1,
    growingRate: 1,
    healthLost: 0.1,
    heartbeatSound: "heartbeat",
    intensity: 0,
    loweringRate: 1,
    movementSpeed: 0,
    noiseSound: "noise",
    ppEffector: "deimos",
    ppEffector2: "deimos_secondary",
    switchLowerBound: 0.3,
    switchUpperBound: 0.6,
    ...base,
  });
}

function restoreDeimosIntensity(intensity: number): void {
  (getManager(DeimosManager) as unknown as { restoredIntensity: number }).restoredIntensity = intensity;
}

describe("DeimosController", () => {
  beforeEach(() => {
    resetRegistry();

    resetFunctionMock(level.add_pp_effector);
    resetFunctionMock(level.add_cam_effector);
    resetFunctionMock(level.remove_pp_effector);
    resetFunctionMock(level.remove_cam_effector);
    resetFunctionMock(trySwitchToAnotherSection);
    resetFunctionMock(isBlackScreen);
    replaceFunctionMock(trySwitchToAnotherSection, () => false);
    replaceFunctionMock(isBlackScreen, () => false);
  });

  it("should correctly initialize", () => {
    const object: GameObject = MockGameObject.mock();
    const controller: DeimosController = new DeimosController(object, mockSchemeState(EScheme.SR_DEIMOS));

    expect(controller.phase).toBe(0);
    expect(controller.effectorActivatedAt).toBe(0);
  });

  it("should activate and dispose phased effects as intensity rises and falls", () => {
    const object: GameObject = MockGameObject.mock();
    const controller: DeimosController = new DeimosController(object, mockSchemeState(EScheme.SR_DEIMOS));
    const soundManager: SoundManager = getManager(SoundManager);

    mockRegisteredActor();

    controller.state.camEffector = "camera";
    controller.state.camEffectorRepeatingTime = 1_000;
    controller.state.disableBound = 0.1;
    controller.state.growingRate = 1;
    controller.state.healthLost = 0.1;
    controller.state.heartbeatSound = "heartbeat";
    controller.state.intensity = 0;
    controller.state.loweringRate = 1;
    controller.state.movementSpeed = 0;
    controller.state.noiseSound = "noise";
    controller.state.ppEffector = "deimos";
    controller.state.ppEffector2 = "deimos_secondary";
    controller.state.switchLowerBound = 0.3;
    controller.state.switchUpperBound = 0.6;
    restoreDeimosIntensity(0.5);

    jest.spyOn(soundManager, "playLooped").mockImplementation(() => null);
    jest.spyOn(soundManager, "setLoopedSoundVolume").mockImplementation(() => null);
    jest.spyOn(soundManager, "stopLooped").mockImplementation(() => null);

    controller.update();

    expect(controller.phase).toBe(2);
    expect(controller.state.intensity).toBe(0.5);
    expect(level.add_pp_effector).toHaveBeenCalledWith("deimos.ppe", deimosConfig.POST_PROCESS_EFFECTOR_ID, true);
    expect(soundManager.playLooped).toHaveBeenCalledWith(ACTOR_ID, "noise");
    expect(soundManager.playLooped).toHaveBeenCalledWith(ACTOR_ID, "heartbeat");
    expect(soundManager.setLoopedSoundVolume).toHaveBeenCalledWith(ACTOR_ID, "noise", 0.5);
    expect(soundManager.setLoopedSoundVolume).toHaveBeenCalledWith(ACTOR_ID, "heartbeat", 0.5);

    controller.state.movementSpeed = -100;
    controller.update();

    expect(controller.state.intensity).toBe(0);
    expect(controller.phase).toBe(0);
    expect(soundManager.stopLooped).toHaveBeenCalledWith(ACTOR_ID, "noise");
    expect(level.remove_pp_effector).toHaveBeenCalledWith(deimosConfig.POST_PROCESS_EFFECTOR_ID);
  });

  it("should handle reset", () => {
    const object: GameObject = MockGameObject.mock();
    const controller: DeimosController = new DeimosController(object, mockSchemeState(EScheme.SR_DEIMOS));
    const soundManager: SoundManager = getManager(SoundManager);

    controller.state.noiseSound = "test-noise";
    controller.state.heartbeatSound = "test-heartbeat";

    jest.spyOn(soundManager, "stopLooped").mockImplementation(jest.fn());

    controller.reset();

    expect(soundManager.stopLooped).toHaveBeenCalledTimes(0);
    expect(level.remove_pp_effector).toHaveBeenCalledTimes(0);
    expect(level.remove_cam_effector).toHaveBeenCalledTimes(0);

    controller.phase = 1;

    controller.reset();

    expect(soundManager.stopLooped).toHaveBeenCalledTimes(1);
    expect(level.remove_pp_effector).toHaveBeenCalledTimes(1);
    expect(level.remove_cam_effector).toHaveBeenCalledTimes(0);

    expect(soundManager.stopLooped).toHaveBeenCalledWith(ACTOR_ID, controller.state.noiseSound);
    expect(level.remove_pp_effector).toHaveBeenCalledWith(deimosConfig.POST_PROCESS_EFFECTOR_ID);

    resetFunctionMock(level.remove_pp_effector);
    resetFunctionMock(level.remove_cam_effector);
    resetFunctionMock(soundManager.stopLooped);

    controller.phase = 2;

    controller.reset();

    expect(soundManager.stopLooped).toHaveBeenCalledTimes(2);
    expect(level.remove_pp_effector).toHaveBeenCalledTimes(2);
    expect(level.remove_cam_effector).toHaveBeenCalledTimes(1);

    expect(soundManager.stopLooped).toHaveBeenCalledWith(ACTOR_ID, controller.state.noiseSound);
    expect(soundManager.stopLooped).toHaveBeenCalledWith(ACTOR_ID, controller.state.heartbeatSound);
    expect(level.remove_pp_effector).toHaveBeenCalledWith(deimosConfig.POST_PROCESS_EFFECTOR_ID);
    expect(level.remove_pp_effector).toHaveBeenCalledWith(deimosConfig.POST_PROCESS_EFFECTOR_SECONDARY_ID);
    expect(level.remove_cam_effector).toHaveBeenCalledWith(deimosConfig.CAMERA_EFFECTOR_ID);
  });

  it("should do nothing without actor", () => {
    const object: GameObject = MockGameObject.mock();
    const controller: DeimosController = new DeimosController(object, createDeimosState());

    controller.update();

    expect(level.add_pp_effector).not.toHaveBeenCalled();
  });

  it("should restart phased effects after switching away and returning", () => {
    mockRegisteredActor();

    const controller: DeimosController = new DeimosController(
      MockGameObject.mock(),
      createDeimosState({
        movementSpeed: 42,
        growingRate: 0.45,
        loweringRate: 0.22,
        disableBound: 0.2,
        switchLowerBound: 0.4,
        switchUpperBound: 0.75,
      })
    );
    const manager: DeimosManager = getManager(DeimosManager);
    const soundManager: SoundManager = getManager(SoundManager);

    jest.spyOn(manager, "getActorMovementSpeed").mockReturnValue(0);
    jest.spyOn(manager, "startPrimaryEffects");
    jest.spyOn(manager, "startHeartbeat");
    jest.spyOn(soundManager, "playLooped").mockImplementation(() => null);
    jest.spyOn(soundManager, "stopLooped").mockImplementation(() => null);
    jest.spyOn(soundManager, "setLoopedSoundVolume").mockImplementation(() => null);

    for (let index: number = 0; index < 5; index += 1) {
      controller.update();
    }

    expect(controller.phase).toBe(2);

    controller.effectorActivatedAt = NOW;
    replaceFunctionMock(trySwitchToAnotherSection, () => true);
    controller.update();
    controller.reset();

    expect(soundManager.stopLooped).toHaveBeenCalledTimes(2);
    expect(controller.effectorActivatedAt).toBe(0);

    replaceFunctionMock(trySwitchToAnotherSection, () => false);
    controller.state.intensity = 0;

    for (let index: number = 0; index < 5; index += 1) {
      controller.update();
    }

    expect(controller.phase).toBe(2);
    expect(manager.startPrimaryEffects).toHaveBeenCalledTimes(2);
    expect(manager.startHeartbeat).toHaveBeenCalledTimes(2);
  });

  it("should do nothing while black screen is shown", () => {
    const object: GameObject = MockGameObject.mock();
    const controller: DeimosController = new DeimosController(object, createDeimosState());

    mockRegisteredActor();
    replaceFunctionMock(isBlackScreen, () => true);

    controller.update();

    expect(level.add_pp_effector).not.toHaveBeenCalled();
  });

  it("should not enable any phase for intensity below disable bound", () => {
    const object: GameObject = MockGameObject.mock();
    const controller: DeimosController = new DeimosController(object, createDeimosState({ intensity: 0 }));

    mockRegisteredActor();

    restoreDeimosIntensity(0.05);

    controller.update();

    expect(controller.phase).toBe(0);
    expect(level.add_pp_effector).not.toHaveBeenCalled();
  });

  it("should enable first phase only for intensity between bounds", () => {
    const object: GameObject = MockGameObject.mock();
    const controller: DeimosController = new DeimosController(object, createDeimosState({ intensity: 0 }));
    const soundManager: SoundManager = getManager(SoundManager);

    mockRegisteredActor();

    jest.spyOn(soundManager, "playLooped").mockImplementation(() => null);
    jest.spyOn(soundManager, "setLoopedSoundVolume").mockImplementation(() => null);

    restoreDeimosIntensity(0.2);

    controller.update();

    expect(controller.phase).toBe(1);
    expect(soundManager.playLooped).toHaveBeenCalledWith(ACTOR_ID, "noise");
    expect(soundManager.playLooped).not.toHaveBeenCalledWith(ACTOR_ID, "heartbeat");
  });

  it("should apply camera effector and health loss above upper bound", () => {
    const object: GameObject = MockGameObject.mock();
    const { actorGameObject } = mockRegisteredActor();
    const controller: DeimosController = new DeimosController(
      object,
      createDeimosState({ healthLost: 0.25, intensity: 0.7, movementSpeed: 100 })
    );
    const soundManager: SoundManager = getManager(SoundManager);

    jest.spyOn(soundManager, "playLooped").mockImplementation(() => null);
    jest.spyOn(soundManager, "setLoopedSoundVolume").mockImplementation(() => null);
    replaceFunctionMock(time_global, () => NOW);

    controller.effectorActivatedAt = NOW - 2000;
    controller.update();

    expect(controller.effectorActivatedAt).toBe(NOW);
    expect(level.add_cam_effector).toHaveBeenCalledWith(
      "camera_effects\\camera.anm",
      deimosConfig.CAMERA_EFFECTOR_ID,
      false,
      ""
    );
    expect(level.add_pp_effector).toHaveBeenCalledWith(
      "deimos_secondary.ppe",
      deimosConfig.POST_PROCESS_EFFECTOR_SECONDARY_ID,
      false
    );
    // Engine `health` setter is delta-style, so the assigned loss is subtracted from current health.
    expect(actorGameObject.health).toBe(0.75);
  });

  it("should not repeat camera effector within repeating time", () => {
    const object: GameObject = MockGameObject.mock();
    const controller: DeimosController = new DeimosController(
      object,
      createDeimosState({ intensity: 0.7, movementSpeed: 100 })
    );

    mockRegisteredActor();
    replaceFunctionMock(time_global, () => NOW);

    controller.effectorActivatedAt = NOW - 500;
    controller.update();

    expect(level.add_cam_effector).not.toHaveBeenCalled();
  });

  it("should enable second phase when growing past lower bound", () => {
    const object: GameObject = MockGameObject.mock();
    const controller: DeimosController = new DeimosController(
      object,
      createDeimosState({ intensity: 0.4, movementSpeed: 1 })
    );
    const soundManager: SoundManager = getManager(SoundManager);

    mockRegisteredActor();
    jest.spyOn(soundManager, "playLooped").mockImplementation(() => null);
    jest.spyOn(soundManager, "setLoopedSoundVolume").mockImplementation(() => null);

    controller.phase = 1;
    controller.update();

    expect(controller.phase).toBe(2);
    expect(soundManager.playLooped).toHaveBeenCalledWith(ACTOR_ID, "heartbeat");
  });

  it("should enable first phase when growing past disable bound", () => {
    const object: GameObject = MockGameObject.mock();
    const controller: DeimosController = new DeimosController(
      object,
      createDeimosState({ intensity: 0.15, movementSpeed: 1 })
    );
    const soundManager: SoundManager = getManager(SoundManager);

    mockRegisteredActor();
    jest.spyOn(soundManager, "playLooped").mockImplementation(() => null);
    jest.spyOn(soundManager, "setLoopedSoundVolume").mockImplementation(() => null);

    controller.update();

    expect(controller.phase).toBe(1);
    expect(level.add_pp_effector).toHaveBeenCalledWith("deimos.ppe", deimosConfig.POST_PROCESS_EFFECTOR_ID, true);
    expect(soundManager.playLooped).toHaveBeenCalledWith(ACTOR_ID, "noise");
  });

  it("should drop to first phase when lowering past lower bound", () => {
    const object: GameObject = MockGameObject.mock();
    const controller: DeimosController = new DeimosController(
      object,
      createDeimosState({ intensity: 0.25, movementSpeed: -1 })
    );
    const soundManager: SoundManager = getManager(SoundManager);

    mockRegisteredActor();
    jest.spyOn(soundManager, "setLoopedSoundVolume").mockImplementation(() => null);
    jest.spyOn(soundManager, "stopLooped").mockImplementation(() => null);

    controller.phase = 2;
    controller.update();

    expect(controller.phase).toBe(1);
    expect(soundManager.stopLooped).toHaveBeenCalledWith(ACTOR_ID, "heartbeat");
  });

  it("should remove secondary effectors when lowering past upper bound", () => {
    const object: GameObject = MockGameObject.mock();
    const controller: DeimosController = new DeimosController(
      object,
      createDeimosState({ intensity: 0.5, movementSpeed: -1 })
    );
    const soundManager: SoundManager = getManager(SoundManager);

    mockRegisteredActor();
    jest.spyOn(soundManager, "setLoopedSoundVolume").mockImplementation(() => null);

    controller.phase = 2;
    controller.update();

    expect(controller.phase).toBe(2);
    expect(level.remove_cam_effector).toHaveBeenCalledWith(deimosConfig.CAMERA_EFFECTOR_ID);
    expect(level.remove_pp_effector).toHaveBeenCalledWith(deimosConfig.POST_PROCESS_EFFECTOR_SECONDARY_ID);
  });

  it("should reset on switching to another section", () => {
    const object: GameObject = MockGameObject.mock();
    const controller: DeimosController = new DeimosController(object, createDeimosState());

    mockRegisteredActor();
    replaceFunctionMock(trySwitchToAnotherSection, () => true);
    jest.spyOn(controller, "reset").mockImplementation(jest.fn());

    controller.update();

    expect(controller.reset).toHaveBeenCalledTimes(1);
  });

  it.each([0, 0.2])("should stop all effects above the new intensity after a sudden drop to %s", (intensity) => {
    mockRegisteredActor();
    replaceFunctionMock(time_global, () => NOW);

    const manager: DeimosManager = getManager(DeimosManager);
    const soundManager: SoundManager = getManager(SoundManager);
    const controller: DeimosController = new DeimosController(
      MockGameObject.mock(),
      createDeimosState({ movementSpeed: 42, growingRate: 0.45 })
    );

    jest.spyOn(manager, "getActorMovementSpeed").mockReturnValue(0);
    jest.spyOn(soundManager, "playLooped").mockImplementation(() => null);
    jest.spyOn(soundManager, "stopLooped").mockImplementation(() => null);
    jest.spyOn(soundManager, "setLoopedSoundVolume").mockImplementation(() => null);

    for (let index: number = 0; index < 8; index += 1) {
      controller.update();
    }

    expect(controller.phase).toBe(2);
    expect(soundManager.playLooped).toHaveBeenCalledWith(ACTOR_ID, "heartbeat");
    expect(level.add_cam_effector).toHaveBeenCalled();

    resetFunctionMock(level.remove_cam_effector);
    resetFunctionMock(level.remove_pp_effector);
    jest.mocked(manager.getActorMovementSpeed).mockReturnValue(42 + (controller.state.intensity - intensity) / 0.005);
    controller.update();

    expect(controller.state.intensity).toBeCloseTo(intensity);
    expect(controller.phase).toBe(intensity === 0 ? 0 : 1);
    expect(soundManager.stopLooped).toHaveBeenCalledWith(ACTOR_ID, "heartbeat");
    expect(level.remove_cam_effector).toHaveBeenCalledWith(deimosConfig.CAMERA_EFFECTOR_ID);
    expect(level.remove_pp_effector).toHaveBeenCalledWith(deimosConfig.POST_PROCESS_EFFECTOR_SECONDARY_ID);

    if (intensity === 0) {
      expect(soundManager.stopLooped).toHaveBeenCalledWith(ACTOR_ID, "noise");
      expect(level.remove_pp_effector).toHaveBeenCalledWith(deimosConfig.POST_PROCESS_EFFECTOR_ID);
    } else {
      expect(soundManager.stopLooped).not.toHaveBeenCalledWith(ACTOR_ID, "noise");
      expect(level.remove_pp_effector).not.toHaveBeenCalledWith(deimosConfig.POST_PROCESS_EFFECTOR_ID);
    }
  });
});
