import { AlifeSimulator, GameObject, IniFile } from "xray16/alias";
import { Nillable, TSection } from "xray16/lib";

import { misc } from "@/engine/constants/items/misc";
import { registry, SYSTEM_INI } from "@/engine/core/database";
import { parseStringsList } from "@/engine/core/ini/ini_parse";
import { readIniString } from "@/engine/core/ini/ini_read";
import { dropConfig } from "@/engine/core/managers/drop/DropConfig";
import { isArtefact, isGrenade, isWeapon } from "@/engine/core/utils/class_ids";
import { setItemCondition } from "@/engine/core/utils/item";
import { isAmmoSection, isExcludedFromLootDropItemSection, isLootableItemSection } from "@/engine/core/utils/section";

/**
 * @param object - Dying stalker.
 * @returns Ammo sections the weapon in its hands takes, which the engine destroys in its inventory after death.
 */
export function getHeldWeaponAmmoSections(object: GameObject): LuaTable<TSection, boolean> {
  const sections: LuaTable<TSection, boolean> = new LuaTable();
  const item: Nillable<GameObject> = object.active_item();

  if (item && isWeapon(item)) {
    for (const [, section] of parseStringsList(
      readIniString(SYSTEM_INI, item.section(), "ammo_class", false, null, "")
    )) {
      sections.set(section, true);
    }
  }

  return sections;
}

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
  // Released twice otherwise, as `CAI_Stalker::Die` destroys this ammo once death callbacks return.
  const engineDestroyedAmmo: LuaTable<TSection, boolean> = getHeldWeaponAmmoSections(object);

  object.iterate_inventory((object: GameObject, item: GameObject): void => {
    if (engineDestroyedAmmo.has(item.section())) {
      return;
    }

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
