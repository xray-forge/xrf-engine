import { snd_type, time_global } from "xray16";
import { EGameObjectRelation, GameObject, TSoundType, Vector } from "xray16/alias";
import { Nillable, TNumberId, TRate } from "xray16/lib";

import { registry } from "@/engine/core/database";
import { AbstractSchemeController } from "@/engine/core/schemes/base";
import { combatConfig } from "@/engine/core/schemes/stalker/combat/CombatConfig";
import { ISchemeDangerState } from "@/engine/core/schemes/stalker/danger/danger_types";
import { canObjectSelectAsEnemy } from "@/engine/core/schemes/stalker/danger/utils";
import { isCreature } from "@/engine/core/utils/class_ids";
import { isObjectWounded } from "@/engine/core/utils/planner";
import { sendToVertexIfAccessible } from "@/engine/core/utils/position";
import { isSoundType } from "@/engine/core/utils/sound";

/**
 * Manage danger events.
 */
export class DangerController extends AbstractSchemeController<ISchemeDangerState> {
  /**
   * Enter the danger state when the object hears hostile weapon sounds within reaction range.
   *
   * Todo: Warn squad?
   * Todo: If hear sound and already in danger just extend it?
   * Todo: Adjust sound power to ignore silencers or weak sounds.
   *
   * @param object - Game object that heard the sound.
   * @param whoId - Identifier of the object that produced the sound.
   * @param soundType - Type of the sound that was heard.
   * @param soundPosition - World position the sound originated from.
   * @param soundPower - Power of the heard sound.
   */
  public onHear(
    object: GameObject,
    whoId: TNumberId,
    soundType: TSoundType,
    soundPosition: Vector,
    soundPower: TRate
  ): void {
    // Only weapon sounds can trigger danger state, filter everything else out before doing any lookups.
    // Note: `weapon_bullet_hit` mask includes `weapon` bits, so a single check covers both branches below.
    if (!isSoundType(soundType, snd_type.weapon)) {
      return;
    }

    // Sound has to be within the largest of the reaction distances used below.
    // Weapon sounds carry much further than that, so this cheap check filters most of them out.
    if (object.position().distance_to_sqr(soundPosition) > combatConfig.ALLIES_SHOOTING_ASSIST_DISTANCE_SQR) {
      return;
    }

    // Wounded objects cannot react to danger.
    if (isObjectWounded(object.id())) {
      return;
    }

    // If already in combat.
    if (object.best_enemy()) {
      return;
    }

    const who: Nillable<GameObject> = registry.objects.get(whoId)?.object;

    // If there is no game object 'who' or sound source is not a creature.
    // Artefacts, grenades and physics objects also emit sounds, but cannot be treated as enemies.
    if (!who || !isCreature(who)) {
      return;
    }

    // If object cannot select new enemy, ignore hearing logic.
    if (!canObjectSelectAsEnemy(object, who)) {
      return;
    }

    // Set danger state by hearing weapon bullets.
    if (isSoundType(soundType, snd_type.weapon_bullet_hit) && object.relation(who) === EGameObjectRelation.ENEMY) {
      const isSoundNear: boolean =
        object.position().distance_to_sqr(soundPosition) <= combatConfig.BULLET_REACT_DISTANCE_SQR;

      /**
       * If sound is near:
       *  - If source object is enemy, start warning state.
       */
      if (isSoundNear) {
        this.state.dangerTime = time_global();
        sendToVertexIfAccessible(object, who.level_vertex_id());
      }
    } else {
      // Generic weapon sound, including bullet hits produced by non-enemies.
      const shootingAt: Nillable<GameObject> = who.best_enemy();

      // If hear others shooting at enemy OR enemy shooting in range, try to help
      if (
        ((shootingAt && object.relation(shootingAt) === EGameObjectRelation.ENEMY) ||
          object.relation(who) === EGameObjectRelation.ENEMY) &&
        object.position().distance_to_sqr(soundPosition) <= combatConfig.ALLIES_SHOOTING_ASSIST_DISTANCE_SQR
      ) {
        this.state.dangerTime = time_global();
        sendToVertexIfAccessible(object, who.level_vertex_id());
      }
    }
  }
}
