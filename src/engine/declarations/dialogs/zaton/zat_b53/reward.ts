import { GameObject } from "xray16/alias";
import { AnyCallable, extern, getExtern, Nillable } from "xray16/lib";

import { artefacts } from "@/engine/constants/items/artefacts";
import { detectors } from "@/engine/constants/items/detectors";
import { drugs, TDrugItem } from "@/engine/constants/items/drugs";
import { registry } from "@/engine/core/database";
import { EGameEvent, EventsManager } from "@/engine/core/managers/events";
import {
  ENotificationDirection,
  ENotificationType,
  IItemRelocatedNotification,
} from "@/engine/core/managers/notifications/notifications_types";
import { getNpcSpeaker } from "@/engine/core/utils/dialog";
import { actorHasItem } from "@/engine/core/utils/item";
import { transferItemsToActor } from "@/engine/core/utils/reward";

/**
 * Check whether the actor carries an advanced-grade detector.
 *
 * @param firstSpeaker - First participant of the dialog (actor).
 * @param secondSpeaker - Second participant of the dialog (NPC).
 * @returns Whether the actor owns an advanced, elite or scientific detector.
 */
extern(
  "dialogs_zaton.zat_b53_if_actor_has_detector_advanced",
  (firstSpeaker: GameObject, secondSpeaker: GameObject): boolean => {
    return (
      actorHasItem(detectors.detector_advanced) ||
      actorHasItem(detectors.detector_elite) ||
      actorHasItem(detectors.detector_scientific)
    );
  }
);

/**
 * Release one of the actor medkits to the NPC, notify the relocation and raise actor reputation.
 *
 * @param firstSpeaker - First participant of the dialog (actor).
 * @param secondSpeaker - Second participant of the dialog (NPC).
 */
extern("dialogs_zaton.zat_b53_transfer_medkit_to_npc", (firstSpeaker: GameObject, secondSpeaker: GameObject): void => {
  let section: Nillable<TDrugItem> = null;
  const actor: GameObject = registry.actor;

  if (actorHasItem(drugs.medkit)) {
    section = drugs.medkit;
  } else if (actorHasItem(drugs.medkit_army)) {
    section = drugs.medkit_army;
  } else if (actorHasItem(drugs.medkit_scientic)) {
    section = drugs.medkit_scientic;
  }

  if (!section) {
    return;
  }

  registry.simulator.release(registry.simulator.object(actor.object(section)!.id()), true);

  EventsManager.emitEvent<IItemRelocatedNotification>(EGameEvent.NOTIFICATION, {
    type: ENotificationType.ITEM,
    direction: ENotificationDirection.OUT,
    itemSection: section,
    amount: 1,
  });

  actor.change_character_reputation(10);
});

/**
 * Check whether the actor does not carry an advanced-grade detector.
 *
 * @param firstSpeaker - First participant of the dialog (actor).
 * @param secondSpeaker - Second participant of the dialog (NPC).
 * @returns Whether the actor lacks an advanced, elite and scientific detector.
 */
extern(
  "dialogs_zaton.zat_b53_if_actor_hasnt_detector_advanced",
  (firstSpeaker: GameObject, secondSpeaker: GameObject): boolean => {
    return !getExtern<AnyCallable>("zat_b53_if_actor_has_detector_advanced", getExtern("dialogs_zaton"))(
      firstSpeaker,
      secondSpeaker
    );
  }
);

/**
 * Give an advanced detector from the NPC to the actor.
 *
 * @param firstSpeaker - First participant of the dialog (actor).
 * @param secondSpeaker - Second participant of the dialog (NPC).
 */
extern(
  "dialogs_zaton.zat_b53_transfer_detector_advanced_to_actor",
  (firstSpeaker: GameObject, secondSpeaker: GameObject): void => {
    transferItemsToActor(getNpcSpeaker(firstSpeaker, secondSpeaker), detectors.detector_advanced);
  }
);

/**
 * Give the fireball artefact from the NPC to the actor.
 *
 * @param firstSpeaker - First participant of the dialog (actor).
 * @param secondSpeaker - Second participant of the dialog (NPC).
 */
extern(
  "dialogs_zaton.zat_b53_transfer_fireball_to_actor",
  (firstSpeaker: GameObject, secondSpeaker: GameObject): void => {
    transferItemsToActor(getNpcSpeaker(firstSpeaker, secondSpeaker), artefacts.af_fireball);
  }
);

/**
 * Give a medkit from the NPC to the actor.
 *
 * @param firstSpeaker - First participant of the dialog (actor).
 * @param secondSpeaker - Second participant of the dialog (NPC).
 */
extern(
  "dialogs_zaton.zat_b53_transfer_medkit_to_actor",
  (firstSpeaker: GameObject, secondSpeaker: GameObject): void => {
    transferItemsToActor(getNpcSpeaker(firstSpeaker, secondSpeaker), drugs.medkit);
  }
);
