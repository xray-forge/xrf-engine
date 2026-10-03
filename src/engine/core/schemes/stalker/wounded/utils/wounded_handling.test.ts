import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { GameObject } from "xray16/alias";
import { MockGameObject } from "xray16/mocks";

import { IRegistryObjectState, registerObject } from "@/engine/core/database";
import { updateObjectWound } from "@/engine/core/schemes/stalker/wounded/utils/wounded_handling";
import { WoundController } from "@/engine/core/schemes/stalker/wounded/WoundController";
import { ISchemeWoundedState } from "@/engine/core/schemes/stalker/wounded/wounded_types";
import { setSchemeState } from "@/engine/core/schemes/state";
import { EScheme } from "@/engine/core/schemes/types";
import { mockSchemeState, resetRegistry } from "@/fixtures/engine";

/**
 * Register object with a wounded scheme state whose controller update is spied on.
 */
function registerWoundedObject(object: GameObject): [IRegistryObjectState, ISchemeWoundedState] {
  const state: IRegistryObjectState = registerObject(object);
  const woundedState: ISchemeWoundedState = mockSchemeState<ISchemeWoundedState>(EScheme.WOUNDED);

  woundedState.woundController = new WoundController(object, woundedState);
  jest.spyOn(woundedState.woundController, "update").mockImplementation(jest.fn());
  setSchemeState(state, EScheme.WOUNDED, woundedState);

  return [state, woundedState];
}

describe("updateObjectWound", () => {
  beforeEach(() => {
    resetRegistry();
  });

  it("recalculates the wound state of an object with a configured wounded scheme", () => {
    const object: GameObject = MockGameObject.mock();
    const [state, woundedState] = registerWoundedObject(object);

    woundedState.isWoundedInitialized = true;
    updateObjectWound(object, state);

    expect(woundedState.woundController.update).toHaveBeenCalledTimes(1);
  });

  it("skips objects without a configured wounded scheme", () => {
    const object: GameObject = MockGameObject.mock();
    const [state, woundedState] = registerWoundedObject(object);

    updateObjectWound(object, state);
    expect(woundedState.woundController.update).not.toHaveBeenCalled();

    expect(() => updateObjectWound(object, registerObject(MockGameObject.mock()))).not.toThrow();
  });

  it("skips objects in smart covers", () => {
    const object: GameObject = MockGameObject.mock();
    const [state, woundedState] = registerWoundedObject(object);

    woundedState.isWoundedInitialized = true;
    jest.spyOn(object, "in_smart_cover").mockImplementation(() => true);
    updateObjectWound(object, state);

    expect(woundedState.woundController.update).not.toHaveBeenCalled();
  });
});
