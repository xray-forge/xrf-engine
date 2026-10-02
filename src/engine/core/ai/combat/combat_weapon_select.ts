import { level } from "xray16";
import { GameObject, ServerObject } from "xray16/alias";
import { Nillable, TNumberId } from "xray16/lib";
import { $isNotNil } from "xray16/macros";

import { getManager, registry } from "@/engine/core/database";
import { EGameEvent, EventsManager } from "@/engine/core/managers/events";
import { isWeapon } from "@/engine/core/utils/class_ids";

/**
 * Allow event listeners to override the weapon selected by the engine for a stalker.
 *
 * Listeners of {@link EGameEvent.STALKER_WEAPON_SELECT} can set `data.weaponId` to the numeric ID of an online weapon
 * owned by the stalker. The selected server object must be a weapon, and its corresponding game object must still be available.
 * Returning null leaves weapon selection to the engine.
 *
 * @param object - Stalker selecting a weapon.
 * @param weapon - Weapon currently selected by the engine, or null when it has no candidate.
 * @returns Validated listener-selected weapon, or null to retain the engine's selection.
 */
export function selectBestStalkerWeapon(object: GameObject, weapon: Nillable<GameObject>): Nillable<GameObject> {
  const eventsManager: EventsManager = getManager(EventsManager);

  // The engine asks several times per stalker update, so nothing is allocated unless a listener may override.
  if (eventsManager.getEventSubscribersCount(EGameEvent.STALKER_WEAPON_SELECT) === 0) {
    return null;
  }

  const data = { weaponId: null as Nillable<TNumberId> };

  eventsManager.emitEvent(EGameEvent.STALKER_WEAPON_SELECT, object, weapon, data);

  const nextWeaponId: Nillable<TNumberId> = data.weaponId;

  if ($isNotNil(nextWeaponId)) {
    const nextWeaponServerObject: Nillable<ServerObject> = registry.simulator.object(nextWeaponId);

    if (isWeapon(nextWeaponServerObject) && nextWeaponServerObject.parent_id === object.id()) {
      const gunObject: Nillable<GameObject> = level.object_by_id(nextWeaponId);

      if (gunObject) {
        return gunObject;
      }
    }
  }

  return null;
}
