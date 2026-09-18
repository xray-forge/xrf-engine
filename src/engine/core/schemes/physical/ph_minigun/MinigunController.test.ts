import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { CCar, move, time_global } from "xray16";
import { Car, GameObject } from "xray16/alias";
import { ACTOR, ACTOR_ID, NIL, TTimestamp } from "xray16/lib";
import { type IMockCCarConfig, MockGameObject, MockVector } from "xray16/mocks";
import { replaceFunctionMock, resetFunctionMock } from "xray16/testing/utils";

import { registerStoryLink } from "@/engine/core/database";
import { parseConditionsList } from "@/engine/core/ini";
import { minigunConfig } from "@/engine/core/schemes/physical/ph_minigun/MinigunConfig";
import { MinigunController } from "@/engine/core/schemes/physical/ph_minigun/MinigunController";
import {
  EMinigunCannonState,
  EMinigunFireTargetState,
  EMinigunState,
  ISchemeMinigunState,
} from "@/engine/core/schemes/physical/ph_minigun/ph_minigun_types";
import {
  isActiveSection,
  isMonsterScriptCaptured,
  scriptReleaseMonster,
  switchObjectSchemeToSection,
  trySwitchToAnotherSection,
} from "@/engine/core/schemes/runtime";
import { EScheme } from "@/engine/core/schemes/types";
import { isObjectWounded } from "@/engine/core/utils/planner";
import { mockBaseSchemeLogic, mockRegisteredActor, mockSchemeState, resetRegistry } from "@/fixtures/engine";

jest.mock("@/engine/core/schemes/runtime", () => ({
  isActiveSection: jest.fn(() => true),
  isMonsterScriptCaptured: jest.fn(() => false),
  scriptReleaseMonster: jest.fn(),
  switchObjectSchemeToSection: jest.fn(),
  trySwitchToAnotherSection: jest.fn(() => false),
}));

jest.mock("@/engine/core/utils/planner", () => ({
  isObjectWounded: jest.fn(() => false),
}));

const NOW: TTimestamp = 10_000;

function createMinigunState(base: Partial<ISchemeMinigunState> = {}): ISchemeMinigunState {
  return mockSchemeState<ISchemeMinigunState>(EScheme.PH_MINIGUN, {
    autoFire: true,
    fireAngle: 120,
    fireRange: 50,
    fireRep: 0.5,
    fireTarget: "points",
    fireTime: 1,
    fireTrackTarget: false,
    onDeathInfo: null,
    onTargetNvis: null,
    onTargetVis: null,
    pathFire: null,
    shootOnlyOnVisible: true,
    ...base,
  });
}

/**
 * Create a minigun controller over an object with an attached car mock.
 */
function createController(
  state: ISchemeMinigunState,
  carConfig: IMockCCarConfig = {}
): { car: Car; controller: MinigunController; object: GameObject } {
  const object: GameObject = MockGameObject.mockCar({ position: MockVector.create(0, 0, 0) }, carConfig);

  return { car: object.get_car(), controller: new MinigunController(object, state), object };
}

describe("MinigunController", () => {
  beforeEach(() => {
    resetRegistry();
    resetFunctionMock(isActiveSection);
    resetFunctionMock(isMonsterScriptCaptured);
    resetFunctionMock(scriptReleaseMonster);
    resetFunctionMock(switchObjectSchemeToSection);
    resetFunctionMock(trySwitchToAnotherSection);
    resetFunctionMock(isObjectWounded);
    resetFunctionMock(time_global);
    replaceFunctionMock(time_global, () => NOW);
    replaceFunctionMock(isActiveSection, () => true);
    replaceFunctionMock(isMonsterScriptCaptured, () => false);
    replaceFunctionMock(trySwitchToAnotherSection, () => false);
    replaceFunctionMock(isObjectWounded, () => false);
  });

  it("should correctly initialize", () => {
    const { controller, car } = createController(createMinigunState());

    expect(controller.mgun).toBe(car);
    expect(controller.destroyed).toBe(false);
    expect(controller.stateCannon).toBe(EMinigunCannonState.NONE);
    expect(controller.stateFiretarget).toBe(EMinigunFireTargetState.NONE);
    expect(controller.stateShooting).toBe(EMinigunState.NONE);
    expect(controller.startLookPos).not.toBeNull();
  });

  it("should correctly activate without weapon", () => {
    mockRegisteredActor();

    const { controller, car, object } = createController(createMinigunState(), { hasWeapon: false });

    controller.activate();

    expect(controller.hasWeapon).toBe(false);
    expect(car.Action).not.toHaveBeenCalled();
    expect(controller.startShootingTime).toBe(NOW);
    expect(controller.startDelayingTime).toBe(NOW);
    expect(controller.fcUpdNum).toBe(0);
    expect(controller.fcUpdAvg).toBe(10);
    expect(controller.fcLastUpdTm).toBe(-1);
    expect(controller.stateDelaying).toBe(false);
    expect(object.set_nonscript_usable).toHaveBeenCalledWith(false);
    expect(object.set_tip_text).toHaveBeenCalledWith("");
    expect(object.set_fastcall).toHaveBeenCalledWith(controller.fastcall, controller);
  });

  it("should correctly activate with points target", () => {
    mockRegisteredActor();

    const { controller, car } = createController(createMinigunState({ pathFire: "test-wp" }));

    controller.activate();

    expect(controller.hasWeapon).toBe(true);
    expect(car.Action).toHaveBeenCalledWith(CCar.eWpnActivate, 1);
    expect(controller.stateFiretarget).toBe(EMinigunFireTargetState.POINTS);
    expect(controller.stateCannon).toBe(EMinigunCannonState.FOLLOW);
    expect(controller.stateShooting).toBe(EMinigunState.NONE);
    expect(controller.pathFirePoint).not.toBeNull();
    expect(controller.fireRangeSqr).toBe(2500);
    expect(controller.defFireTime).toBe(1);
    expect(controller.defFireRep).toBe(0.5);
    expect(controller.fireRep).toBe(0.5);
  });

  it("should reset states when points target has no fire path", () => {
    mockRegisteredActor();

    const { controller } = createController(createMinigunState({ pathFire: null }));

    controller.activate();

    expect(controller.stateFiretarget).toBe(EMinigunFireTargetState.NONE);
    expect(controller.stateCannon).toBe(EMinigunCannonState.NONE);
    expect(controller.stateShooting).toBe(EMinigunState.NONE);
  });

  it("should fail activation on missing fire patrol path", () => {
    mockRegisteredActor();

    const { controller } = createController(createMinigunState({ pathFire: "not-existing-path" }));

    expect(() => controller.activate()).toThrow("[ph_minigun] patrol path not-existing-path doesnt exist.");
  });

  it("should correctly activate with actor as target", () => {
    const { actorGameObject } = mockRegisteredActor();
    const { controller } = createController(createMinigunState({ fireTarget: ACTOR }));

    controller.activate();

    expect(controller.targetObject).toBe(actorGameObject);
    expect(controller.stateFiretarget).toBe(EMinigunFireTargetState.ENEMY);
    expect(controller.stateCannon).toBe(EMinigunCannonState.FOLLOW);
  });

  it("should correctly activate with story object as target", () => {
    mockRegisteredActor();

    const target: GameObject = MockGameObject.mock();

    registerStoryLink(target.id(), "target_sid");

    const { controller } = createController(createMinigunState({ fireTarget: "target_sid" }));

    controller.activate();

    expect(controller.targetObject).toBe(target);
    expect(controller.stateFiretarget).toBe(EMinigunFireTargetState.ENEMY);
  });

  it("should ignore dead and unknown story targets", () => {
    mockRegisteredActor();

    const dead: GameObject = MockGameObject.mock();

    jest.spyOn(dead, "alive").mockImplementation(() => false);
    registerStoryLink(dead.id(), "dead_sid");

    const { controller: withDead } = createController(createMinigunState({ fireTarget: "dead_sid" }));

    withDead.activate();

    expect(withDead.targetObject).toBeNull();
    expect(withDead.stateFiretarget).toBe(EMinigunFireTargetState.NONE);

    const { controller: withUnknown } = createController(createMinigunState({ fireTarget: "unknown_sid" }));

    withUnknown.activate();

    expect(withUnknown.targetObject).toBeNull();
    expect(withUnknown.stateFiretarget).toBe(EMinigunFireTargetState.NONE);
  });

  it("should resolve on target visibility handlers by story id", () => {
    mockRegisteredActor();

    const visible: GameObject = MockGameObject.mock();
    const invisible: GameObject = MockGameObject.mock();

    registerStoryLink(visible.id(), "vis_sid");
    registerStoryLink(invisible.id(), "nvis_sid");

    const { controller } = createController(
      createMinigunState({
        onTargetNvis: mockBaseSchemeLogic({ p1: "nvis_sid", condlist: parseConditionsList("nvis@section") }),
        onTargetVis: mockBaseSchemeLogic({ p1: "vis_sid", condlist: parseConditionsList("vis@section") }),
        pathFire: "test-wp",
      })
    );

    controller.activate();

    expect(controller.onTargetVis?.p1).toBe(visible);
    expect(controller.onTargetNvis?.p1).toBe(invisible);
  });

  it("should skip on target handlers without story id", () => {
    mockRegisteredActor();

    const { controller } = createController(
      createMinigunState({
        onTargetNvis: mockBaseSchemeLogic({ p1: null }),
        onTargetVis: mockBaseSchemeLogic({ p1: null }),
        pathFire: "test-wp",
      })
    );

    controller.activate();

    expect(controller.onTargetVis).toBeNull();
    expect(controller.onTargetNvis).toBeNull();
  });

  it("should stop scheme on update when destroyed", () => {
    const state: ISchemeMinigunState = createMinigunState();
    const { controller, object } = createController(state);

    controller.destroyed = true;
    controller.update();

    expect(switchObjectSchemeToSection).toHaveBeenCalledWith(object, state.ini, NIL);
  });

  it("should skip update when switching to another section", () => {
    const { controller } = createController(createMinigunState());

    replaceFunctionMock(trySwitchToAnotherSection, () => true);
    jest.spyOn(controller, "checkFireTime").mockImplementation(jest.fn());

    controller.update();

    expect(controller.checkFireTime).not.toHaveBeenCalled();
    expect(switchObjectSchemeToSection).not.toHaveBeenCalled();
  });

  it("should check fire time on update", () => {
    const { controller } = createController(createMinigunState());

    jest.spyOn(controller, "checkFireTime").mockImplementation(jest.fn());

    controller.update();

    expect(controller.checkFireTime).toHaveBeenCalledTimes(1);
  });

  it("should ignore fire time checks with disabled repeat", () => {
    const { controller } = createController(createMinigunState({ fireRep: -1 }));

    controller.startShootingTime = 0;
    controller.checkFireTime();

    expect(controller.stateDelaying).toBe(false);
  });

  it("should alternate between shooting and delaying", () => {
    const { controller } = createController(createMinigunState({ fireRep: 0.5, fireTime: 1 }));

    // Source calls `math.random(-0.2, 0.2)`, which lua truncates to `math.random(0, 0)`.
    jest.spyOn(math, "random").mockImplementation(() => 0);

    controller.startShootingTime = NOW;
    controller.stateDelaying = false;
    controller.checkFireTime();

    expect(controller.stateDelaying).toBe(false);

    controller.startShootingTime = NOW - 2000;
    controller.startDelayingTime = NOW;
    controller.checkFireTime();

    expect(controller.stateDelaying).toBe(true);
    expect(controller.startShootingTime).toBe(NOW);

    controller.startShootingTime = NOW - 2000;
    controller.startDelayingTime = NOW - 2000;
    controller.checkFireTime();

    expect(controller.stateDelaying).toBe(false);
  });

  it("should stop shooting on fastcall when section is not active", () => {
    const { controller, car } = createController(createMinigunState());

    replaceFunctionMock(isActiveSection, () => false);

    expect(controller.fastcall()).toBe(true);
    expect(car.Action).toHaveBeenCalledWith(CCar.eWpnFire, EMinigunState.NONE);
  });

  it("should run fast update on fastcall when section is active", () => {
    const { controller } = createController(createMinigunState());

    jest.spyOn(controller, "fastUpdate").mockImplementation(() => false);

    expect(controller.fastcall()).toBe(false);
    expect(controller.fastUpdate).toHaveBeenCalledTimes(1);
  });

  it("should destroy car on fast update when health is depleted", () => {
    const { controller } = createController(createMinigunState(), { health: 0 });

    jest.spyOn(controller, "destroyCar").mockImplementation(jest.fn());

    expect(controller.fastUpdate()).toBe(true);
    expect(controller.destroyCar).toHaveBeenCalledTimes(1);
  });

  it("should track average fastcall update time", () => {
    const { controller } = createController(createMinigunState());

    controller.fcUpdNum = 0;
    controller.fcUpdAvg = 10;
    controller.fcLastUpdTm = -1;
    controller.hasWeapon = false;

    controller.fastUpdate();

    expect(controller.fcLastUpdTm).toBe(NOW);
    expect(controller.fcUpdNum).toBe(0);

    controller.fcUpdNum = 0;
    controller.fcLastUpdTm = NOW - 20;

    controller.fastUpdate();

    expect(controller.fcUpdNum).toBe(1);
    expect(controller.fcUpdAvg).toBe(20);

    controller.fcUpdNum = minigunConfig.DEFAULT_MAX_FC_UPD_NUM;
    controller.fcLastUpdTm = -1;

    controller.fastUpdate();

    expect(controller.fcLastUpdTm).toBe(-1);
  });

  it("should destroy car when stopped and script capture is lost", () => {
    const { controller, object } = createController(createMinigunState());

    controller.stateCannon = EMinigunCannonState.STOP;
    controller.stateFiretarget = EMinigunFireTargetState.NONE;
    jest.spyOn(controller, "destroyCar").mockImplementation(jest.fn());

    expect(controller.fastUpdate()).toBe(false);
    expect(controller.destroyCar).not.toHaveBeenCalled();

    replaceFunctionMock(isMonsterScriptCaptured, () => true);
    jest.spyOn(object, "action").mockImplementation(() => null);

    expect(controller.fastUpdate()).toBe(true);
    expect(controller.destroyCar).toHaveBeenCalledTimes(1);
  });

  it("should switch scheme when tracked target becomes visible or invisible", () => {
    const state: ISchemeMinigunState = createMinigunState();
    const { controller, car, object } = createController(state);
    const target: GameObject = MockGameObject.mock();

    controller.hasWeapon = true;
    controller.onTargetVis = mockBaseSchemeLogic({ p1: target as never, condlist: parseConditionsList("vis@section") });
    controller.onTargetNvis = mockBaseSchemeLogic({
      p1: target as never,
      condlist: parseConditionsList("nvis@section"),
    });

    jest.spyOn(car, "IsObjectVisible").mockImplementation(() => true);
    controller.fastUpdate();

    expect(switchObjectSchemeToSection).toHaveBeenCalledTimes(1);
    expect(switchObjectSchemeToSection).toHaveBeenCalledWith(object, state.ini, "vis@section");

    resetFunctionMock(switchObjectSchemeToSection);
    jest.spyOn(car, "IsObjectVisible").mockImplementation(() => false);
    controller.fastUpdate();

    expect(switchObjectSchemeToSection).toHaveBeenCalledTimes(1);
    expect(switchObjectSchemeToSection).toHaveBeenCalledWith(object, state.ini, "nvis@section");
  });

  it("should shoot at fire point when angle allows it", () => {
    const { controller, car } = createController(createMinigunState());

    controller.hasWeapon = true;
    controller.stateFiretarget = EMinigunFireTargetState.POINTS;
    controller.pathFirePoint = MockVector.create(0, 0, 5);
    controller.startDirection = MockVector.create(0, 0, 1);
    controller.stateDelaying = false;
    controller.stateShooting = EMinigunState.NONE;

    controller.fastUpdate();

    expect(car.SetParam).toHaveBeenCalledWith(CCar.eWpnDesiredPos, controller.pathFirePoint);
    expect(controller.stateShooting).toBe(EMinigunState.SHOOTING_ON);
    expect(car.Action).toHaveBeenCalledWith(CCar.eWpnFire, EMinigunState.SHOOTING_ON);
  });

  it("should stop shooting at fire point while delaying", () => {
    const { controller, car } = createController(createMinigunState());

    controller.hasWeapon = true;
    controller.stateFiretarget = EMinigunFireTargetState.POINTS;
    controller.pathFirePoint = MockVector.create(0, 0, 5);
    controller.startDirection = MockVector.create(0, 0, 1);
    controller.stateDelaying = true;
    controller.stateShooting = EMinigunState.SHOOTING_ON;

    controller.fastUpdate();

    expect(controller.stateShooting).toBe(EMinigunState.NONE);
    expect(car.Action).toHaveBeenCalledWith(CCar.eWpnFire, EMinigunState.NONE);
  });

  it("should not aim at fire point outside of fire angle", () => {
    const { controller, car } = createController(createMinigunState({ fireAngle: 1 }));

    controller.hasWeapon = true;
    controller.stateFiretarget = EMinigunFireTargetState.POINTS;
    controller.pathFirePoint = MockVector.create(5, 0, 0);
    controller.startDirection = MockVector.create(0, 0, 1);

    controller.fastUpdate();

    expect(car.SetParam).not.toHaveBeenCalled();
    expect(controller.stateShooting).toBe(EMinigunState.NONE);
  });

  it("should shoot at enemy target in range", () => {
    const { controller, car } = createController(createMinigunState());
    const target: GameObject = MockGameObject.mock({ id: 5, position: MockVector.create(0, 0, 5) });

    jest.spyOn(target, "target_body_state").mockImplementation(() => move.standing);

    controller.hasWeapon = true;
    controller.stateFiretarget = EMinigunFireTargetState.ENEMY;
    controller.targetObject = target;
    controller.startDirection = MockVector.create(0, 0, 1);
    controller.fireRangeSqr = 2500;
    controller.stateDelaying = false;
    controller.stateShooting = EMinigunState.NONE;

    controller.fastUpdate();

    expect(controller.targetFirePt?.y).toBe(1.2);
    expect(controller.stateShooting).toBe(EMinigunState.SHOOTING_ON);
    expect(car.Action).toHaveBeenCalledWith(CCar.eWpnFire, EMinigunState.SHOOTING_ON);
  });

  it("should aim higher at crouching enemy target", () => {
    const target: GameObject = MockGameObject.mock({ id: 5, position: MockVector.create(0, 0, 5) });

    jest.spyOn(target, "target_body_state").mockImplementation(() => move.crouch);

    const { controller } = createController(createMinigunState());

    controller.hasWeapon = true;
    controller.stateFiretarget = EMinigunFireTargetState.ENEMY;
    controller.targetObject = target;
    controller.startDirection = MockVector.create(0, 0, 1);
    controller.fireRangeSqr = 2500;

    controller.fastUpdate();

    expect(controller.targetFirePt?.y).toBe(0.5);
  });

  it("should aim lower at wounded enemy target", () => {
    const target: GameObject = MockGameObject.mock({ id: 5, position: MockVector.create(0, 0, 5) });

    jest.spyOn(target, "target_body_state").mockImplementation(() => move.standing);
    replaceFunctionMock(isObjectWounded, () => true);

    const { controller } = createController(createMinigunState());

    controller.hasWeapon = true;
    controller.stateFiretarget = EMinigunFireTargetState.ENEMY;
    controller.targetObject = target;
    controller.startDirection = MockVector.create(0, 0, 1);
    controller.fireRangeSqr = 2500;

    controller.fastUpdate();

    expect(controller.targetFirePt?.y).toBe(0.1);
  });

  it("should aim higher at actor target", () => {
    const target: GameObject = MockGameObject.mock({ id: ACTOR_ID, position: MockVector.create(0, 0, 5) });
    const { controller } = createController(createMinigunState());

    controller.hasWeapon = true;
    controller.stateFiretarget = EMinigunFireTargetState.ENEMY;
    controller.targetObject = target;
    controller.startDirection = MockVector.create(0, 0, 1);
    controller.fireRangeSqr = 2500;

    controller.fastUpdate();

    expect(controller.targetFirePt?.y).toBe(1);
  });

  it("should stop shooting at enemy target when hit is not possible", () => {
    const { controller, car } = createController(createMinigunState(), { canHit: false });
    const target: GameObject = MockGameObject.mock({ id: ACTOR_ID, position: MockVector.create(0, 0, 5) });

    controller.hasWeapon = true;
    controller.stateFiretarget = EMinigunFireTargetState.ENEMY;
    controller.targetObject = target;
    controller.startDirection = MockVector.create(0, 0, 1);
    controller.fireRangeSqr = 2500;
    controller.stateShooting = EMinigunState.SHOOTING_ON;

    controller.fastUpdate();

    expect(controller.stateShooting).toBe(EMinigunState.NONE);
    expect(car.Action).toHaveBeenCalledWith(CCar.eWpnFire, EMinigunState.NONE);
  });

  it("should stop shooting at enemy target while delaying", () => {
    const { controller } = createController(createMinigunState());
    const target: GameObject = MockGameObject.mock({ id: ACTOR_ID, position: MockVector.create(0, 0, 5) });

    controller.hasWeapon = true;
    controller.stateFiretarget = EMinigunFireTargetState.ENEMY;
    controller.targetObject = target;
    controller.startDirection = MockVector.create(0, 0, 1);
    controller.fireRangeSqr = 2500;
    controller.stateDelaying = true;
    controller.stateShooting = EMinigunState.SHOOTING_ON;

    controller.fastUpdate();

    expect(controller.stateShooting).toBe(EMinigunState.NONE);
    expect(controller.targetFirePt).toBeNull();
  });

  it("should return to start look position when enemy target is out of range", () => {
    const { controller, car } = createController(createMinigunState());
    const target: GameObject = MockGameObject.mock({ id: 5, position: MockVector.create(0, 0, 500) });

    controller.hasWeapon = true;
    controller.stateFiretarget = EMinigunFireTargetState.ENEMY;
    controller.targetObject = target;
    controller.startDirection = MockVector.create(0, 0, 1);
    controller.fireRangeSqr = 25;
    controller.stateShooting = EMinigunState.SHOOTING_ON;

    controller.fastUpdate();

    expect(controller.stateShooting).toBe(EMinigunState.NONE);
    expect(car.SetParam).toHaveBeenCalledWith(CCar.eWpnDesiredPos, controller.startLookPos);
  });

  it("should keep tracking enemy target that is out of range", () => {
    const { controller, car } = createController(createMinigunState({ fireTrackTarget: true }));
    const target: GameObject = MockGameObject.mock({ id: 5, position: MockVector.create(0, 0, 500) });

    controller.hasWeapon = true;
    controller.stateFiretarget = EMinigunFireTargetState.ENEMY;
    controller.targetObject = target;
    controller.fireTrackTarget = true;
    controller.startDirection = MockVector.create(0, 0, 1);
    controller.fireRangeSqr = 25;

    controller.fastUpdate();

    expect(controller.targetFirePt?.y).toBe(1);
    expect(car.SetParam).toHaveBeenCalledWith(CCar.eWpnDesiredPos, controller.targetFirePt);
  });

  it.each([false, true])("should respect target tracking after activation: %s", (fireTrackTarget) => {
    mockRegisteredActor({ position: MockVector.create(0, 0, 500) });

    const { controller, car } = createController(
      createMinigunState({ fireTarget: ACTOR, fireTrackTarget, fireRange: 5 })
    );

    controller.activate();
    controller.startDirection = MockVector.create(0, 0, 1);
    controller.stateShooting = EMinigunState.SHOOTING_ON;
    controller.fastUpdate();

    expect(controller.stateShooting).toBe(EMinigunState.NONE);
    expect(car.SetParam).toHaveBeenLastCalledWith(
      CCar.eWpnDesiredPos,
      fireTrackTarget ? MockVector.create(0, 1, 500) : controller.startLookPos
    );
  });

  it("should correctly destroy car", () => {
    const { actorGameObject } = mockRegisteredActor();
    const { controller, car, object } = createController(createMinigunState({ onDeathInfo: null }));

    controller.stateCannon = EMinigunCannonState.FOLLOW;
    controller.stateFiretarget = EMinigunFireTargetState.ENEMY;
    controller.stateShooting = EMinigunState.SHOOTING_ON;

    controller.destroyCar();

    expect(controller.stateCannon).toBe(EMinigunCannonState.NONE);
    expect(controller.stateFiretarget).toBe(EMinigunFireTargetState.NONE);
    expect(controller.stateShooting).toBe(EMinigunState.NONE);
    expect(car.Action).toHaveBeenCalledWith(CCar.eWpnAutoFire, 0);
    expect(car.Action).toHaveBeenCalledWith(CCar.eWpnFire, EMinigunState.NONE);
    expect(scriptReleaseMonster).toHaveBeenCalledWith(object);
    expect(actorGameObject.give_info_portion).not.toHaveBeenCalled();
    expect(controller.destroyed).toBe(true);
  });

  it("should give death info portion when destroying car", () => {
    const { actorGameObject } = mockRegisteredActor();
    const { controller } = createController(createMinigunState({ onDeathInfo: "test_info" as never }));

    controller.destroyCar();

    expect(actorGameObject.give_info_portion).toHaveBeenCalledWith("test_info");
  });

  it("should keep aim when rotation target is not provided", () => {
    const { controller, car } = createController(createMinigunState());

    controller.rotToFiredir(null);
    controller.rotToFirepoint(null);

    expect(car.SetParam).not.toHaveBeenCalled();

    controller.rotToFiredir(MockVector.create(1, 0, 0));
    controller.rotToFirepoint(MockVector.create(0, 0, 1));

    expect(car.SetParam).toHaveBeenCalledTimes(2);
  });

  it("should have noop save implementation", () => {
    const { controller } = createController(createMinigunState());

    expect(() => controller.save()).not.toThrow();
  });
});
