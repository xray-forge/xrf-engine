import { type GameObject, type ServerActorObject } from "xray16/alias";

import { type IRegistryObjectState } from "@/engine/core/database/database_types";
import { registerObject, unregisterObject } from "@/engine/core/database/objects";
import { registry } from "@/engine/core/database/registry";
import { type Actor } from "@/engine/core/objects/creature/Actor";
import { invalidateInfoPortionsCache } from "@/engine/core/utils/info_portion";

/**
 * Register new actor entry in db.
 * Usually means that game is loaded or started.
 *
 * @param object - Game object to register as actor.
 * @returns Registry object state.
 */
export function registerActor(object: GameObject): IRegistryObjectState {
  registry.actor = object;

  // New actor instance means unknown info portions state.
  invalidateInfoPortionsCache();

  return registerObject(object);
}

/**
 * Unregister actor and remove entry from database.
 * Part of actor lifecycle and in most cases when game code is execute actor is available,
 * so it is primary reason why actor is not marked as Optional in db.
 */
export function unregisterActor(): void {
  unregisterObject(registry.actor);
  registry.actor = null as unknown as GameObject;

  invalidateInfoPortionsCache();
}

/**
 * Register new actor server entry in db.
 *
 * @param object - Server object to register as actor.
 * @returns Registered object.
 */
export function registerActorServer(object: ServerActorObject): Actor {
  registry.actorServer = object as Actor;

  return object as Actor;
}

/**
 * Unregister actor and remove entry from database.
 */
export function unregisterActorServer(): void {
  registry.actorServer = null as unknown as Actor;
}
