import { GameObject } from "xray16/alias";
import { abort, assert, extern, Nillable, TSection } from "xray16/lib";
import { $filename } from "xray16/macros";

import { registry } from "@/engine/core/database";
import { EGameEvent, EventsManager } from "@/engine/core/managers/events";
import {
  ENotificationDirection,
  ENotificationType,
  IItemRelocatedNotification,
} from "@/engine/core/managers/notifications/notifications_types";
import { LuaLogger } from "@/engine/core/utils/logging";

export const logger: LuaLogger = new LuaLogger($filename);

/**
 * Remove item from actor inventory based on provided section parameter.
 */
extern("xr_effects.remove_item", (actor: GameObject, __: GameObject, [section]: [Nillable<TSection>]): void => {
  logger.info("Remove item");

  assert(section, "Wrong parameters in function 'remove_item'.");

  const inventoryItem: Nillable<GameObject> = actor.object(section);

  if (inventoryItem) {
    registry.simulator.release(registry.simulator.object(inventoryItem.id()), true);

    EventsManager.emitEvent<IItemRelocatedNotification>(EGameEvent.NOTIFICATION, {
      type: ENotificationType.ITEM,
      direction: ENotificationDirection.OUT,
      itemSection: section,
    });
  } else {
    abort(`Actor has no item to remove with section '${section}'.`);
  }
});
