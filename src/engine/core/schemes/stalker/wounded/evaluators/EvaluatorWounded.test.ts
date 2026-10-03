import { describe, expect, it, jest } from "@jest/globals";
import { GameObject } from "xray16/alias";
import { MockGameObject, MockPropertyStorage } from "xray16/mocks";

import { registerObject, setPortableStoreValue } from "@/engine/core/database";
import { ISchemeWoundedState, PS_WOUNDED_FIGHT, PS_WOUNDED_STATE } from "@/engine/core/schemes/stalker/wounded";
import { EvaluatorWounded } from "@/engine/core/schemes/stalker/wounded/evaluators/EvaluatorWounded";
import { WoundController } from "@/engine/core/schemes/stalker/wounded/WoundController";
import { EScheme } from "@/engine/core/schemes/types";
import { mockSchemeState } from "@/fixtures/engine";

function mockEvaluator(hasEnemy: boolean = false): {
  evaluator: EvaluatorWounded;
  state: ISchemeWoundedState;
  object: GameObject;
} {
  const object: GameObject = MockGameObject.mock();
  const state: ISchemeWoundedState = mockSchemeState(EScheme.WOUNDED);
  const evaluator: EvaluatorWounded = new EvaluatorWounded(state);

  registerObject(object);

  state.woundController = new WoundController(object, state);

  jest.spyOn(state.woundController, "update").mockImplementation(jest.fn());

  if (hasEnemy) {
    jest.spyOn(object, "best_enemy").mockImplementation(() => MockGameObject.mock());
  }

  evaluator.setup(object, MockPropertyStorage.mock());

  return { evaluator, state, object };
}

describe("EvaluatorWounded", () => {
  it("should correctly evaluate whether is wounded", () => {
    const { object, evaluator, state } = mockEvaluator(false);

    expect(evaluator.evaluate()).toBe(false);

    setPortableStoreValue(object.id(), PS_WOUNDED_STATE, "test");
    expect(evaluator.evaluate()).toBe(false);

    state.isWoundedInitialized = true;
    expect(evaluator.evaluate()).toBe(true);

    setPortableStoreValue(object.id(), PS_WOUNDED_STATE, null);
    expect(evaluator.evaluate()).toBe(false);

    setPortableStoreValue(object.id(), PS_WOUNDED_STATE, "wounded");
    expect(evaluator.evaluate()).toBe(true);

    jest.spyOn(object, "in_smart_cover").mockImplementation(() => true);
    expect(evaluator.evaluate()).toBe(false);

    jest.spyOn(object, "in_smart_cover").mockImplementation(() => false);
    jest.spyOn(object, "critically_wounded").mockImplementation(() => true);
    expect(evaluator.evaluate()).toBe(false);
  });

  it("reads the wound state without recalculating it", () => {
    const { evaluator, state } = mockEvaluator(false);

    state.isWoundedInitialized = true;
    evaluator.evaluate();

    expect(state.woundController.update).not.toHaveBeenCalled();
  });

  it("should correctly evaluate whether is wounded if has wounded fight", () => {
    const { object, evaluator, state } = mockEvaluator(true);

    state.isWoundedInitialized = true;

    setPortableStoreValue(object.id(), PS_WOUNDED_STATE, "wounded");
    expect(evaluator.evaluate()).toBe(true);

    setPortableStoreValue(object.id(), PS_WOUNDED_FIGHT, "true");
    expect(evaluator.evaluate()).toBe(false);
  });
});
