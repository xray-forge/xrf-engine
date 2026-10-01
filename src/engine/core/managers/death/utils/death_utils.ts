import { time_global } from "xray16";
import { GameObject, ServerObject, Vector } from "xray16/alias";
import { LuaArray, Nillable, TDistance, TIndex, TNumberId, TTimestamp } from "xray16/lib";

import { getStoryIdByObjectId, registry } from "@/engine/core/database";
import { deathConfig } from "@/engine/core/managers/death/DeathConfig";
import { dropConfig } from "@/engine/core/managers/drop/DropConfig";
import { isCreature } from "@/engine/core/utils/class_ids";
import { isObjectWithKnownInfo } from "@/engine/core/utils/object";

/**
 * @param object - Game object to check.
 * @returns Whether object corpse can be safely released.
 */
export function canReleaseObjectCorpse(object: GameObject): boolean {
  if (getStoryIdByObjectId(object.id())) {
    return false;
  }

  if (isObjectWithKnownInfo(object)) {
    return false;
  }

  for (const [section] of dropConfig.ITEMS_KEEP) {
    if (object.object(section)) {
      return false;
    }
  }

  return true;
}

/**
 * Online corpses wait the idle time from the engine death time, which is the moment a corpse died or came online.
 * Offline corpses are out of the actor's reach and need no wait.
 *
 * @param ids - Identifiers of corpses to check for release.
 * @returns Index of the farthest corpse that can be released and its server object, or nulls when there is none.
 */
export function getFarthestCorpseToRelease(
  ids: LuaArray<TNumberId>
): LuaMultiReturn<[null, null] | [TIndex, ServerObject]> {
  const now: TTimestamp = time_global();
  const position: Vector = registry.actor.position();

  let releaseObjectIndex: Nillable<TIndex> = null;
  let releaseObject: Nillable<ServerObject> = null;
  let releaseObjectDistance: TDistance = deathConfig.MIN_DISTANCE_SQR;

  for (const [index, id] of ids) {
    const object: Nillable<ServerObject> = registry.simulator.object(id);

    if (object && isCreature(object) && !object.alive()) {
      const distanceToCorpseSqr: TDistance = position.distance_to_sqr(object.position);

      if (distanceToCorpseSqr > releaseObjectDistance) {
        const gameObject: Nillable<GameObject> = registry.objects.get(id)?.object;

        if (
          !gameObject ||
          (now - gameObject.death_time() >= deathConfig.IDLE_AFTER_DEATH && canReleaseObjectCorpse(gameObject))
        ) {
          releaseObjectDistance = distanceToCorpseSqr;
          releaseObjectIndex = index;
          releaseObject = object;
        }
      }
    }
  }

  return $multi(releaseObjectIndex as TIndex, releaseObject as ServerObject);
}
