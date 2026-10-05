import { level } from "xray16";
import { GameObject } from "xray16/alias";
import { Nillable, TNumberId } from "xray16/lib";
import { $isNil, $isNotNil } from "xray16/macros";

import { IDynamicObjectState, IRegistryObjectState } from "@/engine/core/database/database_types";
import { registry } from "@/engine/core/database/registry";

/**
 * Get the game object of an online object, registered or not.
 *
 * @param objectId - Object id.
 * @returns The online object, `null` when it is offline or does not exist.
 */
export function getGameObjectById(objectId: Nillable<TNumberId>): Nillable<GameObject> {
  if ($isNil(objectId)) {
    return null;
  }

  const object: Nillable<GameObject> = registry.objects.get(objectId)?.object as Nillable<GameObject>;

  if ($isNotNil(object)) {
    return object;
  }

  // Script-free objects such as items are never registered, and the level is missing outside of a game.
  return $isNotNil(level) ? level.object_by_id(objectId) : null;
}

/**
 * Register game object in lua in-memory registry.
 *
 * @param object - Client game object to register.
 * @returns Registry object for provided game object.
 */
export function registerObject(object: GameObject): IRegistryObjectState {
  const stored: Nillable<IRegistryObjectState> = registry.objects.get(object.id()) as Nillable<IRegistryObjectState>;

  if (stored) {
    stored.object = object;

    return stored;
  } else {
    const newRecord: IRegistryObjectState = { object: object } as IRegistryObjectState;

    registry.objects.set(object.id(), newRecord);

    return newRecord;
  }
}

/**
 * Unregister game object from lya in-memory registry.
 *
 * @param object - Client game object to unregister.
 */
export function unregisterObject(object: GameObject): void {
  registry.objects.delete(object.id());
}

/**
 * Reset object state in registry.
 * Supply partial to override empty state.
 *
 * @param object - Client game object to reset state.
 * @param state - Nillable initial state to use for reset.
 * @returns New game object state object.
 */
export function resetObject(object: GameObject, state: Partial<IRegistryObjectState> = {}): IRegistryObjectState {
  state.object = object;
  registry.objects.set(object.id(), state as IRegistryObjectState);

  return state as IRegistryObjectState;
}

export function getObjectDynamicState(objectId: TNumberId): IDynamicObjectState;
export function getObjectDynamicState(objectId: TNumberId, initialize: true): IDynamicObjectState;

/**
 * Get dynamic state for game object.
 * Dynamic state is persistent and saved in files by lua marshal lib.
 *
 * @param objectId - Game object ID.
 * @param initialize - Whether data should be initialized in case it is null.
 * @returns Dynamic state of the object.
 */
export function getObjectDynamicState(objectId: TNumberId, initialize?: boolean): Nillable<IDynamicObjectState> {
  let state: Nillable<IDynamicObjectState> = registry.dynamicData.objects.get(objectId);

  if (!state && initialize) {
    state = {} as IDynamicObjectState;
    registry.dynamicData.objects.set(objectId, state);
  }

  return state;
}

/**
 * Register dynamic state for an object.
 *
 * @param objectId - Object identifier.
 * @returns Newly initialized dynamic state.
 */
export function registerObjectDynamicState(objectId: TNumberId): IDynamicObjectState {
  const state: IDynamicObjectState = {} as IDynamicObjectState;

  registry.dynamicData.objects.set(objectId, state);

  return state;
}

/**
 * Unregister dynamic state for an object.
 *
 * @param objectId - Object identifier.
 */
export function unregisterObjectDynamicState(objectId: TNumberId): void {
  registry.dynamicData.objects.delete(objectId);
}
