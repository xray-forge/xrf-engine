import { device, game_graph, level, patrol, sound_object } from "xray16";
import {
  AlifeSimulator,
  ESoundObjectType,
  GameObject,
  Patrol,
  ServerCreatureObject,
  ServerObject,
  Vector,
} from "xray16/alias";
import {
  assert,
  copyVector,
  createVector,
  graphDistance,
  MAX_ALIFE_ID,
  MAX_LEVEL_VERTEX_ID,
  MAX_U16,
  Nillable,
  TCount,
  TDistance,
  TIndex,
  TName,
  TNumberId,
  TStringId,
  vectorRotateY,
  yawDegree3d,
  ZERO_VECTOR,
} from "xray16/lib";
import { $isNil, $isNotNil } from "xray16/macros";

import { getObjectByStoryId, getServerObjectByStoryId, registry } from "@/engine/core/database";
import { type SmartTerrain } from "@/engine/core/objects/smart_terrain";
import { resetTable } from "@/engine/core/utils/table";

/**
 * Cap is ~10x the expected steady-state pair diversity (terrain-terrain pairs per level are ~1-2k, squads add churn).
 * Worst-case memory stays negligible (~0.5 MB of hash nodes at 2^14 entries).
 *
 * @inline
 */
const DISTANCE_MEMO_LIMIT: TCount = 16_384;

/**
 * Symmetric pair key packs `min(a, b) * 2^20 + max(a, b)` into one exact number.
 * Any multiplier above 2^16 is collision-free; 2^20 adds headroom and the largest key (~2^36).
 *
 * @inline
 */
const DISTANCE_MEMO_PAIR_KEY: TCount = 2 ** 20;

/**
 * Reset memoized game graph lookups, needed by tests only - the graph never changes at runtime.
 */
export function resetPositionCache(): void {
  resetTable(registry.cache.gameVertexLevelIds);
  resetTable(registry.cache.levelNames);
  resetTable(registry.cache.graphDistances);
  registry.cache.graphDistancesCount = 0;
}

/**
 * Get level name by level id through a session-immutable memo.
 *
 * @param levelId - Level id to get name for.
 * @returns Name of the level.
 */
export function getGameLevelName(levelId: TNumberId): TName {
  const existing: Nillable<TName> = registry.cache.levelNames.get(levelId);

  if ($isNotNil(existing)) {
    return existing;
  }

  const levelName: TName = registry.simulator.level_name(levelId);

  registry.cache.levelNames.set(levelId, levelName);

  return levelName;
}

/**
 * Get level id of the game graph vertex through a session-immutable memo.
 *
 * @param gameVertexId - Game graph vertex id to get level for.
 * @returns Level id of the vertex.
 */
export function getGameVertexLevelId(gameVertexId: TNumberId): TNumberId {
  const existing: Nillable<TNumberId> = registry.cache.gameVertexLevelIds.get(gameVertexId);

  if ($isNotNil(existing)) {
    return existing;
  }

  const levelId: TNumberId = game_graph().vertex(gameVertexId).level_id();

  registry.cache.gameVertexLevelIds.set(gameVertexId, levelId);

  return levelId;
}

/**
 * Get smart terrain linked to object.
 *
 * @param object - Server or game object.
 * @returns Object smart terrain server object or null.
 */
export function getObjectTerrain(object: GameObject | ServerCreatureObject): Nillable<SmartTerrain> {
  const simulator: AlifeSimulator = registry.simulator;

  if (type(object.id) === "function") {
    const serverObject: Nillable<ServerCreatureObject> = simulator.object((object as GameObject).id());

    return $isNil(serverObject) || serverObject.m_smart_terrain_id === MAX_ALIFE_ID
      ? null
      : simulator.object(serverObject.m_smart_terrain_id);
  } else {
    return (object as ServerCreatureObject).m_smart_terrain_id === MAX_ALIFE_ID
      ? null
      : simulator.object((object as ServerCreatureObject).m_smart_terrain_id);
  }
}

/**
 * Check whether object is in provided smart terrain (name).
 *
 * @param object - Game object to check.
 * @param terrainName - Desired smart terrain to check.
 * @returns Whether object is assigned to smart terrain with desired name.
 */
export function isObjectInSmartTerrain(object: GameObject, terrainName: TName): boolean {
  const terrain: Nillable<SmartTerrain> = getObjectTerrain(object);

  return terrain ? terrain.name() === terrainName : false;
}

/**
 * Check whether object is inside silence zone.
 *
 * @param object - Game object to check.
 * @returns Whether object is inside silence zone.
 */
export function isObjectInSilenceZone(object: GameObject): boolean {
  const position: Vector = object.position();

  for (const [, zoneName] of registry.silenceZones) {
    if (registry.zones.get(zoneName).inside(position)) {
      return true;
    }
  }

  return false;
}

/**
 * Check whether object is on matching level.
 *
 * @param object - Target object to check.
 * @param levelName - Target level name.
 * @returns Whether provided object is on a level.
 */
export function isObjectOnLevel(object: Nillable<ServerObject>, levelName: TName): boolean {
  return $isNotNil(object) && getGameLevelName(getGameVertexLevelId(object.m_game_vertex_id)) === levelName;
}

/**
 * Resolve the level vertex a position stands on, refusing an answer that names somewhere else.
 *
 * `level.vertex_id` looks the position up by grid cell rather than by proximity, and for one the mesh does not
 * cover it can hand back a plausible looking id belonging to another part of the level: Nimble, on Skadovsk's top
 * deck, resolves to a vertex 727 m away. Nothing about the id says so, so the only test is asking the vertex where
 * it is and seeing whether it answers with the position it was looked up for.
 *
 * @param position - World position to resolve.
 * @returns Vertex at the position, or `MAX_LEVEL_VERTEX_ID` when the position has none.
 */
export function getPositionLevelVertexId(position: Vector): TNumberId {
  const vertexId: TNumberId = level.vertex_id(position);

  if (vertexId >= MAX_LEVEL_VERTEX_ID) {
    return MAX_LEVEL_VERTEX_ID;
  }

  return level.vertex_position(vertexId).distance_to_sqr(position) <= 25 ? vertexId : MAX_LEVEL_VERTEX_ID;
}

/**
 * Check whether a server object sits on the level currently loaded.
 *
 * @param object - Server object to locate.
 * @returns Whether the object is on the loaded level.
 */
export function isOnLoadedLevel(object: ServerObject): boolean {
  return object.m_game_vertex_id < MAX_U16
    ? isObjectOnLevel(object, level.name())
    : getPositionLevelVertexId(object.position) < MAX_LEVEL_VERTEX_ID;
}

/**
 * Check whether objects are on same level.
 *
 * @param first - Object to compare.
 * @param second - Object to compare.
 * @returns Whether objects are on same level.
 */
export function areObjectsOnSameLevel(first: ServerObject, second: ServerObject): boolean {
  return getGameVertexLevelId(first.m_game_vertex_id) === getGameVertexLevelId(second.m_game_vertex_id);
}

/**
 * Get distance for objects based on game graphs.
 * Approximately calculates distance for servers that are offline and may be on different levels.
 * Straight-line graph distance is constant per vertex pair, results are memoized with a bounded cache.
 *
 * @param first - Object to check.
 * @param second - Object to check.
 * @returns Graph distance between two objects.
 */
export function getServerDistanceBetween(first: ServerObject, second: ServerObject): TDistance {
  const firstVertexId: TNumberId = first.m_game_vertex_id;
  const secondVertexId: TNumberId = second.m_game_vertex_id;

  const key: TNumberId =
    firstVertexId < secondVertexId
      ? firstVertexId * DISTANCE_MEMO_PAIR_KEY + secondVertexId
      : secondVertexId * DISTANCE_MEMO_PAIR_KEY + firstVertexId;

  const existing: Nillable<TDistance> = registry.cache.graphDistances.get(key);

  if ($isNotNil(existing)) {
    return existing;
  }

  const distance: TDistance = graphDistance(firstVertexId, secondVertexId);

  if (registry.cache.graphDistancesCount < DISTANCE_MEMO_LIMIT) {
    registry.cache.graphDistances.set(key, distance);
    registry.cache.graphDistancesCount += 1;
  }

  return distance;
}

/**
 * Send object to desired vertex or nearest accessible one.
 *
 * @param object - Target object to send.
 * @param vertexId - Destination vertex id.
 * @returns Actual vertex id to send object.
 */
export function sendToNearestAccessibleVertex(object: GameObject, vertexId: Nillable<TNumberId>): TNumberId {
  if ($isNil(vertexId) || vertexId >= MAX_LEVEL_VERTEX_ID) {
    object.set_dest_level_vertex_id(object.level_vertex_id());

    return object.level_vertex_id();
  }

  if (!object.accessible(vertexId)) {
    [vertexId] = object.accessible_nearest(level.vertex_position(vertexId), ZERO_VECTOR);
  }

  object.set_dest_level_vertex_id(vertexId);

  return vertexId;
}

/**
 * Send object to a vertex when its restrictors let it go there, and leave its destination as it is otherwise.
 *
 * Unlike {@link sendToNearestAccessibleVertex}, it never substitutes another vertex: the nearest one the restrictors
 * allow is not always reachable, and the engine then fails the path to it on every update.
 *
 * @param object - Target object to send.
 * @param vertexId - Destination vertex id.
 * @returns Whether the destination was set.
 */
export function sendToVertexIfAccessible(object: GameObject, vertexId: TNumberId): boolean {
  if (vertexId >= MAX_LEVEL_VERTEX_ID || !object.accessible(vertexId)) {
    return false;
  }

  object.set_dest_level_vertex_id(vertexId);

  return true;
}

/**
 * @param object - Target object to check.
 * @returns Whether object is in visibility frustum of actor point of view.
 */
export function isObjectInActorFrustum(object: GameObject): boolean {
  return yawDegree3d(device().cam_dir, object.position().sub(registry.actor.position())) < 35;
}

/**
 * Read where the actor stands, as a value of its own rather than a handle on the actor.
 *
 * @returns Copy of the actor's current position.
 */
export function getActorPosition(): Vector {
  return copyVector(registry.actor.position());
}

/**
 * Teleport actor to a specified point/direction with corresponding teleportation sound.
 *
 * @param actor - Client actor object to teleport.
 * @param position - Vector destination.
 * @param direction - Vector direction.
 */
export function teleportActorWithEffects(actor: GameObject, position: Vector, direction: Vector): void {
  actor.set_actor_position(position);
  actor.set_actor_direction(-direction.getH());

  new sound_object("affects\\tinnitus3a").play_no_feedback(actor, ESoundObjectType.S2D, 0, ZERO_VECTOR, 1.0);
}

/**
 * Teleport actor to a point of a patrol path.
 *
 * No weapon zones are left to their own controllers, which notice the actor inside on their next update: marking
 * one here sticks when its logic is not in the no weapon scheme, as nothing then clears it.
 *
 * @param positionPatrolName - Patrol path the actor is moved onto.
 * @param lookPatrolName - Optional patrol path the actor is turned to face.
 * @param pointIndex - Index of the point to arrive at, or -1 for the last one.
 */
export function teleportActorToPatrol(
  positionPatrolName: TName,
  lookPatrolName: Nillable<TName> = null,
  pointIndex: TIndex = 0
): void {
  assert(
    level.patrol_path_exists(positionPatrolName),
    "Cannot teleport, patrol path '%s' does not exist.",
    positionPatrolName
  );

  const point: Patrol = new patrol(positionPatrolName);
  const index: TIndex = pointIndex === -1 ? point.count() - 1 : pointIndex;
  const destination: Vector = point.point(index);

  if (lookPatrolName) {
    assert(
      level.patrol_path_exists(lookPatrolName),
      "Cannot teleport, look patrol path '%s' does not exist.",
      lookPatrolName
    );

    registry.actor.set_actor_direction(-copyVector(new patrol(lookPatrolName).point(0)).sub(destination).getH());
  }

  registry.actor.set_actor_position(destination);
}

/**
 * Teleport actor a short distance away from a position, facing it, on navigable ground where possible.
 *
 * Sides are tried in quarter turns from the direction given, and the nearest vertex any of them lands on wins, ties
 * going to the side tried first. Handing in the facing of whoever stands at the position therefore puts the actor in
 * front of them unless another side is strictly closer, which is both where you would stand to talk and the side
 * least likely to have a wall on it.
 *
 * @param position - World position to arrive next to.
 * @param direction - Direction to back away along. Defaults to the line from the position to the actor.
 * @param standoff - How far from the position to stop, in metres. Zero arrives on the position.
 * @returns Whether the arrival point came from the AI graph rather than being the offset point itself.
 */
export function teleportActorNearPosition(
  position: Vector,
  direction: Nillable<Vector> = null,
  standoff: TDistance = 3
): boolean {
  const actorPosition: Vector = registry.actor.position();

  // Horizontal only. An approach taken in three dimensions tilts the whole ring of candidates towards the floor the
  // actor is standing on, and after one bad arrival that is the wrong floor, which makes the mistake self sustaining.
  const approach: Vector = $isNotNil(direction)
    ? createVector(direction.x, 0, direction.z)
    : createVector(actorPosition.x - position.x, 0, actorPosition.z - position.z);

  // Standing over or under the target leaves no line to back away along, so pick an arbitrary one.
  if (approach.magnitude() < 0.1) {
    approach.set(1, 0, 0);
  }

  let arrival: Vector = copyVector(position).add(copyVector(approach).set_length(standoff));
  let isOnGraph: boolean = false;

  // A vertex further from the standoff point than this is not an arrival, it is a different place: at a standoff of
  // 3 m it already puts the actor 7 m from the target. Falling back to the offset point beats accepting one.
  let closest: TDistance = 16;

  for (const angle of [0, 90, 180, 270]) {
    const offset: Vector = angle === 0 ? copyVector(approach) : vectorRotateY(approach, angle);
    const candidateStandoff: Vector = copyVector(position).add(offset.set_length(standoff));
    const vertexId: TNumberId = level.vertex_id(candidateStandoff);

    if (vertexId >= MAX_LEVEL_VERTEX_ID) {
      continue;
    }

    const candidate: Vector = level.vertex_position(vertexId);
    const gap: TDistance = candidate.distance_to_sqr(candidateStandoff);

    // Height is judged against the target, not against the standoff point: what matters is whether the actor lands
    // somewhere the target can be reached from, and a vertex one floor down is near in metres yet useless in fact.
    // A later side has to beat the one before it outright, so an equal snap leaves the first side holding.
    if (gap >= closest || math.abs(candidate.y - position.y) > 1.5) {
      continue;
    }

    arrival = candidate;
    isOnGraph = true;
    closest = gap;
  }

  registry.actor.set_actor_position(arrival);
  registry.actor.set_actor_direction(-copyVector(position).sub(arrival).getH());

  return isOnGraph;
}

/**
 * Teleport actor exactly onto a position, with no AI graph involvement at all.
 *
 * @param position - World position to arrive on.
 * @param facing - Optional position to turn towards on arrival.
 */
export function teleportActorToPosition(position: Vector, facing: Nillable<Vector> = null): void {
  registry.actor.set_actor_position(position);

  if ($isNotNil(facing)) {
    registry.actor.set_actor_direction(-copyVector(facing).sub(position).getH());
  }
}

/**
 * Step away from a level vertex along a direction, shrinking the distance until the graph allows it.
 *
 * `vertex_in_direction` returns the vertex it started from when it cannot travel that far, which
 * indoors is the common case: asking for 15 metres inside a ship hull yields no movement at all.
 *
 * @param vertexId - Vertex to step away from.
 * @param direction - Direction to step in.
 * @param distance - Preferred distance, in metres.
 * @returns Vertex stepped to, or the original one when even the smallest step does not fit.
 */
function stepAwayFromVertex(vertexId: TNumberId, direction: Vector, distance: TDistance): TNumberId {
  let attempt: TDistance = distance;

  while (attempt >= 1) {
    const candidate: TNumberId = level.vertex_in_direction(vertexId, direction, attempt);

    if (candidate < MAX_LEVEL_VERTEX_ID && candidate !== vertexId) {
      return candidate;
    }

    attempt = attempt / 2;
  }

  return vertexId;
}

/**
 * Teleport actor onto navigable ground in front of whoever carries a story id, facing them.
 *
 * Aborts on an unregistered id, on a target outside the loaded level, or on one standing off the AI mesh.
 *
 * @param storyId - Story id of the object to arrive in front of.
 * @param direction - Direction to step away from the target in. Defaults to the target's own facing.
 * @param distance - How far in front of the target to stop, in metres.
 */
export function teleportActorToStoryObject(
  storyId: TStringId,
  direction: Nillable<Vector> = null,
  distance: TDistance = 5
): void {
  const serverObject: Nillable<ServerObject> = getServerObjectByStoryId(storyId);

  assert($isNotNil(serverObject), "Cannot teleport, no object with story id '%s' is registered.", storyId);

  const target: Nillable<GameObject> = getObjectByStoryId(storyId);

  // Being online settles the level on its own, which is worth preferring: the game vertex of these objects is no
  // sounder than the level one, the b202 chest reporting 317 while the ground it stands on is 327. A wrong one that
  // happens to name another level would throw the actor across the map through the caller's own level jump.
  assert(
    $isNotNil(target) || isOnLoadedLevel(serverObject!),
    "Cannot teleport to '%s', it is not on the loaded level.",
    storyId
  );

  const targetPosition: Vector = $isNotNil(target) ? target.position() : serverObject!.position;
  const targetVertexId: TNumberId = getPositionLevelVertexId(targetPosition);

  assert(targetVertexId < MAX_LEVEL_VERTEX_ID, "Cannot teleport to '%s', it stands off the AI mesh.", storyId);

  let offsetDirection: Nillable<Vector> = direction;

  if ($isNil(offsetDirection)) {
    offsetDirection = $isNotNil(target) ? target.direction() : getActorPosition().sub(targetPosition);
  }

  const arrival: Vector = level.vertex_position(stepAwayFromVertex(targetVertexId, offsetDirection, distance));

  registry.actor.set_actor_position(arrival);
  registry.actor.set_actor_direction(-copyVector(targetPosition).sub(arrival).getH());
}

/**
 * @returns Whether actor is inside any no weapon zone.
 */
export function isActorInNoWeaponZone(): boolean {
  for (const [, isActive] of registry.noWeaponZones) {
    if (isActive) {
      return true;
    }
  }

  return false;
}
