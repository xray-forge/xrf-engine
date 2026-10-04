import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { clsid, snd_type, time_global } from "xray16";
import { EGameObjectRelation, GameObject } from "xray16/alias";
import { TTimestamp } from "xray16/lib";
import { MockGameObject, MockVector } from "xray16/mocks";
import { replaceFunctionMock, resetFunctionMock } from "xray16/testing/utils";

import { registerObject, registry } from "@/engine/core/database";
import { ISchemeDangerState } from "@/engine/core/schemes/stalker/danger/danger_types";
import { DangerController } from "@/engine/core/schemes/stalker/danger/DangerController";
import { canObjectSelectAsEnemy } from "@/engine/core/schemes/stalker/danger/utils";
import { ISchemeWoundedState } from "@/engine/core/schemes/stalker/wounded";
import { WoundController } from "@/engine/core/schemes/stalker/wounded/WoundController";
import { setSchemeState } from "@/engine/core/schemes/state";
import { EScheme } from "@/engine/core/schemes/types";
import { mockSchemeState, resetRegistry } from "@/fixtures/engine";

jest.mock("@/engine/core/schemes/stalker/danger/utils", () => ({ canObjectSelectAsEnemy: jest.fn(() => true) }));

const NOW: TTimestamp = 100_000;

function createController(): { controller: DangerController; object: GameObject; state: ISchemeDangerState } {
  const object: GameObject = MockGameObject.mock({ position: MockVector.create(0, 0, 0) });
  const state: ISchemeDangerState = mockSchemeState<ISchemeDangerState>(EScheme.DANGER, { dangerTime: null });

  registerObject(object);

  return { controller: new DangerController(object, state), object, state };
}

/**
 * Register a sound source object that the listener treats as an enemy.
 */
function registerEnemySource(object: GameObject): GameObject {
  const who: GameObject = MockGameObject.mockStalker();

  registerObject(who);
  jest.spyOn(object, "relation").mockImplementation(() => EGameObjectRelation.ENEMY);

  return who;
}

describe("DangerController", () => {
  beforeEach(() => {
    resetRegistry();
    resetFunctionMock(canObjectSelectAsEnemy);
    resetFunctionMock(time_global);
    replaceFunctionMock(canObjectSelectAsEnemy, () => true);
    replaceFunctionMock(time_global, () => NOW);
  });

  it("should ignore sounds from unregistered objects", () => {
    const { controller, object, state } = createController();

    controller.onHear(object, 9999, snd_type.weapon_bullet_hit, MockVector.create(0, 0, 0), 1);

    expect(state.dangerTime).toBeNull();
  });

  it("should ignore sounds while already in combat", () => {
    const { controller, object, state } = createController();
    const who: GameObject = registerEnemySource(object);

    jest.spyOn(object, "best_enemy").mockImplementation(() => MockGameObject.mock());

    controller.onHear(object, who.id(), snd_type.weapon_bullet_hit, MockVector.create(0, 0, 0), 1);

    expect(state.dangerTime).toBeNull();
  });

  it("should ignore sounds from objects that cannot be enemies", () => {
    const { controller, object, state } = createController();
    const who: GameObject = registerEnemySource(object);

    replaceFunctionMock(canObjectSelectAsEnemy, () => false);

    controller.onHear(object, who.id(), snd_type.weapon_bullet_hit, MockVector.create(0, 0, 0), 1);

    expect(state.dangerTime).toBeNull();
  });

  it("should enter danger on nearby enemy bullet hit", () => {
    const { controller, object, state } = createController();
    const who: GameObject = registerEnemySource(object);

    // `MockVector.distance_to` is only a real distance when one of the vectors sits at the origin.
    controller.onHear(object, who.id(), snd_type.weapon_bullet_hit, MockVector.create(1, 0, 0), 1);

    expect(state.dangerTime).toBe(NOW);
    expect(object.set_dest_level_vertex_id).toHaveBeenCalledWith(who.level_vertex_id());
  });

  it("should enter danger without heading for a sound source its restrictors keep it from", () => {
    const { controller, object, state } = createController();
    const who: GameObject = registerEnemySource(object);

    jest.spyOn(object, "accessible").mockImplementation(() => false);

    controller.onHear(object, who.id(), snd_type.weapon_bullet_hit, MockVector.create(1, 0, 0), 1);

    expect(state.dangerTime).toBe(NOW);
    expect(object.accessible).toHaveBeenCalledWith(who.level_vertex_id());
    expect(object.set_dest_level_vertex_id).not.toHaveBeenCalled();
  });

  it("should ignore distant bullet hits", () => {
    const { controller, object, state } = createController();
    const who: GameObject = registerEnemySource(object);

    controller.onHear(object, who.id(), snd_type.weapon_bullet_hit, MockVector.create(100, 100, 100), 1);

    expect(state.dangerTime).toBeNull();
  });

  it("should reject out of range sounds before evaluating the sound source", () => {
    const { controller, object, state } = createController();
    const who: GameObject = registerEnemySource(object);

    // Beyond `ALLIES_SHOOTING_ASSIST_DISTANCE_SQR`, the largest distance any of the branches reacts within.
    controller.onHear(object, who.id(), snd_type.weapon, MockVector.create(41, 0, 0), 1);

    expect(state.dangerTime).toBeNull();
    expect(canObjectSelectAsEnemy).not.toHaveBeenCalled();

    // Just within range the sound source is evaluated as usual.
    controller.onHear(object, who.id(), snd_type.weapon, MockVector.create(40, 0, 0), 1);

    expect(state.dangerTime).toBe(NOW);
    expect(canObjectSelectAsEnemy).toHaveBeenCalledTimes(1);
  });

  it("should ignore sounds when object is wounded", () => {
    const { controller, object, state } = createController();
    const who: GameObject = registerEnemySource(object);

    setSchemeState(
      registry.objects.get(object.id()),
      EScheme.WOUNDED,
      mockSchemeState<ISchemeWoundedState>(EScheme.WOUNDED, {
        woundController: { woundState: "true" } as WoundController,
      })
    );

    controller.onHear(object, who.id(), snd_type.weapon_bullet_hit, MockVector.create(1, 0, 0), 1);

    // `isObjectFacingDanger` refuses danger for wounded objects, but `dangerTime` grants it through
    // the inertia branch of `EvaluatorDanger` regardless, so it must not be set here.
    expect(state.dangerTime).toBeNull();
    expect(canObjectSelectAsEnemy).not.toHaveBeenCalled();
  });

  it("should ignore bullet hits from non enemies", () => {
    const { controller, object, state } = createController();
    const who: GameObject = MockGameObject.mockStalker();

    registerObject(who);
    jest.spyOn(object, "relation").mockImplementation(() => EGameObjectRelation.FRIEND);

    controller.onHear(object, who.id(), snd_type.weapon_bullet_hit, MockVector.create(0, 0, 0), 1);

    expect(state.dangerTime).toBeNull();
  });

  it("should enter danger on nearby enemy weapon sound", () => {
    const { controller, object, state } = createController();
    const who: GameObject = registerEnemySource(object);

    controller.onHear(object, who.id(), snd_type.weapon, MockVector.create(1, 0, 0), 1);

    expect(state.dangerTime).toBe(NOW);
    expect(object.set_dest_level_vertex_id).toHaveBeenCalledWith(who.level_vertex_id());
  });

  it("should assist allies shooting at a mutual enemy", () => {
    const { controller, object, state } = createController();
    const who: GameObject = MockGameObject.mockStalker();
    const shootingAt: GameObject = MockGameObject.mockStalker();

    registerObject(who);
    jest.spyOn(who, "best_enemy").mockImplementation(() => shootingAt);
    jest
      .spyOn(object, "relation")
      .mockImplementation((target) => (target === shootingAt ? EGameObjectRelation.ENEMY : EGameObjectRelation.FRIEND));

    controller.onHear(object, who.id(), snd_type.weapon, MockVector.create(1, 0, 0), 1);

    expect(state.dangerTime).toBe(NOW);
  });

  it("should ignore distant weapon sounds", () => {
    const { controller, object, state } = createController();
    const who: GameObject = registerEnemySource(object);

    controller.onHear(object, who.id(), snd_type.weapon, MockVector.create(1000, 1000, 1000), 1);

    expect(state.dangerTime).toBeNull();
  });

  it("should ignore unrelated sound types before evaluating the sound source", () => {
    const { controller, object, state } = createController();
    const who: GameObject = registerEnemySource(object);

    controller.onHear(object, who.id(), snd_type.monster, MockVector.create(0, 0, 0), 1);

    expect(state.dangerTime).toBeNull();
    // Sound type is filtered out first, so no enemy evaluation happens at all.
    expect(canObjectSelectAsEnemy).not.toHaveBeenCalled();
    expect(object.best_enemy).not.toHaveBeenCalled();
  });

  it("should ignore sounds produced by non-creature objects", () => {
    const { controller, object, state } = createController();
    const artefact: GameObject = MockGameObject.mockWithClassId(clsid.artefact);

    registerObject(artefact);
    jest.spyOn(object, "relation").mockImplementation(() => EGameObjectRelation.ENEMY);

    controller.onHear(object, artefact.id(), snd_type.weapon_bullet_hit, MockVector.create(1, 0, 0), 1);

    expect(state.dangerTime).toBeNull();
    /**
     * Artefacts have no relations, evaluating them as enemies makes the engine log
     * `cannot apply GetRelationType method for non-alive object`.
     */
    expect(canObjectSelectAsEnemy).not.toHaveBeenCalled();
    expect(object.relation).not.toHaveBeenCalled();
    expect(object.set_dest_level_vertex_id).not.toHaveBeenCalled();
  });

  it("should ignore weapon sounds produced by physics objects", () => {
    const { controller, object, state } = createController();
    const physicObject: GameObject = MockGameObject.mockWithClassId(clsid.obj_phys_destroyable);

    registerObject(physicObject);

    controller.onHear(object, physicObject.id(), snd_type.weapon, MockVector.create(1, 0, 0), 1);

    expect(state.dangerTime).toBeNull();
    expect(canObjectSelectAsEnemy).not.toHaveBeenCalled();
  });
});
