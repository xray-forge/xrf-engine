import { cast_planner, level } from "xray16";
import { ActionPlanner, GameObject, ServerCreatureObject, ServerObject, Vector } from "xray16/alias";
import {
  LuaArray,
  MAX_ALIFE_ID,
  MAX_U16,
  Nillable,
  TCount,
  TDuration,
  TLabel,
  TName,
  TNumberId,
  TRate,
} from "xray16/lib";
import { $isNil, $isNotNil } from "xray16/macros";

import { EActionId } from "@/engine/core/ai/planner/types";
import { getGameObjectById, IRegistryObjectState, registry } from "@/engine/core/database";
import { getStoryIdByObjectId } from "@/engine/core/database/story_objects";
import { IDebugField } from "@/engine/core/managers/debug/debug_types";
import type { SmartTerrain } from "@/engine/core/objects/smart_terrain";
import type { Squad } from "@/engine/core/objects/squad";
import { isCreature, isStalker } from "@/engine/core/utils/class_ids";
import { getObjectCommunity } from "@/engine/core/utils/community";
import { getGameLevelName, getGameVertexLevelId, getObjectTerrain } from "@/engine/core/utils/position";
import { getRelationByGoodwill } from "@/engine/core/utils/relation";
import { getObjectSquad } from "@/engine/core/utils/squad";

/**
 * @param position - World position.
 * @returns Position as `x, y, z` rounded to decimetres.
 */
export function formatDebugPosition(position: Vector): TLabel {
  return string.format("%.1f, %.1f, %.1f", position.x, position.y, position.z);
}

/**
 * @param id - Object id.
 * @returns Short name of an object for headers and lists: `name (id)`, or a note when it no longer exists.
 */
export function describeDebugObject(id: TNumberId): TLabel {
  const serverObject: Nillable<ServerObject> = registry.simulator.object(id);

  return $isNil(serverObject) ? `gone (${id})` : `${serverObject.name()} (${id})`;
}

/**
 * @param seconds - Game seconds.
 * @returns The duration in hours and minutes, or in seconds under a minute.
 */
export function formatDebugGameDuration(seconds: TDuration): TLabel {
  if (seconds < 60) {
    return string.format("%ds", math.max(seconds, 0));
  }

  const minutes: TCount = math.floor(seconds / 60);

  return minutes < 60
    ? string.format("%dm", minutes)
    : string.format("%dh %dm", math.floor(minutes / 60), minutes % 60);
}

/**
 * @param rates - Rates by name, as numbers or their text.
 * @returns The non-zero ones as `name rate`, sorted and comma separated, `none` without any.
 */
export function describeDebugRates<T extends TRate | string>(rates: LuaTable<TName, T>): TLabel {
  const parts: LuaArray<TLabel> = new LuaTable();

  for (const [name, rate] of rates) {
    if (tonumber(rate) !== 0) {
      table.insert(parts, `${name} ${rate}`);
    }
  }

  table.sort(parts, (first, second) => first < second);

  return parts.length() > 0 ? table.concat(parts, ", ") : "none";
}

/**
 * @returns Where the actor stands: level, position and level vertex.
 */
export function inspectActorLocation(): TLabel {
  const actor: GameObject = registry.actor;

  return string.format("%s  %s  lv %s", level.name(), formatDebugPosition(actor.position()), actor.level_vertex_id());
}

/**
 * Describe an object for the target tab, with more detail while it is online.
 *
 * @param id - Object id.
 * @returns Labelled values describing the object, empty when it does not exist.
 */
export function inspectDebugTarget(id: TNumberId): LuaArray<IDebugField> {
  const fields: LuaArray<IDebugField> = new LuaTable();
  const serverObject: Nillable<ServerObject> = registry.simulator.object(id);

  if ($isNil(serverObject)) {
    return fields;
  }

  const object: Nillable<GameObject> = getGameObjectById(id);

  addDebugField(fields, "object", describeDebugObject(id));
  addDebugField(fields, "section", serverObject.section_name());
  addDebugField(fields, "story id", getStoryIdByObjectId(id));
  addDebugField(fields, "state", $isNil(object) ? "offline" : "online");

  if ($isNil(object)) {
    inspectOfflineObject(fields, serverObject);
  } else {
    inspectOnlineObject(fields, object);
  }

  return fields;
}

/**
 * Describe an online object.
 *
 * @param fields - Fields to add to.
 * @param object - Online game object.
 */
function inspectOnlineObject(fields: LuaArray<IDebugField>, object: GameObject): void {
  addDebugField(fields, "position", formatDebugPosition(object.position()));
  addDebugField(fields, "distance", string.format("%.1f m", object.position().distance_to(registry.actor.position())));

  if (!isCreature(object)) {
    return;
  }

  const state: Nillable<IRegistryObjectState> = registry.objects.get(object.id());
  const squad: Nillable<Squad> = getObjectSquad(object);
  const terrain: Nillable<SmartTerrain> = getObjectTerrain(object);

  addDebugField(fields, "health", string.format("%.0f%%%s", object.health * 100, object.alive() ? "" : ", dead"));
  addDebugField(fields, "community", getObjectCommunity(object));
  addDebugField(fields, "relation", describeRelationToActor(object));
  addDebugField(fields, "squad", $isNotNil(squad) ? describeDebugObject(squad.id) : null);
  addDebugField(fields, "smart terrain", $isNotNil(terrain) ? terrain.name() : null);
  addDebugField(fields, "logic scheme", state?.activeScheme);
  addDebugField(fields, "logic section", state?.activeSection);

  if (isStalker(object) && object.alive()) {
    addDebugField(fields, "planner", describePlannerAction(object));
  }
}

/**
 * Describe an offline object from its server object.
 *
 * @param fields - Fields to add to.
 * @param serverObject - Server object.
 */
function inspectOfflineObject(fields: LuaArray<IDebugField>, serverObject: ServerObject): void {
  addDebugField(fields, "level", getDebugObjectLevelName(serverObject));
  addDebugField(fields, "position", formatDebugPosition(serverObject.position));

  if (isCreature(serverObject)) {
    const creature: ServerCreatureObject = serverObject as ServerCreatureObject;
    const terrain: Nillable<SmartTerrain> = getObjectTerrain(creature);

    addDebugField(fields, "squad", creature.group_id === MAX_ALIFE_ID ? null : describeDebugObject(creature.group_id));
    addDebugField(fields, "smart terrain", $isNotNil(terrain) ? terrain.name() : null);
  }
}

/**
 * @param object - Online stalker.
 * @returns The motivation planner's current action, with the sub-planner's action where there is one.
 */
function describePlannerAction(object: GameObject): Nillable<TLabel> {
  const planner: Nillable<ActionPlanner> = object.motivation_action_manager();

  if ($isNil(planner) || !planner.initialized()) {
    return null;
  }

  const actionId: TNumberId = planner.current_action_id();

  if (actionId === EActionId.ALIFE || actionId === EActionId.COMBAT || actionId === EActionId.ANOMALY) {
    return string.format("%s > %s", actionId, cast_planner(planner.action(actionId)).current_action_id());
  }

  return tostring(actionId);
}

/**
 * @param object - Online creature.
 * @returns The creature's relation to the actor with the goodwill behind it.
 */
function describeRelationToActor(object: GameObject): TLabel {
  const goodwill: TCount = object.general_goodwill(registry.actor);

  return `${getRelationByGoodwill(goodwill)} (${goodwill})`;
}

/**
 * Add a field when it has a value.
 *
 * @param fields - Fields to add to.
 * @param label - Field label.
 * @param value - Field value, skipped when missing.
 */
export function addDebugField(fields: LuaArray<IDebugField>, label: TLabel, value: Nillable<TLabel>): void {
  if ($isNotNil(value)) {
    table.insert(fields, { label, value });
  }
}

/**
 * @param serverObject - Server object.
 * @returns Name of the level the object is on, `unknown` when it has no game vertex, which some server classes do not
 *   even bind.
 */
export function getDebugObjectLevelName(serverObject: ServerObject): TName {
  const gameVertexId: Nillable<TNumberId> = serverObject.m_game_vertex_id;

  return $isNotNil(gameVertexId) && gameVertexId < MAX_U16
    ? getGameLevelName(getGameVertexLevelId(gameVertexId))
    : "unknown";
}
