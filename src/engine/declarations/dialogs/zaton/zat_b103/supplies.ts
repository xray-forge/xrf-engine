import { GameObject } from "xray16/alias";
import { extern, LuaArray, TCount } from "xray16/lib";
import { $fromArray } from "xray16/macros";

import { food, TFoodItem } from "@/engine/constants/items/food";
import { misc } from "@/engine/constants/items/misc";
import { registry } from "@/engine/core/database";
import { EGameEvent, EventsManager } from "@/engine/core/managers/events";
import {
  ENotificationDirection,
  ENotificationType,
  IItemRelocatedNotification,
} from "@/engine/core/managers/notifications/notifications_types";
import { getNpcSpeaker } from "@/engine/core/utils/dialog";
import { transferItemsFromActor } from "@/engine/core/utils/reward";

/**
 * Transfer up to six food items from the actor to the NPC and notify about each relocation.
 *
 * @param firstSpeaker - First participant of the dialog (actor).
 * @param secondSpeaker - Second participant of the dialog (NPC).
 */
extern("dialogs_zaton.zat_b103_transfer_merc_supplies", (firstSpeaker: GameObject, secondSpeaker: GameObject): void => {
  const object: GameObject = getNpcSpeaker(firstSpeaker, secondSpeaker);
  const actor: GameObject = registry.actor;
  let it: TCount = 6;

  const itemSections: LuaArray<TFoodItem> = $fromArray<TFoodItem>([food.conserva, food.kolbasa, food.bread]);

  for (const [_k, section] of itemSections) {
    const j: TCount = it;

    actor.iterate_inventory((temp, item) => {
      if (item.section() === section && it !== 0) {
        actor.transfer_item(item, object);
        it = it - 1;
      }
    }, actor);

    if (j - it !== 0) {
      EventsManager.emitEvent<IItemRelocatedNotification>(EGameEvent.NOTIFICATION, {
        type: ENotificationType.ITEM,
        direction: ENotificationDirection.OUT,
        itemSection: section,
        amount: j - it,
      });
    }
  }
});

/**
 * Transfer the second mechanic toolkit from the actor to the dialog NPC.
 *
 * @param firstSpeaker - First participant of the dialog (actor).
 * @param secondSpeaker - Second participant of the dialog (NPC).
 */
extern(
  "dialogs_zaton.zat_b103_transfer_mechanic_toolkit_2",
  (firstSpeaker: GameObject, secondSpeaker: GameObject): void => {
    transferItemsFromActor(getNpcSpeaker(firstSpeaker, secondSpeaker), misc.toolkit_2);
  }
);

/**
 * Check whether the actor carries at least six of the requested food items.
 *
 * @param firstSpeaker - First participant of the dialog (actor).
 * @param secondSpeaker - Second participant of the dialog (NPC).
 * @returns Whether the actor owns six or more bread, kolbasa and conserva combined.
 */
extern(
  "dialogs_zaton.zat_b103_actor_has_needed_food",
  (firstSpeaker: GameObject, secondSpeaker: GameObject): boolean => {
    const actor: GameObject = registry.actor;
    const itemSections: LuaArray<TFoodItem> = $fromArray<TFoodItem>([food.bread, food.kolbasa, food.conserva]);

    let count: TCount = 0;

    for (const [_, itemSection] of itemSections) {
      registry.actor.iterate_inventory((_temp, item) => {
        if (item.section() === itemSection) {
          count = count + 1;
        }
      }, actor);
    }

    return count >= 6;
  }
);
