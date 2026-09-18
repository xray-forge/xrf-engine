import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { level } from "xray16";
import { GameObject, Vector } from "xray16/alias";
import { $fromArray } from "xray16/macros";
import { MockGameObject, MockVector } from "xray16/mocks";

import { CampController, EObjectCampActivity } from "@/engine/core/ai/camp";
import {
  animpoint_predicates,
  animpointPredicateAlways,
} from "@/engine/core/animation/predicates/animpoint_predicates";
import { EStalkerState } from "@/engine/core/animation/types";
import { registerObject, registerSmartCover, registry } from "@/engine/core/database";
import { SmartCover } from "@/engine/core/objects/smart_cover";
import {
  IAnimpointActionDescriptor,
  ISchemeAnimpointState,
} from "@/engine/core/schemes/stalker/animpoint/animpoint_types";
import { AnimpointController } from "@/engine/core/schemes/stalker/animpoint/AnimpointController";
import { EScheme } from "@/engine/core/schemes/types";
import { mockSchemeState, MockSmartCover, resetRegistry } from "@/fixtures/engine";

describe("AnimpointController", () => {
  beforeEach(() => {
    resetRegistry();

    // todo: Update xrf sdk.
    const mathMock = math as unknown as {
      atan2(x: number, y: number): number;
      deg(radians: number): number;
    };

    mathMock.atan2 = Math.atan2;
    mathMock.deg = (radians: number): number => (radians * 180) / Math.PI;
  });

  it("should activate from a clean state and stop a stale camp activity", () => {
    const object: GameObject = MockGameObject.mock();
    const state: ISchemeAnimpointState = mockSchemeState<ISchemeAnimpointState>(EScheme.ANIMPOINT, {
      coverName: "test_cover",
      useCamp: true,
    });
    const controller: AnimpointController = new AnimpointController(object, state);

    jest.spyOn(controller, "calculatePosition").mockImplementation(jest.fn());
    jest.spyOn(controller, "stop").mockImplementation(jest.fn());

    controller.activate(object);

    expect(state.signals).toEqualLuaTables({});
    expect(controller.calculatePosition).toHaveBeenCalledTimes(1);
    expect(controller.stop).not.toHaveBeenCalled();

    controller.isStarted = true;
    controller.activate(object);

    expect(controller.stop).toHaveBeenCalledTimes(1);
  });

  it.each([false, true])("should leave camp when disabled with an explicit stop=%s", (stopFirst) => {
    const object: GameObject = MockGameObject.mock();
    const campObject: GameObject = MockGameObject.mock();
    const camp: CampController = {
      object: campObject,
      registerObject: jest.fn(),
      unregisterObject: jest.fn(),
    } as unknown as CampController;

    const state: ISchemeAnimpointState = mockSchemeState<ISchemeAnimpointState>(EScheme.ANIMPOINT, {
      coverName: "test_cover",
      useCamp: true,
      availableAnimations: $fromArray<EStalkerState>([EStalkerState.SIT]),
      approvedActions: new LuaTable(),
    });

    const controller = new AnimpointController(object, state);

    registry.camps.set(campObject.id(), camp);
    jest.spyOn(campObject, "inside").mockReturnValue(true);
    jest.spyOn(controller, "calculatePosition").mockImplementation(() => {
      state.approvedActions = new LuaTable();
    });

    controller.position = MockVector.mock(1, 2, 3);
    controller.start();
    controller.currentAction = EStalkerState.SIT;

    if (stopFirst) {
      controller.stop();
    }

    state.useCamp = false;
    controller.activate(object);

    expect(camp.unregisterObject).toHaveBeenCalledTimes(1);
    expect(controller.campController).toBeNull();

    controller.start();

    expect(camp.registerObject).toHaveBeenCalledTimes(1);
    expect(controller.currentAction).toBe(EStalkerState.SIT);

    controller.stop();

    expect(camp.unregisterObject).toHaveBeenCalledTimes(1);

    state.useCamp = true;
    controller.start();

    expect(camp.registerObject).toHaveBeenCalledTimes(2);
    expect(controller.campController).toBe(camp);
  });

  it("should select available non-camp and camp animations", () => {
    const object: GameObject = MockGameObject.mock();
    const state: ISchemeAnimpointState = mockSchemeState<ISchemeAnimpointState>(EScheme.ANIMPOINT, {
      useCamp: false,
      availableAnimations: $fromArray<EStalkerState>([EStalkerState.SIT, EStalkerState.WALK]),
    });
    const controller: AnimpointController = new AnimpointController(object, state);

    controller.update();

    expect([EStalkerState.SIT, EStalkerState.WALK]).toContain(controller.currentAction);

    state.useCamp = true;
    state.description = EStalkerState.ANIMPOINT_SIT_NORMAL;
    state.availableAnimations = null;
    state.approvedActions = $fromArray<IAnimpointActionDescriptor>([
      { name: EStalkerState.ANIMPOINT_SIT_NORMAL, predicate: animpointPredicateAlways },
    ]);
    controller.campController = {
      getObjectActivity: jest.fn(() => $multi(EObjectCampActivity.IDLE, false)),
    } as unknown as CampController;

    controller.update();

    expect(controller.currentAction).toBe(EStalkerState.ANIMPOINT_SIT_NORMAL);
    expect(state.actionNameBase).toBe(EStalkerState.ANIMPOINT_SIT_NORMAL);
  });

  it("should calculate smart-cover position and detect when it is reached", () => {
    const object: GameObject = MockGameObject.mock();
    const state: ISchemeAnimpointState = mockSchemeState<ISchemeAnimpointState>(EScheme.ANIMPOINT, {
      coverName: "test_cover",
      availableAnimations: $fromArray<EStalkerState>([EStalkerState.ANIMPOINT_STAY_WALL]),
      reachDistanceSqr: 1,
    });
    const controller: AnimpointController = new AnimpointController(object, state);
    const cover: SmartCover = MockSmartCover.mock("test_cover");
    const position: Vector = MockVector.mock(10, 20, 30);
    const vertexPosition: Vector = MockVector.mock(11, 20, 31);

    expect(controller.isPositionReached()).toBe(false);

    cover.position = position;
    cover.angle = MockVector.mock(0, 0, 0);

    jest.spyOn(cover, "description").mockImplementation(() => EStalkerState.ANIMPOINT_STAY_WALL);
    jest.spyOn(level, "vertex_id").mockImplementation(() => 25);
    jest.spyOn(level, "vertex_position").mockImplementation(() => vertexPosition);

    registerSmartCover(cover);
    controller.calculatePosition();

    expect(controller.position).toBe(position);
    expect(controller.positionLevelVertexId).toBe(25);
    expect(controller.vertexPosition).toBe(vertexPosition);
    expect(controller.smartCoverDirection).not.toBeNull();
    expect(controller.lookPosition).not.toBeNull();
    expect(state.description).toBe(EStalkerState.ANIMPOINT_STAY_WALL);
    expect(controller.availableActions).toBe(animpoint_predicates.get(EStalkerState.ANIMPOINT_STAY_WALL));
    expect(state.approvedActions).toEqualLuaArrays([]);
    expect(controller.getAnimationParameters()).toEqual([controller.position, controller.smartCoverDirection]);

    registerObject(object);
    controller.vertexPosition = object.position();
    controller.smartCoverDirection = object.direction();

    jest.spyOn(object.position(), "distance_to_sqr").mockImplementation(() => 0);

    expect(controller.isPositionReached()).toBe(true);
    expect(controller.isDirectionReached).toBe(true);

    // Performed turn is latched, transient direction mismatch does not reset it.
    controller.smartCoverDirection = MockVector.mock(0, 0, -1);

    expect(controller.isPositionReached()).toBe(true);

    // Leaving the place invalidates performed turn.
    jest.spyOn(object.position(), "distance_to_sqr").mockImplementation(() => 100);

    expect(controller.isPositionReached()).toBe(false);
    expect(controller.isDirectionReached).toBe(false);

    // Back at the place, but looking in another direction.
    jest.spyOn(object.position(), "distance_to_sqr").mockImplementation(() => 0);

    expect(controller.isPositionReached()).toBe(false);

    controller.currentAction = EStalkerState.SIT;

    expect(controller.isPositionReached()).toBe(true);
  });

  it("should reset performed turn when cover changes", () => {
    const object: GameObject = MockGameObject.mock();
    const state: ISchemeAnimpointState = mockSchemeState<ISchemeAnimpointState>(EScheme.ANIMPOINT, {
      coverName: "test_cover",
      availableAnimations: $fromArray<EStalkerState>([EStalkerState.ANIMPOINT_STAY_WALL]),
    });
    const controller: AnimpointController = new AnimpointController(object, state);
    const cover: SmartCover = MockSmartCover.mock("test_cover");

    cover.position = MockVector.mock(10, 20, 30);
    cover.angle = MockVector.mock(0, 0, 0);

    jest.spyOn(cover, "description").mockImplementation(() => EStalkerState.ANIMPOINT_STAY_WALL);
    jest.spyOn(level, "vertex_id").mockImplementation(() => 25);
    jest.spyOn(level, "vertex_position").mockImplementation(() => MockVector.mock(11, 20, 31));

    registerSmartCover(cover);

    controller.calculatePosition();
    controller.isDirectionReached = true;

    // Same cover position, turn stays valid.
    controller.calculatePosition();

    expect(controller.isDirectionReached).toBe(true);

    cover.position = MockVector.mock(40, 50, 60);
    controller.calculatePosition();

    expect(controller.isDirectionReached).toBe(false);
  });

  it("should fill approved actions from configured animations or matching predicates", () => {
    const object: GameObject = MockGameObject.mock();
    const state: ISchemeAnimpointState = mockSchemeState<ISchemeAnimpointState>(EScheme.ANIMPOINT, {
      availableAnimations: $fromArray<EStalkerState>([EStalkerState.SIT, EStalkerState.WALK]),
      approvedActions: new LuaTable(),
    });
    const controller: AnimpointController = new AnimpointController(object, state);

    controller.fillPossibleAnimationActions();

    expect(state.approvedActions).toEqualLuaArrays([
      { name: EStalkerState.SIT, predicate: animpointPredicateAlways },
      { name: EStalkerState.WALK, predicate: animpointPredicateAlways },
    ]);

    const allowed: IAnimpointActionDescriptor = {
      name: EStalkerState.SNEAK,
      predicate: jest.fn(() => true),
    };
    const rejected: IAnimpointActionDescriptor = {
      name: EStalkerState.PATROL,
      predicate: jest.fn(() => false),
    };

    state.availableAnimations = null;
    state.approvedActions = new LuaTable();
    controller.availableActions = $fromArray([allowed, rejected]);

    controller.fillPossibleAnimationActions();

    expect(state.approvedActions).toEqualLuaArrays([allowed]);
    expect(allowed.predicate).toHaveBeenCalledWith(object, false);
    expect(rejected.predicate).toHaveBeenCalledWith(object, false);
  });

  it("should start and stop standalone or camp animpoint activities", () => {
    const object: GameObject = MockGameObject.mock();
    const state: ISchemeAnimpointState = mockSchemeState<ISchemeAnimpointState>(EScheme.ANIMPOINT, {
      coverName: "test_cover",
      useCamp: false,
      approvedActions: $fromArray<IAnimpointActionDescriptor>([
        { name: EStalkerState.SIT, predicate: animpointPredicateAlways },
      ]),
    });
    const controller: AnimpointController = new AnimpointController(object, state);

    controller.start();

    expect(controller.isStarted).toBe(true);
    expect(controller.coverName).toBe("test_cover");
    expect(controller.currentAction).toBe(EStalkerState.SIT);

    controller.stop();

    expect(controller.isStarted).toBe(false);
    expect(controller.currentAction).toBeNull();

    const campObject: GameObject = MockGameObject.mock();
    const campController = {
      object: campObject,
      registerObject: jest.fn(),
      unregisterObject: jest.fn(),
    } as unknown as CampController;

    state.useCamp = true;
    controller.position = MockVector.mock(1, 2, 3);

    registry.camps.set(campObject.id(), campController);
    jest.spyOn(campObject, "inside").mockImplementation(() => true);

    controller.start();

    expect(controller.campController).toBe(campController);
    expect(campController.registerObject).toHaveBeenCalledWith(object.id());

    controller.stop();

    expect(campController.unregisterObject).toHaveBeenCalledWith(object.id());
  });
});
