import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { get_hud, level } from "xray16";
import { GameObject } from "xray16/alias";
import { NIL } from "xray16/lib";
import { MockGameObject, MockNetProcessor, MockVector } from "xray16/mocks";
import { replaceFunctionMock, resetFunctionMock } from "xray16/testing/utils";

import {
  disposeManager,
  getManager,
  getPortableStoreValue,
  registerObject,
  setPortableStoreValue,
} from "@/engine/core/database";
import { PsyAntennaManager } from "@/engine/core/managers/psy/PsyAntennaManager";
import { PsyAntennaSchemaController } from "@/engine/core/schemes/restrictor/sr_psy_antenna/PsyAntennaSchemaController";
import {
  EAntennaState,
  ISchemePsyAntennaState,
} from "@/engine/core/schemes/restrictor/sr_psy_antenna/sr_psy_antenna_types";
import { trySwitchToAnotherSection } from "@/engine/core/schemes/runtime";
import { EScheme } from "@/engine/core/schemes/types";
import { mockRegisteredActor, mockSchemeState, resetRegistry } from "@/fixtures/engine";

jest.mock("@/engine/core/schemes/runtime/scheme_switch", () => ({
  trySwitchToAnotherSection: jest.fn(() => false),
}));

function createPsyAntennaState(base: Partial<ISchemePsyAntennaState> = {}): ISchemePsyAntennaState {
  return mockSchemeState<ISchemePsyAntennaState>(EScheme.SR_PSY_ANTENNA, {
    hitFreq: 5,
    hitIntensity: 2,
    hitType: "telepatic",
    intensity: 1,
    muteSoundThreshold: 3,
    noMumble: false,
    noStatic: false,
    phantomProb: 0.5,
    postprocess: NIL,
    ...base,
  });
}

/**
 * Create psy antenna scheme controller over restrictor object with the actor placed inside or outside of it.
 */
function createController(
  state: ISchemePsyAntennaState,
  isActorInside: boolean = true
): { antennaManager: PsyAntennaManager; controller: PsyAntennaSchemaController; object: GameObject } {
  mockRegisteredActor({ position: MockVector.create(0, 0, 0) });

  const object: GameObject = MockGameObject.mock();

  jest.spyOn(object, "inside").mockImplementation(() => isActorInside);
  registerObject(object);

  return {
    antennaManager: getManager(PsyAntennaManager),
    controller: new PsyAntennaSchemaController(object, state),
    object,
  };
}

describe("PsyAntennaSchemaController", () => {
  beforeEach(() => {
    resetRegistry();
    resetFunctionMock(trySwitchToAnotherSection);
    resetFunctionMock(level.add_pp_effector);
    resetFunctionMock(level.set_pp_effector_factor);
    replaceFunctionMock(trySwitchToAnotherSection, () => false);
  });

  it("should enter zone on activation when actor is inside", () => {
    const { controller } = createController(createPsyAntennaState(), true);

    controller.activate(controller.object);

    expect(controller.antennaState).toBe(EAntennaState.INSIDE);
    expect(get_hud().enable_fake_indicators).toHaveBeenCalledWith(true);
  });

  it("should stay outside zone on activation when actor is outside", () => {
    const { controller } = createController(createPsyAntennaState(), false);

    controller.activate(controller.object);

    expect(controller.antennaState).toBe(EAntennaState.VOID);
    expect(get_hud().enable_fake_indicators).not.toHaveBeenCalled();
  });

  it("should leave zone on activation when loaded state was inside", () => {
    const { antennaManager, controller, object } = createController(createPsyAntennaState(), false);

    antennaManager.soundIntensityBase = 10;
    setPortableStoreValue(object.id(), "inside", EAntennaState.INSIDE);

    controller.activate(object, true);

    expect(get_hud().enable_fake_indicators).toHaveBeenCalledWith(false);
    expect(antennaManager.soundIntensityBase).toBe(9);
    expect(controller.antennaState).toBe(EAntennaState.VOID);
  });

  it("should leave zone on deactivation only when inside", () => {
    const { controller } = createController(createPsyAntennaState(), true);

    controller.deactivate();

    expect(get_hud().enable_fake_indicators).not.toHaveBeenCalled();

    controller.antennaState = EAntennaState.INSIDE;
    controller.deactivate();

    expect(controller.antennaState).toBe(EAntennaState.OUTSIDE);
    expect(get_hud().enable_fake_indicators).toHaveBeenCalledWith(false);
  });

  it.each([true, false])("should rebuild loaded zone probability when actor remains inside: %s", (isActorInside) => {
    const state: ISchemePsyAntennaState = createPsyAntennaState({ phantomProb: 0.3 });
    const { antennaManager, controller, object } = createController(state);
    const processor: MockNetProcessor = new MockNetProcessor();

    controller.activate(object);
    controller.save();
    antennaManager.save(processor.asNetPacket());

    disposeManager(PsyAntennaManager);

    const loadedManager: PsyAntennaManager = getManager(PsyAntennaManager);

    loadedManager.load(processor.asNetReader());
    jest.mocked(object.inside).mockReturnValue(isActorInside);

    const restoredController: PsyAntennaSchemaController = new PsyAntennaSchemaController(object, state);

    restoredController.activate(object, true);

    expect(loadedManager.phantomSpawnProbability).toBeCloseTo(isActorInside ? 0.3 : 0);
    expect(loadedManager.hitIntensity).toBe(isActorInside ? 2 : 0);
    expect(loadedManager.soundIntensityBase).toBe(isActorInside ? 1 : 0);
    expect(loadedManager.muteSoundThreshold).toBe(isActorInside ? 3 : 0);
    expect(processor.readDataOrder).toEqual(processor.writeDataOrder);
    expect(processor.dataList).toHaveLength(0);

    restoredController.deactivate();

    expect(loadedManager.phantomSpawnProbability).toBeCloseTo(0);
  });

  it("should balance overlapping zone probabilities after loading and reactivation", () => {
    const first = createController(createPsyAntennaState({ phantomProb: 0.3, postprocess: "psy.ppe" }));
    const second = createController(createPsyAntennaState({ phantomProb: 0.2, postprocess: "psy.ppe" }));
    const processor: MockNetProcessor = new MockNetProcessor();

    first.controller.activate(first.object);
    second.controller.activate(second.object);
    first.controller.save();
    second.controller.save();
    first.antennaManager.save(processor.asNetPacket());

    disposeManager(PsyAntennaManager);

    const loadedManager: PsyAntennaManager = getManager(PsyAntennaManager);

    loadedManager.load(processor.asNetReader());

    const firstRestored: PsyAntennaSchemaController = new PsyAntennaSchemaController(
      first.object,
      first.controller.state
    );
    const secondRestored: PsyAntennaSchemaController = new PsyAntennaSchemaController(
      second.object,
      second.controller.state
    );

    firstRestored.activate(first.object, true);
    secondRestored.activate(second.object, true);

    expect(loadedManager.phantomSpawnProbability).toBeCloseTo(0.5);
    expect(loadedManager.hitIntensity).toBe(4);
    expect(loadedManager.soundIntensityBase).toBe(2);
    expect(loadedManager.postprocess.get("psy.ppe").intensityBase).toBe(2);

    firstRestored.deactivate();

    expect(loadedManager.phantomSpawnProbability).toBeCloseTo(0.2);

    firstRestored.activate(first.object);
    firstRestored.activate(first.object);

    expect(loadedManager.phantomSpawnProbability).toBeCloseTo(0.5);

    firstRestored.deactivate();
    secondRestored.deactivate();

    expect(loadedManager.phantomSpawnProbability).toBeCloseTo(0);
    expect(loadedManager.hitIntensity).toBe(0);
    expect(loadedManager.soundIntensityBase).toBe(0);
    expect(loadedManager.postprocess.get("psy.ppe").intensityBase).toBe(0);
  });

  it("should skip update when switching to another section", () => {
    const { controller } = createController(createPsyAntennaState(), true);

    replaceFunctionMock(trySwitchToAnotherSection, () => true);

    controller.update();

    expect(controller.antennaState).toBe(EAntennaState.VOID);
  });

  it("should switch state on update", () => {
    const { controller, object } = createController(createPsyAntennaState(), true);

    controller.update();

    expect(controller.antennaState).toBe(EAntennaState.INSIDE);

    jest.spyOn(object, "inside").mockImplementation(() => false);
    controller.update();

    expect(controller.antennaState).toBe(EAntennaState.OUTSIDE);
  });

  it("should not re-enter zone while already inside", () => {
    const { antennaManager, controller } = createController(createPsyAntennaState(), true);

    controller.update();
    controller.update();

    expect(antennaManager.soundIntensityBase).toBe(1);
  });

  it("should apply antenna effects on zone enter", () => {
    const state: ISchemePsyAntennaState = createPsyAntennaState({
      hitFreq: 7,
      hitType: "chemical_burn",
      noMumble: true,
      noStatic: true,
    });
    const { antennaManager, controller } = createController(state, true);

    antennaManager.soundIntensityBase = 1;
    antennaManager.muteSoundThreshold = 2;
    antennaManager.hitIntensity = 3;
    antennaManager.phantomSpawnProbability = 0.1;

    controller.onZoneEnter();

    expect(antennaManager.soundIntensityBase).toBe(2);
    expect(antennaManager.muteSoundThreshold).toBe(5);
    expect(antennaManager.hitIntensity).toBe(5);
    expect(antennaManager.phantomSpawnProbability).toBeCloseTo(0.6);
    expect(antennaManager.noStatic).toBe(true);
    expect(antennaManager.noMumble).toBe(true);
    expect(antennaManager.hitType).toBe("chemical_burn");
    expect(antennaManager.hitFreq).toBe(7);
    expect(level.add_pp_effector).not.toHaveBeenCalled();
  });

  it("should register post process effector on first zone enter", () => {
    const { antennaManager, controller } = createController(
      createPsyAntennaState({ postprocess: "psy_antenna.ppe" }),
      true
    );
    const nextId: number = antennaManager.postprocessNextId + 1;

    controller.onZoneEnter();

    expect(antennaManager.postprocessCount).toBe(1);
    expect(antennaManager.postprocessNextId).toBe(nextId);
    expect(antennaManager.postprocess.get("psy_antenna.ppe")).toEqual({
      idx: nextId,
      intensity: 0,
      intensityBase: 1,
    });
    expect(level.add_pp_effector).toHaveBeenCalledWith("psy_antenna.ppe", nextId, true);
    expect(level.set_pp_effector_factor).toHaveBeenCalledWith(nextId, 0.01);
  });

  it("should reuse registered post process effector", () => {
    const { antennaManager, controller } = createController(
      createPsyAntennaState({ postprocess: "psy_antenna.ppe" }),
      true
    );

    antennaManager.postprocess.set("psy_antenna.ppe", { idx: 1500, intensity: 0, intensityBase: 5 });

    controller.onZoneEnter();

    expect(antennaManager.postprocessCount).toBe(0);
    expect(antennaManager.postprocess.get("psy_antenna.ppe").intensityBase).toBe(6);
    expect(level.add_pp_effector).not.toHaveBeenCalled();
  });

  it("should roll back antenna effects on zone leave", () => {
    const { antennaManager, controller } = createController(
      createPsyAntennaState({ postprocess: "psy_antenna.ppe" }),
      true
    );

    antennaManager.soundIntensityBase = 4;
    antennaManager.muteSoundThreshold = 5;
    antennaManager.hitIntensity = 6;
    antennaManager.phantomSpawnProbability = 0.7;
    antennaManager.postprocess.set("psy_antenna.ppe", { idx: 1500, intensity: 0, intensityBase: 5 });

    controller.onZoneLeave();

    expect(controller.antennaState).toBe(EAntennaState.OUTSIDE);
    expect(antennaManager.soundIntensityBase).toBe(3);
    expect(antennaManager.muteSoundThreshold).toBe(2);
    expect(antennaManager.hitIntensity).toBe(4);
    expect(antennaManager.phantomSpawnProbability).toBeCloseTo(0.2);
    expect(antennaManager.postprocess.get("psy_antenna.ppe").intensityBase).toBe(4);
  });

  it("should ignore unknown post process effector on zone leave", () => {
    const { antennaManager, controller } = createController(
      createPsyAntennaState({ postprocess: "psy_antenna.ppe" }),
      true
    );

    controller.onZoneLeave();

    expect(antennaManager.postprocess.has("psy_antenna.ppe")).toBe(false);
  });

  it("should save antenna state", () => {
    const { controller, object } = createController(createPsyAntennaState(), true);

    controller.antennaState = EAntennaState.INSIDE;
    controller.save();

    expect(getPortableStoreValue(object.id(), "inside")).toBe(EAntennaState.INSIDE);
  });
});
