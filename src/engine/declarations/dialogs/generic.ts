import { EGameObjectRelation, GameObject } from "xray16/alias";
import { extern, Nillable } from "xray16/lib";
import { $filename, $isNotNil } from "xray16/macros";

import { drugs, TMedkit } from "@/engine/constants/items/drugs";
import { misc } from "@/engine/constants/items/misc";
import { getManager, registry } from "@/engine/core/database";
import { ActorInputManager } from "@/engine/core/managers/actor";
import { EGameEvent, EventsManager } from "@/engine/core/managers/events";
import {
  ENotificationDirection,
  ENotificationType,
  IItemRelocatedNotification,
} from "@/engine/core/managers/notifications/notifications_types";
import { breakObjectDialog, getNpcSpeaker } from "@/engine/core/utils/dialog";
import { actorHasMedKit, getActorAvailableMedKit, getAnyObjectPistol } from "@/engine/core/utils/item";
import { LuaLogger } from "@/engine/core/utils/logging";
import { enableObjectWoundedHealing } from "@/engine/core/utils/object";
import { transferItemsFromActor } from "@/engine/core/utils/reward";

const logger: LuaLogger = new LuaLogger($filename);

logger.info("Resolve and bind dialogs generic");

/**
 * Break dialog for two participating objects.
 */
extern("dialogs.break_dialog", (firstSpeaker: GameObject, secondSpeaker: GameObject): void => {
  breakObjectDialog(getNpcSpeaker(firstSpeaker, secondSpeaker));
});

/**
 * Check if actor has at least one medkit.
 */
extern("dialogs.actor_have_medkit", (): boolean => {
  return actorHasMedKit();
});

/**
 * Check if actor has no medkits.
 */
extern("dialogs.actor_hasnt_medkit", (): boolean => {
  return !actorHasMedKit();
});

/**
 * Transfer medkit for NPC from actor.
 */
extern("dialogs.transfer_medkit", (actor: GameObject, object: GameObject): void => {
  const availableMedkit: Nillable<TMedkit> = getActorAvailableMedKit();

  if (availableMedkit) {
    transferItemsFromActor(getNpcSpeaker(actor, object), availableMedkit);
  }

  registry.simulator.create(
    misc.medkit_script,
    object.position(),
    object.level_vertex_id(),
    object.game_vertex_id(),
    object.id()
  );

  enableObjectWoundedHealing(object);

  if (object.relation(actor) !== EGameObjectRelation.ENEMY) {
    object.set_relation(EGameObjectRelation.FRIEND, actor);
  }

  actor.change_character_reputation(10);
});

/**
 * Check whether actor has at least one bandage.
 */
extern("dialogs.actor_have_bandage", (): boolean => {
  return $isNotNil(registry.actor.object(drugs.bandage));
});

/**
 * Transfer bandage from actor to object and set relation to friendly.
 */
extern("dialogs.transfer_bandage", (actor: GameObject, object: GameObject): void => {
  transferItemsFromActor(object, drugs.bandage);
  object.set_relation(EGameObjectRelation.FRIEND, actor);
});

/**
 * Kill actor on dialog option selection.
 */
extern("dialogs.kill_yourself", (actor: GameObject, object: GameObject): void => {
  actor.kill(object);
});

/**
 * Check if actor has at least 2000 money value.
 */
extern("dialogs.has_2000_money", (actor: GameObject): boolean => {
  return actor.money() >= 2000;
});

/**
 * Transfer pistol from actor to object.
 */
extern("dialogs.transfer_any_pistol_from_actor", (firstSpeaker: GameObject, secondSpeaker: GameObject): void => {
  const pistol: Nillable<GameObject> = getAnyObjectPistol(registry.actor);

  if (pistol) {
    registry.actor.transfer_item(pistol, getNpcSpeaker(firstSpeaker, secondSpeaker));

    EventsManager.emitEvent<IItemRelocatedNotification>(EGameEvent.NOTIFICATION, {
      type: ENotificationType.ITEM,
      direction: ENotificationDirection.OUT,
      itemSection: pistol.section(),
    });
  }
});

/**
 * Checks if actor has any pistol item.
 */
extern("dialogs.have_actor_any_pistol", (): boolean => {
  return $isNotNil(getAnyObjectPistol(registry.actor));
});

/**
 * Disable actor game UI (including torch and night vision).
 */
extern("dialogs.disable_ui", (): void => {
  getManager(ActorInputManager).disableGameUi(false);
});

/**
 * Disable actor game UI only.
 */
extern("dialogs.disable_ui_only", (): void => {
  getManager(ActorInputManager).disableGameUiOnly();
});
