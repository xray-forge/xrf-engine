import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { GameObject } from "xray16/alias";
import { MockGameObject } from "xray16/mocks";
import { replaceFunctionMock, resetFunctionMock } from "xray16/testing/utils";

import { registry } from "@/engine/core/database";
import { LightController } from "@/engine/core/schemes/restrictor/sr_light/LightController";
import { ISchemeLightState } from "@/engine/core/schemes/restrictor/sr_light/sr_light_types";
import { trySwitchToAnotherSection } from "@/engine/core/schemes/runtime";
import { EScheme } from "@/engine/core/schemes/types";
import { mockSchemeState, resetRegistry } from "@/fixtures/engine";

jest.mock("@/engine/core/schemes/runtime/scheme_switch", () => ({
  trySwitchToAnotherSection: jest.fn(() => false),
}));

describe("LightController", () => {
  beforeEach(() => {
    resetRegistry();
    resetFunctionMock(trySwitchToAnotherSection);
    replaceFunctionMock(trySwitchToAnotherSection, () => false);
  });

  it("should register light zone on activation", () => {
    const object: GameObject = MockGameObject.mock();
    const state: ISchemeLightState = mockSchemeState<ISchemeLightState>(EScheme.SR_LIGHT, { light: true });
    const controller: LightController = new LightController(object, state);

    expect(controller.active).toBe(false);

    controller.activate();

    expect(registry.lightZones.get(object.id())).toBe(controller);
  });

  it("should activate zone on update", () => {
    const object: GameObject = MockGameObject.mock();
    const state: ISchemeLightState = mockSchemeState<ISchemeLightState>(EScheme.SR_LIGHT, { light: true });
    const controller: LightController = new LightController(object, state);

    controller.activate();
    controller.update();

    expect(controller.active).toBe(true);
    expect(registry.lightZones.has(object.id())).toBe(true);
  });

  it("should unregister zone on deactivation", () => {
    const object: GameObject = MockGameObject.mock();
    const state: ISchemeLightState = mockSchemeState<ISchemeLightState>(EScheme.SR_LIGHT, { light: true });
    const controller: LightController = new LightController(object, state);

    controller.activate();
    controller.update();

    controller.deactivate();

    expect(controller.active).toBe(false);
    expect(registry.lightZones.has(object.id())).toBe(false);
  });

  it("should stop updating when switching to another section", () => {
    const controller: LightController = new LightController(MockGameObject.mock(), mockSchemeState(EScheme.SR_LIGHT));

    replaceFunctionMock(trySwitchToAnotherSection, () => true);
    controller.update();

    expect(controller.active).toBe(false);
  });

  it("should not report light state for inactive zone", () => {
    const object: GameObject = MockGameObject.mock();
    const state: ISchemeLightState = mockSchemeState<ISchemeLightState>(EScheme.SR_LIGHT, { light: true });
    const controller: LightController = new LightController(object, state);

    jest.spyOn(object, "inside").mockImplementation(() => true);

    expect(controller.checkStalker(MockGameObject.mock())).toEqual([false, false]);
  });

  it("should report configured light state for object inside active zone", () => {
    const object: GameObject = MockGameObject.mock();
    const state: ISchemeLightState = mockSchemeState<ISchemeLightState>(EScheme.SR_LIGHT, { light: true });
    const controller: LightController = new LightController(object, state);

    controller.activate();
    controller.update();

    jest.spyOn(object, "inside").mockImplementation(() => true);
    expect(controller.checkStalker(MockGameObject.mock())).toEqual([true, true]);

    state.light = false;
    expect(controller.checkStalker(MockGameObject.mock())).toEqual([false, true]);

    jest.spyOn(object, "inside").mockImplementation(() => false);
    expect(controller.checkStalker(MockGameObject.mock())).toEqual([false, false]);
  });
});
