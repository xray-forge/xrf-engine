import { GameObject } from "xray16/alias";
import { TNumberId } from "xray16/lib";

import { IRegistryObjectState } from "@/engine/core/database/database_types";
import { registerObject, unregisterObject } from "@/engine/core/database/objects";
import { registry } from "@/engine/core/database/registry";

/**
 * Register crow game object in lua in-memory registry.
 *
 * @param object - Client game object to register.
 * @returns Registry object for provided game object.
 */
export function registerCrow(object: GameObject): IRegistryObjectState {
  const objectId: TNumberId = object.id();

  if (!registry.crows.storage.has(objectId)) {
    registry.crows.count += 1;
  }

  registry.crows.storage.set(objectId, objectId);

  return registerObject(object);
}

/**
 * Stop counting a dead crow among the living ones the crow spawner keeps topped up.
 *
 * Its object state stays registered: a dead crow stays online, and is saved, until its corpse is released.
 *
 * @param object - Client game object of the crow.
 */
export function markCrowDead(object: GameObject): void {
  const objectId: TNumberId = object.id();

  if (registry.crows.storage.has(objectId)) {
    registry.crows.count -= 1;
  }

  registry.crows.storage.delete(objectId);
}

/**
 * Unregister crow game object from lua in-memory registry.
 *
 * @param object - Client game object to unregister.
 */
export function unregisterCrow(object: GameObject): void {
  markCrowDead(object);
  unregisterObject(object);
}
