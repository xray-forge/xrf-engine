import { GameObject } from "xray16/alias";
import { AnyCallable, extern, getExtern, LuaArray, TCount } from "xray16/lib";
import { $fromArray, $isNotNil } from "xray16/macros";

import { infoPortions, TInfoPortion } from "@/engine/constants/info_portions/info_portions";
import { questItems } from "@/engine/constants/items/quest_items";
import { registry } from "@/engine/core/database";
import { getNpcSpeaker } from "@/engine/core/utils/dialog";
import { hasInfoPortion } from "@/engine/core/utils/info_portion";
import { transferItemsFromActor, transferMoneyFromActor } from "@/engine/core/utils/reward";

/**
 * Descending money amounts paid for the b9 blackbox: the first with no materials brought, then one per counter.
 */
const moneyCountTable: LuaArray<TCount> = $fromArray([3000, 2850, 2700, 2550, 2400, 2250, 2100, 1950, 1800, 1650]);

const techMaterialsBroughtInfoPortions: LuaArray<TInfoPortion> = $fromArray<TInfoPortion>([
  infoPortions.jup_b200_tech_materials_brought_counter_1,
  infoPortions.jup_b200_tech_materials_brought_counter_2,
  infoPortions.jup_b200_tech_materials_brought_counter_3,
  infoPortions.jup_b200_tech_materials_brought_counter_4,
  infoPortions.jup_b200_tech_materials_brought_counter_5,
  infoPortions.jup_b200_tech_materials_brought_counter_6,
  infoPortions.jup_b200_tech_materials_brought_counter_7,
  infoPortions.jup_b200_tech_materials_brought_counter_8,
  infoPortions.jup_b200_tech_materials_brought_counter_9,
]);

/**
 * @returns Price of the b9 blackbox records, lowered by each batch of materials brought for b200.
 */
function getBlackboxPrice(): TCount {
  let price: TCount = moneyCountTable.get(1);

  for (const it of $range(1, 9)) {
    if (hasInfoPortion(techMaterialsBroughtInfoPortions.get(it))) {
      price = moneyCountTable.get(it + 1);
    }
  }

  return price;
}

/**
 * Check whether the actor has enough money for the b9 blackbox, scaled by the brought-materials counter.
 *
 * @param _ - Actor participating in the dialog, unused.
 * @param __ - NPC participating in the dialog, unused.
 * @returns Whether the actor can pay for the blackbox.
 */
extern("dialogs_jupiter.jup_b9_actor_has_money", (_: GameObject, __: GameObject): boolean => {
  return registry.actor.money() >= getBlackboxPrice();
});

/**
 * Take the b9 blackbox payment from the actor, scaled by the brought-materials counter.
 *
 * @param firstSpeaker - Actor participating in the dialog.
 * @param secondSpeaker - NPC participating in the dialog.
 */
extern("dialogs_jupiter.jupiter_b9_relocate_money", (firstSpeaker: GameObject, secondSpeaker: GameObject): void => {
  transferMoneyFromActor(getNpcSpeaker(firstSpeaker, secondSpeaker), getBlackboxPrice());
});

/**
 * Transfer the b9 blackbox from the actor to the NPC speaker.
 *
 * @param firstSpeaker - Actor participating in the dialog.
 * @param secondSpeaker - NPC participating in the dialog.
 */
extern("dialogs_jupiter.give_jup_b9_blackbox", (firstSpeaker: GameObject, secondSpeaker: GameObject): void => {
  transferItemsFromActor(getNpcSpeaker(firstSpeaker, secondSpeaker), questItems.jup_b9_blackbox);
});

/**
 * Check whether the actor cannot afford the b9 blackbox.
 *
 * @param firstSpeaker - Actor participating in the dialog.
 * @param secondSpeaker - NPC participating in the dialog.
 * @returns Whether the actor lacks the required money.
 */
extern("dialogs_jupiter.jup_b9_actor_has_not_money", (firstSpeaker: GameObject, secondSpeaker: GameObject): boolean => {
  return !getExtern<AnyCallable>("jup_b9_actor_has_money", getExtern("dialogs_jupiter"))(firstSpeaker, secondSpeaker);
});

/**
 * Check whether the actor has the b9 blackbox.
 *
 * @param _ - Actor participating in the dialog, unused.
 * @param __ - NPC participating in the dialog, unused.
 * @returns Whether the actor has the blackbox.
 */
extern("dialogs_jupiter.if_actor_has_jup_b9_blackbox", (_: GameObject, __: GameObject): boolean => {
  return $isNotNil(registry.actor.object(questItems.jup_b9_blackbox));
});
