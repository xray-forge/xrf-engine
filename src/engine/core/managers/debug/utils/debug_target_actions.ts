import { level } from "xray16";
import { GameObject, ServerObject, Vector } from "xray16/alias";
import {
  copyVector,
  MAX_LEVEL_VERTEX_ID,
  Nillable,
  restoreObjectCondition,
  TDistance,
  TLabel,
  TNumberId,
} from "xray16/lib";
import { $isNil } from "xray16/macros";

import { getGameObjectById, registry } from "@/engine/core/database";
import { debugConfig } from "@/engine/core/managers/debug/DebugConfig";
import { describeDebugObject } from "@/engine/core/managers/debug/utils/debug_inspect";
import { releaseSimulationSquad } from "@/engine/core/managers/simulation/utils";
import type { Squad } from "@/engine/core/objects/squad";
import { isCreature, isSquad, isStalker } from "@/engine/core/utils/class_ids";
import {
  logObjectInventoryItems,
  logObjectPlannerState,
  logObjectRelations,
  logObjectState,
  logObjectStateController,
} from "@/engine/core/utils/debug/debug_log";
import { setObjectWounded } from "@/engine/core/utils/object";
import { isOnLoadedLevel, teleportActorNearPosition, teleportObjectToVertex } from "@/engine/core/utils/position";
import { ERelation, setGameObjectRelation } from "@/engine/core/utils/relation";
import { releaseObject } from "@/engine/core/utils/spawn";

/**
 * Target action that needs the object online and alive, as most of them do.
 */
type TLiveTargetAction = (object: GameObject) => TLabel;

/**
 * Report of a target state the debugger can write to the log.
 */
export enum EDebugTargetReport {
  STATE = "state",
  PLANNER = "planner",
  INVENTORY = "inventory",
  RELATIONS = "relations",
  STATE_CONTROLLER = "state controller",
}

const targetReporters: Record<EDebugTargetReport, (object: GameObject) => void> = {
  [EDebugTargetReport.STATE]: logObjectState,
  [EDebugTargetReport.PLANNER]: logObjectPlannerState,
  [EDebugTargetReport.INVENTORY]: logObjectInventoryItems,
  [EDebugTargetReport.RELATIONS]: logObjectRelations,
  [EDebugTargetReport.STATE_CONTROLLER]: logObjectStateController,
};

/**
 * Run an action on a target that has to be an online, live creature.
 *
 * @param id - Target object id.
 * @param action - Action to run on the online creature.
 * @returns The action's result message, or why it could not run.
 */
function runOnCreature(id: TNumberId, action: TLiveTargetAction): TLabel {
  const object: Nillable<GameObject> = getGameObjectById(id);

  if ($isNil(object)) {
    return `${describeDebugObject(id)} is offline`;
  } else if (!isCreature(object)) {
    return `${describeDebugObject(id)} is not a creature`;
  } else if (!object.alive()) {
    return `${object.name()} is dead`;
  }

  return action(object);
}

/**
 * @param id - Target object id.
 * @returns Result message.
 */
export function killDebugTarget(id: TNumberId): TLabel {
  return runOnCreature(id, (object) => {
    object.kill(object);

    return `killed ${object.name()}`;
  });
}

/**
 * @param id - Target object id.
 * @returns Result message.
 */
export function woundDebugTarget(id: TNumberId): TLabel {
  return runOnCreature(id, (object) => {
    setObjectWounded(object);

    return `wounded ${object.name()}`;
  });
}

/**
 * @param id - Target object id.
 * @returns Result message.
 */
export function healDebugTarget(id: TNumberId): TLabel {
  return runOnCreature(id, (object) => {
    restoreObjectCondition(object);

    return `healed ${object.name()}`;
  });
}

/**
 * @param id - Target object id.
 * @param relation - Relation of the target towards the actor.
 * @returns Result message.
 */
export function setDebugTargetRelation(id: TNumberId, relation: ERelation): TLabel {
  return runOnCreature(id, (object) => {
    setGameObjectRelation(object, registry.actor, relation);

    return `${object.name()} is now ${relation} to the actor`;
  });
}

/**
 * @param id - Target object id.
 * @param report - Report to write.
 * @returns Result message.
 */
export function logDebugTargetReport(id: TNumberId, report: EDebugTargetReport): TLabel {
  const object: Nillable<GameObject> = getGameObjectById(id);

  if ($isNil(object)) {
    return `${describeDebugObject(id)} is offline`;
  }

  targetReporters[report](object);

  return `logged the ${report} of ${object.name()}`;
}

/**
 * Teleport the actor next to the target, when it is on the loaded level.
 *
 * @param id - Target object id.
 * @returns Result message.
 */
export function teleportActorToDebugTarget(id: TNumberId): TLabel {
  const object: Nillable<GameObject> = getGameObjectById(id);
  const serverObject: Nillable<ServerObject> = registry.simulator.object(id);

  if ($isNil(serverObject)) {
    return `${describeDebugObject(id)} does not exist`;
  } else if ($isNil(object) && !isOnLoadedLevel(serverObject)) {
    return `${serverObject.name()} is on another level`;
  }

  teleportActorNearPosition($isNil(object) ? serverObject.position : object.position());

  return `teleported to ${serverObject.name()}`;
}

/**
 * Bring the target in front of the actor.
 *
 * @param id - Target object id.
 * @returns Result message.
 */
export function pullDebugTargetToActor(id: TNumberId): TLabel {
  const serverObject: Nillable<ServerObject> = registry.simulator.object(id);
  const actor: GameObject = registry.actor;
  const position: Vector = copyVector(actor.position()).add(copyVector(actor.direction()).set_length(2));
  const vertexId: TNumberId = level.vertex_id(position);

  if ($isNil(serverObject)) {
    return `${describeDebugObject(id)} does not exist`;
  } else if (vertexId >= MAX_LEVEL_VERTEX_ID) {
    return "no AI graph in front of the actor";
  }

  return teleportObjectToVertex(id, vertexId, actor.game_vertex_id())
    ? `pulled ${serverObject.name()} to the actor`
    : `${serverObject.name()} is online and not a creature`;
}

/**
 * @param id - Target object id.
 * @returns Why the actor cannot trade with or talk to the target, `null` when it can: the target has to be a live
 *   stalker within reach, as the engine closes the window on a partner farther away.
 */
export function getDebugInteractionBlocker(id: TNumberId): Nillable<TLabel> {
  const object: Nillable<GameObject> = getGameObjectById(id);

  if ($isNil(object) || !isStalker(object) || !object.alive()) {
    return `${describeDebugObject(id)} is not a live stalker online`;
  }

  const distance: TDistance = object.position().distance_to(registry.actor.position());

  return distance > debugConfig.INTERACTION_DISTANCE_LIMIT
    ? `${object.name()} is ${string.format("%.0f", distance)} m away: pull it to the actor or teleport to it first`
    : null;
}

/**
 * Open trading with the target, as a trader's dialog does.
 *
 * @param id - Target object id, a stalker within reach.
 * @returns Result message.
 */
export function tradeWithDebugTarget(id: TNumberId): TLabel {
  const object: GameObject = getGameObjectById(id) as GameObject;

  object.start_trade(registry.actor);

  return `trading with ${object.name()}`;
}

/**
 * Start a dialog with the target.
 *
 * @param id - Target object id, a stalker within reach.
 * @returns Result message.
 */
export function talkToDebugTarget(id: TNumberId): TLabel {
  const object: GameObject = getGameObjectById(id) as GameObject;

  registry.actor.run_talk_dialog(object, false);

  return `talking to ${object.name()}`;
}

/**
 * Release the target from the simulation. A squad goes through the simulation's own release, which also releases its
 * members and leaves its terrain.
 *
 * @param id - Target object id.
 * @returns Result message.
 */
export function releaseDebugTarget(id: TNumberId): TLabel {
  const label: TLabel = describeDebugObject(id);
  const serverObject: Nillable<ServerObject> = registry.simulator.object(id);

  if ($isNil(serverObject)) {
    return `${label} does not exist`;
  } else if (id === registry.actor.id()) {
    return "the actor cannot be released";
  }

  if (isSquad(serverObject)) {
    releaseSimulationSquad(serverObject as Squad);
  } else {
    releaseObject(id);
  }

  return `released ${label}`;
}
