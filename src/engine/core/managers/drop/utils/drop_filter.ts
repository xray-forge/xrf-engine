import { AlifeSimulator, GameObject, IniFile } from "xray16/alias";
import { Nillable, TSection } from "xray16/lib";

import { misc } from "@/engine/constants/items/misc";
import { registry } from "@/engine/core/database";
import { dropConfig } from "@/engine/core/managers/drop/DropConfig";
import { isArtefact, isGrenade, isWeapon } from "@/engine/core/utils/class_ids";
import { setItemCondition } from "@/engine/core/utils/item";
import { isAmmoSection, isExcludedFromLootDropItemSection, isLootableItemSection } from "@/engine/core/utils/section";

/**
 * Iterate over object inventory and release items.
 *
 * @param object - Game object to filter inventory items after death.
 */
export function filterObjectDeathLoot(object: GameObject): void {
  const simulator: AlifeSimulator = registry.simulator;
  const ini: Nillable<IniFile> = object.spawn_ini();
  // Objects marked to keep their items, like the jup_b10 drunk whose death effect spawns his loot.
  const isKeepingItems: boolean = ini?.section_exist("keep_items") === true;

  object.iterate_inventory((object: GameObject, item: GameObject): void => {
    // Kept items still lose the equipment excluded from loot, as in vanilla.
    if (isKeepingItems) {
      if (isExcludedFromLootDropItemSection(item.section())) {
        simulator.release(simulator.object(item.id()), true);
      }

      return;
    }

    if (shouldFilterLootItem(item)) {
      simulator.release(simulator.object(item.id()), true);
    } else {
      // Apply weapon post-death drop degradation.
      if (isWeapon(item) && !isGrenade(item)) {
        setItemCondition(
          item,
          math.random(dropConfig.DROPPED_WEAPON_STATE_DEGRADATION.MIN, dropConfig.DROPPED_WEAPON_STATE_DEGRADATION.MAX)
        );
      }
    }
  }, object);
}

/**
 * Filter object item and verify that it can be dropped.
 *
 * @param item - Item game object to check availability in drop.
 * @returns Whether provided item should be filtered from loot.
 */
export function shouldFilterLootItem(item: GameObject): boolean {
  const section: TSection = item.section();

  if (isExcludedFromLootDropItemSection(section)) {
    return true;
  }

  if (section === misc.bolt) {
    return false;
  }

  if (dropConfig.ITEMS_KEEP.has(section)) {
    return false;
  }

  if (isArtefact(item)) {
    return false;
  }

  if (isWeapon(item)) {
    return false;
  }

  if (isLootableItemSection(section) && !isAmmoSection(section)) {
    return false;
  }

  return true;
}
