import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { level } from "xray16";
import { GameObject } from "xray16/alias";
import { AnyObject, Z_VECTOR } from "xray16/lib";
import { MockGameObject, MockVector } from "xray16/mocks";
import { replaceFunctionMock, resetFunctionMock } from "xray16/testing/utils";

import { EPatrolFormation } from "@/engine/core/ai/patrol";
import { EStalkerState } from "@/engine/core/animation/types";
import { registry } from "@/engine/core/database";
import { Squad } from "@/engine/core/objects/squad";
import { reachTaskConfig } from "@/engine/core/schemes/stalker/reach_task/ReachTaskConfig";
import { ReachTaskPatrolController } from "@/engine/core/schemes/stalker/reach_task/ReachTaskPatrolController";
import { getObjectSquad } from "@/engine/core/utils/squad";
import { resetRegistry } from "@/fixtures/engine";

jest.mock("@/engine/core/utils/squad", () => ({ getObjectSquad: jest.fn(() => null) }));

/**
 * Report a squad with the given commander for every object passed to `getObjectSquad`.
 */
function withSquadCommander(commanderId: number): void {
  const squad: AnyObject = { commander_id: () => commanderId };

  replaceFunctionMock(getObjectSquad, () => squad as unknown as Squad);
}

/**
 * Register objects as server-side stand-ins resolvable through the simulator and `level.object_by_id`.
 */
function registerPatrolObjects(objects: Array<GameObject>): void {
  const byId: Record<number, GameObject> = {};

  objects.forEach((it) => (byId[it.id()] = it));

  registry.simulator = {
    object: jest.fn((id: number) => byId[id] ?? null),
  } as unknown as AnyObject as typeof registry.simulator;

  replaceFunctionMock(level.object_by_id, (id: number) => byId[id] ?? null);
}

describe("ReachTaskPatrolController", () => {
  beforeEach(() => {
    resetRegistry();
    resetFunctionMock(getObjectSquad);
    resetFunctionMock(level.object_by_id);
    resetFunctionMock(level.vertex_in_direction);
    resetFunctionMock(level.vertex_position);
    replaceFunctionMock(getObjectSquad, () => null);
  });

  it("should correctly initialize", () => {
    const controller: ReachTaskPatrolController = new ReachTaskPatrolController(400);

    expect(controller.targetId).toBe(400);
    expect(controller.currentState).toBe(EStalkerState.PATROL);
    expect(controller.commanderId).toBe(-1);
    expect(controller.formation).toBe(EPatrolFormation.BACK);
    expect(controller.commanderLid).toBe(-1);
    expect(controller.commanderDir).toBe(Z_VECTOR);
    expect(controller.objectsCount).toBe(0);
    expect(controller.objectsList).toEqualLuaTables({});
  });

  it("should not add dead or duplicated objects", () => {
    const controller: ReachTaskPatrolController = new ReachTaskPatrolController(400);
    const dead: GameObject = MockGameObject.mock();
    const object: GameObject = MockGameObject.mock();

    jest.spyOn(dead, "alive").mockImplementation(() => false);
    withSquadCommander(object.id());
    registerPatrolObjects([object]);

    controller.addObjectToPatrol(dead);
    expect(controller.objectsCount).toBe(0);

    controller.addObjectToPatrol(object);
    expect(controller.objectsCount).toBe(1);

    controller.addObjectToPatrol(object);
    expect(controller.objectsCount).toBe(1);
  });

  it("should mark added squad commander", () => {
    const controller: ReachTaskPatrolController = new ReachTaskPatrolController(400);
    const commander: GameObject = MockGameObject.mock();

    withSquadCommander(commander.id());
    registerPatrolObjects([commander]);

    controller.addObjectToPatrol(commander);

    expect(controller.commanderId).toBe(commander.id());
    expect(controller.isCommander(commander.id())).toBe(true);
    expect(controller.isCommander(commander.id() + 1)).toBe(false);
  });

  it("should assign formation slots to non commander members", () => {
    const controller: ReachTaskPatrolController = new ReachTaskPatrolController(400);
    const commander: GameObject = MockGameObject.mock();
    const member: GameObject = MockGameObject.mock();

    withSquadCommander(commander.id());
    registerPatrolObjects([commander, member]);

    controller.addObjectToPatrol(commander);
    controller.addObjectToPatrol(member);

    const slot = controller.objectsList.get(member.id());

    expect(slot.dir).toEqual(MockVector.create(0.7, 0, -0.5));
    expect(slot.dist).toBe(1.2);
    expect(slot.vertex_id).toBe(-1);
    expect(slot.accepted).toBe(true);
  });

  it("should stop resetting positions for members without squad", () => {
    const controller: ReachTaskPatrolController = new ReachTaskPatrolController(400);
    const commander: GameObject = MockGameObject.mock();

    withSquadCommander(commander.id());
    registerPatrolObjects([commander]);
    controller.addObjectToPatrol(commander);

    replaceFunctionMock(getObjectSquad, () => null);

    expect(() => controller.resetPositions()).not.toThrow();
  });

  it("should accommodate a commander and all sixteen configured followers", () => {
    const controller = new ReachTaskPatrolController(400);
    const commander = MockGameObject.mock();
    const members = Array.from({ length: 16 }, () => MockGameObject.mock());

    withSquadCommander(commander.id());
    registerPatrolObjects([commander, ...members]);

    controller.addObjectToPatrol(commander);
    members.forEach((member) => controller.addObjectToPatrol(member));

    expect(controller.objectsCount).toBe(17);

    members.forEach((member, index) => {
      const slot = controller.objectsList.get(member.id());

      expect(slot.dir).toBe(reachTaskConfig.FORMATIONS.get(EPatrolFormation.BACK)!.get(index + 1).dir);
      expect(slot.dist).toBe(reachTaskConfig.FORMATIONS.get(EPatrolFormation.BACK)!.get(index + 1).dist);
    });
  });

  it("should remove objects from patrol", () => {
    const controller: ReachTaskPatrolController = new ReachTaskPatrolController(400);
    const commander: GameObject = MockGameObject.mock();
    const member: GameObject = MockGameObject.mock();

    withSquadCommander(commander.id());
    registerPatrolObjects([commander, member]);

    controller.addObjectToPatrol(commander);
    controller.addObjectToPatrol(member);

    controller.removeObjectFromPatrol(member);
    expect(controller.objectsCount).toBe(1);
    expect(controller.objectsList.has(member.id())).toBe(false);

    // Removing an unknown object is a no-op.
    controller.removeObjectFromPatrol(member);
    expect(controller.objectsCount).toBe(1);
  });

  it("should reset commander when it leaves the patrol", () => {
    const controller: ReachTaskPatrolController = new ReachTaskPatrolController(400);
    const commander: GameObject = MockGameObject.mock();

    withSquadCommander(commander.id());
    registerPatrolObjects([commander]);

    controller.addObjectToPatrol(commander);
    controller.removeObjectFromPatrol(commander);

    expect(controller.objectsCount).toBe(0);
    expect(controller.commanderId).toBe(-1);
  });

  it("should validate formation on change", () => {
    const controller: ReachTaskPatrolController = new ReachTaskPatrolController(400);

    expect(() => controller.setFormation(null as never)).toThrow("Invalid formation (nil) for PatrolController[400]");
    expect(() => controller.setFormation("diamond" as never)).toThrow(
      "Invalid formation (diamond) for PatrolController"
    );

    controller.setFormation(EPatrolFormation.LINE);

    expect(controller.formation).toBe(EPatrolFormation.LINE);
  });

  it("should validate arguments when resolving commander", () => {
    const controller: ReachTaskPatrolController = new ReachTaskPatrolController(400);
    const commander: GameObject = MockGameObject.mock();
    const member: GameObject = MockGameObject.mock();

    expect(() => controller.getCommander(null as never)).toThrow("Invalid NPC on call");
    expect(() => controller.getCommander(member)).toThrow("can't present in PatrolController[400]");

    withSquadCommander(commander.id());
    registerPatrolObjects([commander, member]);
    controller.addObjectToPatrol(commander);
    controller.addObjectToPatrol(member);

    expect(() => controller.getCommander(commander)).toThrow("Patrol commander called function");
    expect(controller.getCommander(member)).toBe(commander);
  });

  it("should validate arguments when resolving orders", () => {
    const controller: ReachTaskPatrolController = new ReachTaskPatrolController(400);
    const commander: GameObject = MockGameObject.mock();
    const member: GameObject = MockGameObject.mock();
    const stranger: GameObject = MockGameObject.mock();

    expect(() => controller.getObjectOrders(null as never)).toThrow("Invalid NPC on call");

    withSquadCommander(commander.id());
    registerPatrolObjects([commander, member]);
    controller.addObjectToPatrol(commander);
    controller.addObjectToPatrol(member);

    expect(() => controller.getObjectOrders(stranger)).toThrow("can't present in PatrolController[400]");
    expect(() => controller.getObjectOrders(commander)).toThrow("Patrol commander called function");
  });

  it("should return own position as orders without a known commander", () => {
    const controller: ReachTaskPatrolController = new ReachTaskPatrolController(400);
    const member: GameObject = MockGameObject.mock();

    const [vertexId, direction, state] = controller.getObjectOrders(member);

    expect(vertexId).toBe(member.level_vertex_id());
    expect(direction).toBe(member.direction());
    expect(state).toBe(EStalkerState.PATROL);
  });

  it("should compute formation orders relative to the commander", () => {
    const controller: ReachTaskPatrolController = new ReachTaskPatrolController(400);
    const commander: GameObject = MockGameObject.mock({ position: MockVector.create(0, 0, 0) });
    const member: GameObject = MockGameObject.mock({ position: MockVector.create(1, 0, 0) });

    withSquadCommander(commander.id());
    registerPatrolObjects([commander, member]);
    controller.addObjectToPatrol(commander);
    controller.addObjectToPatrol(member);

    replaceFunctionMock(level.vertex_in_direction, () => 900);
    replaceFunctionMock(level.vertex_position, () => MockVector.create(0, 0, 0));

    const [vertexId, , state] = controller.getObjectOrders(member);

    expect(vertexId).toBe(900);
    expect(controller.objectsList.get(member.id()).vertex_id).toBe(900);
    expect(state).toBe(EStalkerState.PATROL);
  });

  it("should accelerate members that fall behind the commander", () => {
    const controller: ReachTaskPatrolController = new ReachTaskPatrolController(400);
    const commander: GameObject = MockGameObject.mock({ position: MockVector.create(0, 0, 0) });
    const member: GameObject = MockGameObject.mock({ position: MockVector.create(100, 0, 0) });

    withSquadCommander(commander.id());
    registerPatrolObjects([commander, member]);
    controller.addObjectToPatrol(commander);
    controller.addObjectToPatrol(member);

    replaceFunctionMock(level.vertex_in_direction, () => 900);
    replaceFunctionMock(level.vertex_position, () => MockVector.create(0, 0, 0));

    controller.currentState = EStalkerState.WALK;

    const [, , state] = controller.getObjectOrders(member);

    expect(state).toBe(EStalkerState.RUN);
  });

  it("should keep current state for falling behind members without acceleration mapping", () => {
    const controller: ReachTaskPatrolController = new ReachTaskPatrolController(400);
    const commander: GameObject = MockGameObject.mock({ position: MockVector.create(0, 0, 0) });
    const member: GameObject = MockGameObject.mock({ position: MockVector.create(100, 0, 0) });

    withSquadCommander(commander.id());
    registerPatrolObjects([commander, member]);
    controller.addObjectToPatrol(commander);
    controller.addObjectToPatrol(member);

    replaceFunctionMock(level.vertex_in_direction, () => 900);
    replaceFunctionMock(level.vertex_position, () => MockVector.create(0, 0, 0));

    controller.currentState = EStalkerState.THREAT;

    const [, , state] = controller.getObjectOrders(member);

    expect(state).toBe(EStalkerState.THREAT);
  });

  it("should apply commander orders only", () => {
    const controller: ReachTaskPatrolController = new ReachTaskPatrolController(400);
    const commander: GameObject = MockGameObject.mock();
    const member: GameObject = MockGameObject.mock();

    withSquadCommander(commander.id());
    registerPatrolObjects([commander, member]);
    controller.addObjectToPatrol(commander);
    controller.addObjectToPatrol(member);

    controller.setObjectOrders(member, EStalkerState.RUSH, EPatrolFormation.BACK);
    expect(controller.currentState).toBe(EStalkerState.PATROL);

    controller.setObjectOrders(commander, EStalkerState.RUSH, EPatrolFormation.BACK);

    expect(controller.currentState).toBe(EStalkerState.RUSH);
    expect(controller.formation).toBe(EPatrolFormation.BACK);
    expect(controller.commanderLid).toBe(commander.level_vertex_id());
    expect(controller.commanderDir).toBe(commander.direction());
  });

  it("should fail switching to a formation without a configured template", () => {
    const controller: ReachTaskPatrolController = new ReachTaskPatrolController(400);
    const commander: GameObject = MockGameObject.mock();
    const member: GameObject = MockGameObject.mock();

    withSquadCommander(commander.id());
    registerPatrolObjects([commander, member]);
    controller.addObjectToPatrol(commander);
    controller.addObjectToPatrol(member);

    // Only the `back` formation has a template in `reachTaskConfig.FORMATIONS`.
    expect(() => controller.setFormation(EPatrolFormation.LINE)).toThrow();
    expect(() => controller.setFormation(EPatrolFormation.AROUND)).toThrow();
  });

  it("should fail applying orders from a dead commander", () => {
    const controller: ReachTaskPatrolController = new ReachTaskPatrolController(400);
    const commander: GameObject = MockGameObject.mock();

    jest.spyOn(commander, "alive").mockImplementation(() => false);

    expect(() => controller.setObjectOrders(commander, EStalkerState.RUSH, EPatrolFormation.BACK)).toThrow(
      "NPC commander possible dead in PatrolController[400]"
    );
  });
});
