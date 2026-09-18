import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { time_global } from "xray16";
import { GameObject } from "xray16/alias";
import { TTimestamp } from "xray16/lib";
import { MockGameObject, MockVector } from "xray16/mocks";
import { replaceFunctionMock, resetFunctionMock } from "xray16/testing/utils";

import { ISchemePhysicalForceState } from "@/engine/core/schemes/physical/ph_force/ph_force_types";
import { PhysicalForceController } from "@/engine/core/schemes/physical/ph_force/PhysicalForceController";
import { trySwitchToAnotherSection } from "@/engine/core/schemes/runtime";
import { EScheme } from "@/engine/core/schemes/types";
import { mockSchemeState, resetRegistry } from "@/fixtures/engine";

jest.mock("@/engine/core/schemes/runtime/scheme_switch", () => ({
  trySwitchToAnotherSection: jest.fn(() => false),
}));

const NOW: TTimestamp = 10_000;

function createForceState(base: Partial<ISchemePhysicalForceState> = {}): ISchemePhysicalForceState {
  return mockSchemeState<ISchemePhysicalForceState>(EScheme.PH_FORCE, {
    delay: 0,
    force: 100,
    point: MockVector.create(10, 0, 0),
    time: 2000,
    ...base,
  });
}

describe("PhysicalForceController", () => {
  beforeEach(() => {
    resetRegistry();
    resetFunctionMock(trySwitchToAnotherSection);
    resetFunctionMock(time_global);
    replaceFunctionMock(trySwitchToAnotherSection, () => false);
    replaceFunctionMock(time_global, () => NOW);
  });

  it("should correctly initialize", () => {
    const object: GameObject = MockGameObject.mock();
    const controller: PhysicalForceController = new PhysicalForceController(object, createForceState());

    expect(controller.time).toBe(0);
    expect(controller.process).toBe(false);
  });

  it("should correctly activate without delay", () => {
    const object: GameObject = MockGameObject.mock();
    const controller: PhysicalForceController = new PhysicalForceController(object, createForceState());

    controller.process = true;
    controller.activate();

    expect(controller.time).toBe(NOW);
    expect(controller.process).toBe(false);
  });

  it("should correctly activate with delay", () => {
    const object: GameObject = MockGameObject.mock();
    const controller: PhysicalForceController = new PhysicalForceController(object, createForceState({ delay: 500 }));

    controller.activate();

    expect(controller.time).toBe(NOW + 500);
    expect(controller.process).toBe(false);
  });

  it("should not apply force when switching to another section", () => {
    const object: GameObject = MockGameObject.mock();
    const controller: PhysicalForceController = new PhysicalForceController(object, createForceState());

    replaceFunctionMock(trySwitchToAnotherSection, () => true);

    controller.update();

    expect(object.set_const_force).not.toHaveBeenCalled();
    expect(controller.process).toBe(false);
  });

  it("should apply force immediately when reactivated without a pending delay", () => {
    const object: GameObject = MockGameObject.mock();
    const controller: PhysicalForceController = new PhysicalForceController(object, createForceState({ delay: 5000 }));

    controller.activate();
    controller.update();

    expect(object.set_const_force).not.toHaveBeenCalled();

    replaceFunctionMock(time_global, () => NOW + 100);
    controller.state.delay = 0;
    controller.activate();
    controller.update();
    controller.update();

    expect(object.set_const_force).toHaveBeenCalledTimes(1);
    expect(controller.process).toBe(true);
  });

  it("should apply force only once", () => {
    const object: GameObject = MockGameObject.mock({ position: MockVector.create(1, 0, 0) });
    const controller: PhysicalForceController = new PhysicalForceController(object, createForceState());

    controller.activate();
    controller.update();

    expect(controller.process).toBe(true);
    expect(object.set_const_force).toHaveBeenCalledTimes(1);

    const [direction, force, duration] = jest.mocked(object.set_const_force).mock.calls[0];

    expect(direction).toEqual(MockVector.create(1, 0, 0));
    expect(force).toBe(100);
    expect(duration).toBe(2000);

    controller.update();

    expect(object.set_const_force).toHaveBeenCalledTimes(1);
  });

  it("should wait for delay before applying force", () => {
    const object: GameObject = MockGameObject.mock();
    const controller: PhysicalForceController = new PhysicalForceController(object, createForceState({ delay: 500 }));

    controller.activate();
    controller.update();

    expect(object.set_const_force).not.toHaveBeenCalled();
    expect(controller.process).toBe(false);

    controller.time = NOW - 1;
    controller.update();

    expect(object.set_const_force).toHaveBeenCalledTimes(1);
    expect(controller.process).toBe(true);
  });
});
