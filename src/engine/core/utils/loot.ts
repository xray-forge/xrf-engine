import { level } from "xray16";
import { GameObject, Vector } from "xray16/alias";
import { LuaArray, Nillable, TDistance, TNumberId } from "xray16/lib";
import { $isNil, $isNotNil } from "xray16/macros";

import { lootableTable } from "@/engine/constants/items/lootable_table";
import { getPortableStoreValue, IRegistryObjectState, registry } from "@/engine/core/database";
import { deathConfig } from "@/engine/core/managers/death/DeathConfig";
import { PS_LOOTING_DEAD_OBJECT } from "@/engine/core/schemes/stalker/corpse_detection/corpse_detection_types";
import { corpseDetectionConfig } from "@/engine/core/schemes/stalker/corpse_detection/CorpseDetectionConfig";
import { isLootableItemSection } from "@/engine/core/utils/section";

/**
 * Check if object has valuable loot.
 *
 * @param object - Game object to check.
 * @returns Whether object has any valuables to loot.
 */
export function isObjectWithValuableLoot(object: GameObject): boolean {
  let hasValuableLoot: boolean = false;

  object.iterate_inventory((object: GameObject, item: GameObject) => {
    if (item.section() in lootableTable) {
      hasValuableLoot = true;

      // Stop iterations, one is enough.
      return true;
    }
  }, object);

  return hasValuableLoot;
}

/**
 * Transfer all lootable items from one object to another.
 *
 * @param from - Game object to move loot from.
 * @param to - Game object to move loot to.
 * @returns Transfered objects lists.
 */
export function transferLoot(from: GameObject, to: GameObject): LuaArray<GameObject> {
  const list: LuaArray<GameObject> = new LuaTable();

  from.iterate_inventory((owner, item) => {
    if (isLootableItemSection(item.section())) {
      owner.transfer_item(item, to);
      table.insert(list, item);
    }
  }, from);

  return list;
}

/**
 * Get nearest corpse for game object.
 *
 * @param object - Game object to get nearest corpse.
 * @returns Tuple with object, vertex id, position.
 */
export function getNearestCorpseToLoot(
  object: GameObject
): LuaMultiReturn<[GameObject, TNumberId, Vector] | [null, null, null]> {
  let nearestCorpseDistSqr: TDistance = corpseDetectionConfig.DISTANCE_TO_SEARCH_SQR;
  let nearestCorpseVertex: Nillable<TNumberId> = null;
  let nearestCorpsePosition: Nillable<Vector> = null;
  let nearestCorpseObject: Nillable<GameObject> = null;

  for (const [, id] of deathConfig.RELEASE_OBJECTS_REGISTRY) {
    const registryState: Nillable<IRegistryObjectState> = registry.objects.get(id);
    const corpseObject: Nillable<GameObject> = $isNil(registryState) ? null : registryState.object;

    // Is registered in client side.
    if (corpseObject) {
      const isLootedBy: Nillable<TNumberId> = getPortableStoreValue(id, PS_LOOTING_DEAD_OBJECT);

      if (
        // Is not looted by anyone or looted by current object.
        ($isNil(isLootedBy) || isLootedBy === object.id()) &&
        // Seen dead object recently.
        $isNotNil(object.memory_position(corpseObject)) &&
        isObjectWithValuableLoot(corpseObject)
      ) {
        const distanceBetween: TDistance = object.position().distance_to_sqr(corpseObject.position());

        // Is near enough and has valuable loot.
        if (distanceBetween < nearestCorpseDistSqr) {
          const corpseVertex: TNumberId = level.vertex_id(corpseObject.position());

          // Can be reached by object.
          if (object.accessible(corpseVertex)) {
            nearestCorpseDistSqr = distanceBetween;
            nearestCorpseVertex = corpseVertex;
            nearestCorpsePosition = corpseObject.position();
            nearestCorpseObject = corpseObject;
          }
        }
      }
    }
  }

  return $multi(nearestCorpseObject, nearestCorpseVertex, nearestCorpsePosition) as LuaMultiReturn<
    [GameObject, TNumberId, Vector]
  >;
}
