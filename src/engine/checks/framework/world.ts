import { game, level, time_global } from "xray16";
import { GameObject, ServerObject, Vector } from "xray16/alias";
import {
  ACTOR_ID,
  copyVector,
  isObjectInZone,
  MAX_LEVEL_VERTEX_ID,
  MAX_U16,
  Nillable,
  TCount,
  TDistance,
  TDuration,
  TIndex,
  TLabel,
  TName,
  TStringId,
  TTimestamp,
  vectorToString,
} from "xray16/lib";
import { $isNil, $isNotNil } from "xray16/macros";

import { report } from "@/engine/checks/framework/core";
import { expect, markLevelJump } from "@/engine/checks/framework/dsl";
import { infoPortions } from "@/engine/constants/info_portions";
import {
  getManager,
  getObjectByStoryId,
  getPortableStoreValue,
  getServerObjectByStoryId,
  registry,
  setPortableStoreValue,
} from "@/engine/core/database";
import { EGameEvent, EventsManager } from "@/engine/core/managers/events";
import { TaskManager } from "@/engine/core/managers/tasks";
import { taskConfig } from "@/engine/core/managers/tasks/TaskConfig";
import { TaskObject } from "@/engine/core/managers/tasks/TaskObject";
import { ETaskState } from "@/engine/core/managers/tasks/types";
import { giveInfoPortion } from "@/engine/core/utils/info_portion";
import {
  getActorPosition,
  getPositionLevelVertexId,
  isOnLoadedLevel,
  teleportActorNearPosition,
  teleportActorToPatrol,
  teleportActorToPosition,
  teleportActorToStoryObject,
} from "@/engine/core/utils/position";

/**
 * Force the next evaluation of a task to run instead of being throttled.
 *
 * Task state otherwise advances at most once per `UPDATE_CHECK_PERIOD`, which would make assertions
 * depend on real time.
 *
 * @param taskId - Task whose throttle should be cleared.
 */
function forceTaskEvaluation(taskId: TStringId): void {
  const task: Nillable<TaskObject> = taskConfig.ACTIVE_TASKS.get(taskId);

  if ($isNotNil(task)) {
    task.nextUpdateAt = 0;
  }
}

/**
 * Settle a task against the current portion state and hand back what it settled to.
 *
 * @param taskId - Task to settle.
 * @returns The settled task, or null when it is not in the log.
 */
export function settleTask(taskId: TStringId): Nillable<TaskObject> {
  forceTaskEvaluation(taskId);
  getManager(TaskManager).isTaskCompleted(taskId);

  return taskConfig.ACTIVE_TASKS.get(taskId);
}

/**
 * Settle a task against the current portion state and report the state it reached.
 *
 * @param taskId - Task to evaluate.
 * @returns Settled task state, or null when no condlist branch matched.
 */
export function evaluateTaskState(taskId: TStringId): Nillable<ETaskState> {
  return settleTask(taskId)?.state;
}

/**
 * Assert the text a task shows in the log resolved to something.
 *
 * @param task - Task as returned by {@link settleTask}.
 * @param taskId - Task id, for the failure detail.
 * @param when - What portion state the text is being checked under.
 */
export function expectTaskTextResolves(task: Nillable<TaskObject>, taskId: TStringId, when: TLabel): void {
  const absent: TLabel = `'${taskId}' is not in the log`;

  expect(
    $isNotNil(task?.currentTitle),
    `title resolves ${when}`,
    $isNil(task) ? absent : `'${taskId}' title condlist matched nothing`
  );
  expect(
    $isNotNil(task?.currentDescription),
    `description resolves ${when}`,
    $isNil(task) ? absent : `'${taskId}' description condlist matched nothing`
  );

  if ($isNotNil(task?.currentTitle) && task?.currentTitle === task?.currentDescription) {
    report(
      "'%s' description is the same string as its title ('%s'), which is what a '_name' key in a descr slot looks like",
      taskId,
      tostring(task?.currentTitle)
    );
  }
}

/**
 * Record the keys a task currently shows in the log.
 *
 * @param task - Task as returned by {@link settleTask}.
 */
export function reportTaskText(task: Nillable<TaskObject>): void {
  report("task shows '%s' / '%s'", tostring(task?.currentTitle), tostring(task?.currentDescription));
}

/**
 * Settle a task, check the text it shows and record which branches of its condlists won.
 *
 * @param taskId - Task to settle.
 * @param when - What portion state the text is being checked under.
 * @returns The settled task, or null when it is no longer in the log.
 */
export function checkTaskText(taskId: TStringId, when: TLabel): Nillable<TaskObject> {
  const task: Nillable<TaskObject> = settleTask(taskId);

  if ($isNil(task)) {
    report("'%s' is not in the log, so there is no text to check %s", taskId, when);

    return null;
  }

  expectTaskTextResolves(task, taskId, when);
  reportTaskText(task);

  return task;
}

/**
 * Record a teleport that did not happen, and hand back the refusal.
 *
 * @param destination - What was asked for, story id or restrictor name.
 * @param reason - Why the actor was left where it is.
 * @returns Always false, to be returned straight out of the caller.
 */
function reportTeleportRefused(destination: TName, reason: TLabel): boolean {
  report("teleport: '%s' refused, %s", destination, reason);

  return false;
}

/**
 * Record where a teleport actually put the actor, so a walk can be retraced from the log alone.
 *
 * @param destination - What was asked for, story id or restrictor name.
 * @param route - Which arrival route was taken, since they fail in different ways.
 * @param from - Where the actor stood before the move, as read by {@link getActorPosition}.
 * @returns Always true, to be returned straight out of the caller.
 */
function reportTeleportArrival(destination: TName, route: TLabel, from: Vector): boolean {
  const to: Vector = registry.actor.position();

  report(
    "teleport: '%s' by %s on '%s', %s -> %s, %.1f m",
    destination,
    route,
    level.name(),
    vectorToString(from),
    vectorToString(to),
    from.distance_to(to)
  );

  return true;
}

/**
 * Move the actor into a space restrictor, when the level has one registered under that name.
 *
 * @param zoneName - Restrictor name, spelled as the logic spells it.
 * @returns Whether the actor was moved.
 */
export function teleportToZone(zoneName: TName): boolean {
  const zone: Nillable<GameObject> = registry.zones.get(zoneName);

  if ($isNil(zone)) {
    return reportTeleportRefused(zoneName, "no restrictor is registered under that name on the loaded level");
  }

  const from: Vector = getActorPosition();

  teleportActorToPosition(zone.position());

  return reportTeleportArrival(zoneName, "restrictor centre", from);
}

/**
 * Move the actor to just outside a space restrictor, facing it.
 *
 * @param zoneName - Restrictor name, spelled as the logic spells it.
 * @param standoff - Metres to stop short of the restrictor's centre.
 * @returns Whether the actor was moved.
 */
export function teleportNearZone(zoneName: TName, standoff: TDistance = 5): boolean {
  const zone: Nillable<GameObject> = registry.zones.get(zoneName);

  if ($isNil(zone)) {
    return reportTeleportRefused(zoneName, "no restrictor is registered under that name on the loaded level");
  }

  const from: Vector = getActorPosition();

  teleportActorNearPosition(zone.position(), null, standoff);
  reportTeleportArrival(zoneName, string.format("restrictor centre less %s m", standoff), from);

  if (isObjectInZone(registry.actor, zone)) {
    report(
      "teleport: '%s' still holds the actor at %s m, so its shape reaches further out than the standoff",
      zoneName,
      standoff
    );
  }

  return true;
}

/**
 * Move the actor into a space restrictor with no floor inside and keep it there for a while.
 *
 * A player climbing a ladder spends seconds inside such a restrictor, while a teleported actor falls out of it within
 * half a second. Logic far from the actor updates about once a second, so it can miss the fall.
 *
 * @param zoneName - Restrictor name, spelled as the logic spells it.
 * @param duration - How long to keep the actor at the restrictor's centre, in milliseconds.
 * @returns Whether the actor was moved.
 */
export function holdInZone(zoneName: TName, duration: TDuration = 2000): boolean {
  if (!teleportToZone(zoneName)) {
    return false;
  }

  const position: Vector = copyVector(registry.zones.get(zoneName).position());
  const releaseAt: TTimestamp = time_global() + duration;
  const eventsManager: EventsManager = getManager(EventsManager);

  function hold(): void {
    if (time_global() >= releaseAt) {
      eventsManager.unregisterCallback(EGameEvent.ACTOR_UPDATE, hold);
    } else {
      registry.actor.set_actor_position(position);
    }
  }

  eventsManager.registerCallback(EGameEvent.ACTOR_UPDATE, hold);
  report("teleport: holding the actor in '%s' for %s ms", zoneName, duration);

  return true;
}

/**
 * Let a jump to Jupiter arrive where it is aimed, skipping the first arrival scenes.
 *
 * A first arrival plays the Yanov welcome cutscene, which moves the actor into Yanov's no-weapon zone, and an arrival
 * without `jup_travel_made` blacks out and moves the actor to Jupiter's arrival point. The welcome never starts, so
 * `jup_b217_cutscene_control` never hands out Azot's instruments task either.
 */
export function skipJupiterArrival(): void {
  for (const infoPortion of [
    infoPortions.jup_first_meet_made,
    infoPortions.jup_travel_made,
    infoPortions.jup_b217_task_start,
    infoPortions.jup_b217_welcome_tech_talked,
    infoPortions.jup_b217_pp_end_in_scene,
    infoPortions.jup_b217_guide_welcome_end,
    infoPortions.jup_b217_welcome_guide_talked,
  ]) {
    giveInfoPortion(infoPortion);
  }
}

/**
 * Move the actor to a story object, loading another level when that is where the object is.
 *
 * @param storyId - Story id of the object to arrive at.
 * @param standoff - Metres in front of the object to stop, for an object on the loaded level's AI mesh.
 * @returns Whether the actor was moved.
 */
export function teleportToStoryObject(storyId: TStringId, standoff: TDistance = 5): boolean {
  const target: Nillable<ServerObject> = getServerObjectByStoryId(storyId);

  if ($isNil(target)) {
    return reportTeleportRefused(storyId, "nothing is registered under that story id");
  }

  const online: Nillable<GameObject> = getObjectByStoryId(storyId);

  report(
    "teleport: '%s' resolves to %s #%s at %s, gvid %s, lvid %s, %s",
    storyId,
    target.section_name(),
    target.id,
    vectorToString(target.position),
    target.m_game_vertex_id,
    target.m_level_vertex_id,
    $isNotNil(online) ? "online" : "offline"
  );

  // Being online is proof of the loaded level on its own, so it is asked before the vertices are trusted for it.
  if ($isNotNil(online) || isOnLoadedLevel(target)) {
    const from: Vector = getActorPosition();
    const position: Vector = $isNotNil(online) ? online.position() : target.position;

    // Stepping away along the graph beats picking the nearest vertex to a point in space: the walk only ever ends
    // on ground connected to the object, where the nearest vertex can sit across a hatch or a railing, at the right
    // height and still not somewhere the actor stays standing. It needs a vertex under the object to start from.
    if (getPositionLevelVertexId(position) < MAX_LEVEL_VERTEX_ID) {
      teleportActorToStoryObject(storyId, null, standoff);

      return reportTeleportArrival(storyId, "graph step away from the object", from);
    }

    // Its own facing, when it has one, so the actor arrives in front of it rather than on whichever side it was
    // approached from. Off the mesh nothing here is guaranteed ground, and the front of an NPC is the best guess.
    teleportActorNearPosition(position, $isNotNil(online) ? online.direction() : null);

    return reportTeleportArrival(storyId, "position, the object standing off the AI mesh", from);
  }

  if (target.m_game_vertex_id >= MAX_U16) {
    return reportTeleportRefused(
      storyId,
      string.format(
        "it carries no game vertex and its position %s has none on '%s' either, so the level it sits on cannot be told",
        vectorToString(target.position),
        level.name()
      )
    );
  }

  report("teleport: '%s' sits off '%s', jumping level to gvid %s", storyId, level.name(), target.m_game_vertex_id);
  markLevelJump();
  game.jump_to_level(target.position, target.m_level_vertex_id, target.m_game_vertex_id);

  return true;
}

/**
 * Move the actor onto a server object of the loaded level, found by its name, such as a quest item on the ground.
 *
 * @param name - Name of the server object.
 * @returns Whether the actor was moved.
 */
export function teleportToServerObject(name: TName): boolean {
  const object: Nillable<ServerObject> = registry.simulator.object(name);

  if ($isNil(object)) {
    return reportTeleportRefused(name, "no server object carries that name");
  } else if (object.parent_id !== MAX_U16) {
    return reportTeleportRefused(name, "it is carried by another object, so it lies nowhere to go to");
  } else if (!isOnLoadedLevel(object)) {
    return reportTeleportRefused(name, string.format("it lies off '%s'", level.name()));
  }

  const from: Vector = getActorPosition();

  // An object off the AI mesh, such as a door's pivot inside its frame, is a position the engine pushes the actor back
  // out of, all the way to where it stood before; stand off onto the mesh instead.
  if (getPositionLevelVertexId(object.position) < MAX_LEVEL_VERTEX_ID) {
    teleportActorToPosition(object.position);

    return reportTeleportArrival(name, "server object position", from);
  }

  teleportActorNearPosition(object.position);

  return reportTeleportArrival(name, "position, the object standing off the AI mesh", from);
}

/**
 * Move the actor onto a patrol point, when the loaded level has that path.
 *
 * @param positionPatrolName - Patrol path to arrive on.
 * @param lookPatrolName - Patrol path whose first point the actor turns towards, if any.
 * @param pointIndex - Point of the position patrol to arrive on, -1 for the last one.
 * @returns Whether the actor was moved.
 */
export function teleportToPatrol(
  positionPatrolName: TName,
  lookPatrolName: Nillable<TName> = null,
  pointIndex: TIndex = 0
): boolean {
  if (!level.patrol_path_exists(positionPatrolName)) {
    return reportTeleportRefused(positionPatrolName, string.format("no such patrol path on '%s'", level.name()));
  }

  if ($isNotNil(lookPatrolName) && !level.patrol_path_exists(lookPatrolName)) {
    return reportTeleportRefused(
      positionPatrolName,
      string.format("its look path '%s' does not exist on '%s'", lookPatrolName, level.name())
    );
  }

  const from: Vector = getActorPosition();

  teleportActorToPatrol(positionPatrolName, lookPatrolName, pointIndex);

  return reportTeleportArrival(positionPatrolName, string.format("patrol point %s", pointIndex), from);
}

/**
 * Move the actor onto a bare world position on a named level.
 *
 * @param label - What the position stands for, since a raw vector says nothing in a log.
 * @param levelName - Level the coordinates were taken on.
 * @param position - World position to arrive on.
 * @param facing - Optional position to turn towards on arrival.
 * @returns Whether the actor was moved.
 */
export function teleportToPoint(
  label: TLabel,
  levelName: TName,
  position: Vector,
  facing: Nillable<Vector> = null
): boolean {
  if (level.name() !== levelName) {
    return reportTeleportRefused(
      label,
      string.format("its coordinates were taken on '%s' and '%s' is loaded", levelName, level.name())
    );
  }

  const from: Vector = getActorPosition();

  teleportActorToPosition(position, facing);

  return reportTeleportArrival(label, string.format("bare position %s", vectorToString(position)), from);
}

/**
 * Record what the actor is carrying, so a payout observed on a later invocation can be a delta.
 *
 * @param key - Actor store key to record under.
 */
export function rememberActorMoney(key: TName): void {
  setPortableStoreValue<TCount>(ACTOR_ID, key, registry.actor.money());
}

/**
 * Assert the actor is at least a given amount better off than when the baseline was recorded.
 *
 * @param key - Actor store key the baseline was recorded under.
 * @param atLeast - Money the payout is expected to be worth.
 * @param assertion - Short label of what was being verified.
 */
export function expectActorMoneyGained(key: TName, atLeast: TCount, assertion: TLabel): void {
  const before: TCount = getPortableStoreValue<TCount>(ACTOR_ID, key, -1);

  if (before < 0) {
    return report("no money baseline under '%s', the payout happened outside this walk", key);
  }

  const gained: TCount = registry.actor.money() - before;

  expect(
    gained >= atLeast,
    assertion,
    `actor is ${gained} better off since the baseline, expected at least ${atLeast}`
  );
}

/**
 * Assert the actor paid at least a given amount since the baseline was recorded.
 *
 * @param key - Actor store key the baseline was recorded under.
 * @param atLeast - Money the payment is expected to be worth.
 * @param assertion - Short label of what was being verified.
 */
export function expectActorMoneySpent(key: TName, atLeast: TCount, assertion: TLabel): void {
  const before: TCount = getPortableStoreValue<TCount>(ACTOR_ID, key, -1);

  if (before < 0) {
    return report("no money baseline under '%s', the payment happened outside this walk", key);
  }

  const spent: TCount = before - registry.actor.money();

  expect(spent >= atLeast, assertion, `actor spent ${spent} since the baseline, expected at least ${atLeast}`);
}
