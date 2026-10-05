import { cast_planner, level } from "xray16";
import { ActionPlanner, GameObject, ServerCreatureObject, ServerObject, Vector } from "xray16/alias";
import { LuaArray, MAX_ALIFE_ID, Nillable, TCount, TLabel, TNumberId } from "xray16/lib";
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

  addField(fields, "object", describeDebugObject(id));
  addField(fields, "section", serverObject.section_name());
  addField(fields, "story id", getStoryIdByObjectId(id));
  addField(fields, "state", $isNil(object) ? "offline" : "online");

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
  addField(fields, "position", formatDebugPosition(object.position()));
  addField(fields, "distance", string.format("%.1f m", object.position().distance_to(registry.actor.position())));

  if (!isCreature(object)) {
    return;
  }

  const state: Nillable<IRegistryObjectState> = registry.objects.get(object.id());
  const squad: Nillable<Squad> = getObjectSquad(object);
  const terrain: Nillable<SmartTerrain> = getObjectTerrain(object);

  addField(fields, "health", string.format("%.0f%%%s", object.health * 100, object.alive() ? "" : ", dead"));
  addField(fields, "community", getObjectCommunity(object));
  addField(fields, "relation", describeRelationToActor(object));
  addField(fields, "squad", $isNotNil(squad) ? describeDebugObject(squad.id) : null);
  addField(fields, "smart terrain", $isNotNil(terrain) ? terrain.name() : null);
  addField(fields, "logic scheme", state?.activeScheme);
  addField(fields, "logic section", state?.activeSection);

  if (isStalker(object) && object.alive()) {
    addField(fields, "planner", describePlannerAction(object));
  }
}

/**
 * Describe an offline object from its server object.
 *
 * @param fields - Fields to add to.
 * @param serverObject - Server object.
 */
function inspectOfflineObject(fields: LuaArray<IDebugField>, serverObject: ServerObject): void {
  addField(fields, "level", getGameLevelName(getGameVertexLevelId(serverObject.m_game_vertex_id)));
  addField(fields, "position", formatDebugPosition(serverObject.position));

  if (isCreature(serverObject)) {
    const creature: ServerCreatureObject = serverObject as ServerCreatureObject;
    const terrain: Nillable<SmartTerrain> = getObjectTerrain(creature);

    addField(fields, "squad", creature.group_id === MAX_ALIFE_ID ? null : describeDebugObject(creature.group_id));
    addField(fields, "smart terrain", $isNotNil(terrain) ? terrain.name() : null);
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
function addField(fields: LuaArray<IDebugField>, label: TLabel, value: Nillable<TLabel>): void {
  if ($isNotNil(value)) {
    table.insert(fields, { label, value });
  }
}
