import { level } from "xray16";
import { GameObject, ServerCreatureObject, Vector } from "xray16/alias";
import {
  abort,
  assertDefined,
  createEmptyVector,
  createVector,
  LuaArray,
  Nillable,
  TCount,
  TDistance,
  TIndex,
  TNumberId,
  TRate,
  vectorCross,
  vectorRotateY,
  yawDegree,
  Z_VECTOR,
} from "xray16/lib";
import { $filename, $fromObject, $isNil, $isNotNil } from "xray16/macros";

import { EPatrolFormation } from "@/engine/core/ai/patrol";
import { EStalkerState } from "@/engine/core/animation/types";
import { registry } from "@/engine/core/database/registry";
import { type Squad } from "@/engine/core/objects/squad";
import { type IReachTaskFormationSlot } from "@/engine/core/schemes/stalker/reach_task/reach_task_types";
import { reachTaskConfig } from "@/engine/core/schemes/stalker/reach_task/ReachTaskConfig";
import { LuaLogger } from "@/engine/core/utils/logging";
import { getObjectSquad } from "@/engine/core/utils/squad";

const logger: LuaLogger = new LuaLogger($filename);

/**
 * Mapping of a movement state to its accelerated counterpart used when patrol members fall behind.
 */
const accelerationByCurrentType: LuaTable<EStalkerState, EStalkerState> = $fromObject<EStalkerState, EStalkerState>({
  [EStalkerState.WALK]: EStalkerState.RUN,
  [EStalkerState.PATROL]: EStalkerState.RUSH,
  [EStalkerState.RAID]: EStalkerState.ASSAULT,
  [EStalkerState.SNEAK]: EStalkerState.SNEAK_RUN,
  [EStalkerState.SNEAK_RUN]: EStalkerState.ASSAULT,
} as Record<EStalkerState, EStalkerState>);

/**
 * Controller coordinating squad members moving together as a patrol towards a reach task target.
 * Tracks formation, commander and per-object positions/orders.
 */
export class ReachTaskPatrolController {
  public objectsList: LuaTable<
    TNumberId,
    { soldier: number; dir: Vector; dist: TDistance; vertex_id?: TNumberId; accepted?: boolean }
  > = new LuaTable();

  public targetId: TNumberId;
  public currentState: EStalkerState = EStalkerState.PATROL;
  public commanderId: TNumberId = -1;
  public formation: EPatrolFormation = EPatrolFormation.BACK;
  public commanderLid: number = -1;
  public commanderDir: Vector = Z_VECTOR;
  public objectsCount: TCount = 0;

  public constructor(targetId: TNumberId) {
    this.targetId = targetId;
  }

  /**
   * Register an object as a member of the patrol and recalculate formation positions.
   *
   * @param object - Game object to add to the patrol.
   */
  public addObjectToPatrol(object: GameObject): void {
    if (!object.alive() || this.objectsList.has(object.id())) {
      return;
    }

    this.objectsList.set(object.id(), {
      soldier: object.id(),
      dir: createVector(1, 0, 0),
      dist: 0,
    });
    this.objectsCount = this.objectsCount + 1;

    if (object.id() === getObjectSquad(object)!.commander_id()) {
      this.commanderId = object.id();
    }

    this.resetPositions();
  }

  /**
   * Remove an object from the patrol and reset positions if it was the commander.
   *
   * @param object - Game object to remove from the patrol.
   */
  public removeObjectFromPatrol(object: GameObject): void {
    logger.info("Remove object from patrol: %s %s", object.name(), this.targetId);

    if ($isNil(this.objectsList.get(object.id()))) {
      return;
    }

    this.objectsList.delete(object.id());
    this.objectsCount = this.objectsCount - 1;

    if (object.id() === this.commanderId) {
      this.commanderId = -1;
      this.resetPositions();
    }
  }

  /**
   * Recalculate each non-commander member direction and distance from the current formation template.
   */
  public resetPositions(): void {
    const formation: Nillable<LuaArray<IReachTaskFormationSlot>> = reachTaskConfig.FORMATIONS.get(this.formation);

    let index: TIndex = 1;

    for (const [key, data] of this.objectsList) {
      const serverObject: Nillable<ServerCreatureObject> = registry.simulator.object(data.soldier)!;
      const squad: Nillable<Squad> = serverObject && getObjectSquad(serverObject);

      if (!squad) {
        return;
      }

      if (this.commanderId === -1) {
        this.commanderId = squad.commander_id();
      }

      if (this.commanderId !== this.objectsList.get(key).soldier) {
        assertDefined(formation, "Missing reach task formation template.");

        const slot: IReachTaskFormationSlot = formation.get(index);
        const it = this.objectsList.get(key);

        it.dir = slot.dir;
        it.dist = slot.dist;
        it.vertex_id = -1;
        it.accepted = true;

        index = index + 1;
      }
    }
  }

  /**
   * Set the patrol formation, validating the provided value, and recalculate positions.
   *
   * @param formation - Patrol formation to apply.
   */
  public setFormation(formation: EPatrolFormation): void {
    if ($isNil(formation)) {
      abort("Invalid formation (nil) for PatrolController[%s]", this.targetId);
    }

    if (formation !== "around" && formation !== "back" && formation !== "line") {
      abort("Invalid formation (%s) for PatrolController[%s]", formation, this.targetId);
    }

    this.formation = formation;
    this.resetPositions();
  }

  /**
   * Resolve the patrol commander game object for the provided member.
   *
   * @param object - Patrol member requesting its commander.
   * @returns Game object that is the commander of the patrol.
   */
  public getCommander(object: GameObject): GameObject {
    if ($isNil(object)) {
      abort("Invalid NPC on call PatrolController:get_npc_command in PatrolController[%s]", this.targetId);
    }

    if ($isNil(this.objectsList.get(object.id()))) {
      abort("NPC with name %s can't present in PatrolController[%s]", object.name(), this.targetId);
    }

    if (object.id() === this.commanderId) {
      abort("Patrol commander called function PatrolController:get_npc_command in PatrolController[%s]", this.targetId);
    }

    const commander: Nillable<number> = this.objectsList.get(this.commanderId).soldier;

    if ($isNil(commander)) {
      abort("Patrol commander not present in PatrolController[%s]", this.targetId);
    }

    return level.object_by_id(commander)!;
  }

  /**
   * Compute movement orders for a patrol member relative to the commander position and formation.
   *
   * @param object - Patrol member to compute orders for.
   * @returns Target level vertex id, desired direction and movement state to apply.
   */
  public getObjectOrders(object: GameObject): LuaMultiReturn<[TNumberId, Vector, Nillable<EStalkerState>]> {
    if ($isNil(object)) {
      abort("Invalid NPC on call PatrolController:get_npc_command in PatrolController[%s]", this.targetId);
    }

    const objectId: TNumberId = object.id();

    if ($isNil(this.objectsList.get(this.commanderId))) {
      return $multi(object.level_vertex_id(), object.direction(), this.currentState);
    } else if ($isNil(this.objectsList.get(object.id()))) {
      abort("NPC with name %s can't present in PatrolController[%s]", object.name(), this.targetId);
    } else if (object.id() === this.commanderId) {
      abort("Patrol commander called function PatrolController:get_npc_command in PatrolController[%s]", this.targetId);
    }

    const commander: Nillable<GameObject> = level.object_by_id(this.objectsList.get(this.commanderId).soldier);

    assertDefined(commander, "Commander is nil!");

    const direction: Vector = commander.direction();
    const position: Vector = createEmptyVector();
    let vertexId: TNumberId = commander.location_on_path(5, position);

    if (
      level
        .vertex_position(vertexId)
        .distance_to(level.object_by_id(this.objectsList.get(objectId).soldier)!.position()) > 5
    ) {
      vertexId = commander.level_vertex_id();
    }

    direction.y = 0;
    direction.normalize();

    let dirS: Vector = this.objectsList.get(objectId).dir;
    const distS: TDistance = this.objectsList.get(objectId).dist;
    const vvv: Vector = vectorCross(dirS, createVector(0, 0, 1));
    let angle: TRate = yawDegree(dirS, createVector(0, 0, 1));

    if (vvv.y < 0) {
      angle = -angle;
    }

    dirS = vectorRotateY(direction, angle);

    const d = 2;
    const vertex = level.vertex_in_direction(level.vertex_in_direction(vertexId, dirS, distS), direction, d);

    this.objectsList.get(objectId).vertex_id = vertex;

    const distance: TDistance = commander
      .position()
      .distance_to(level.object_by_id(this.objectsList.get(objectId).soldier)!.position());

    if (distance > distS + 2) {
      const nextState: EStalkerState = accelerationByCurrentType.get(this.currentState);

      if ($isNotNil(nextState)) {
        return $multi(vertex, direction, nextState);
      }
    }

    return $multi(vertex, direction, this.currentState);
  }

  /**
   * Apply the commander current movement state and formation to the patrol shared orders.
   *
   * @param object - Game object issuing the orders, must be the patrol commander.
   * @param command - Movement state to broadcast to the patrol.
   * @param formation - Patrol formation to apply.
   */
  public setObjectOrders(object: GameObject, command: EStalkerState, formation: EPatrolFormation): void {
    if ($isNil(object) || !object.alive()) {
      abort("NPC commander possible dead in PatrolController[%s]", this.targetId);
    }

    if (object.id() !== this.commanderId) {
      return;
    }

    this.currentState = command;

    if (this.formation !== formation) {
      this.formation = formation;
      this.setFormation(formation);
    }

    this.commanderLid = object.level_vertex_id();
    this.commanderDir = object.direction();
  }

  /**
   * Check whether the provided object id is the patrol commander.
   *
   * @param objectId - Identifier of the object to check.
   * @returns Whether the object is the patrol commander.
   */
  public isCommander(objectId: TNumberId): boolean {
    return objectId === this.commanderId;
  }
}
