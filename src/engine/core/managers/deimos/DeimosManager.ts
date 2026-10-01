import { level } from "xray16";
import { NetPacket, NetProcessor } from "xray16/alias";
import { ACTOR_ID, Nillable, TIndex, TName, TRate, TStringId } from "xray16/lib";
import { $isNotNil } from "xray16/macros";

import {
  closeLoadMarker,
  closeSaveMarker,
  getManager,
  openLoadMarker,
  openSaveMarker,
  registry,
} from "@/engine/core/database";
import { AbstractManager } from "@/engine/core/managers/abstract";
import { deimosConfig } from "@/engine/core/managers/deimos/DeimosConfig";
import { SoundManager } from "@/engine/core/managers/sounds";
import { ISchemeDeimosState } from "@/engine/core/schemes/restrictor/sr_deimos/sr_deimos_types";
import { getSchemeStateByKeyOptimistic } from "@/engine/core/schemes/state";
import { EScheme } from "@/engine/core/schemes/types";
import { isBlackScreen } from "@/engine/core/utils/game";

/**
 * Owns the player-facing Deimos effects and their persisted intensity.
 *
 * Restrictor controllers own the per-zone configuration, phase, and section switching; this manager is the only
 * Deimos component that knows about the actor, screen effectors, or looped sounds.
 */
export class DeimosManager extends AbstractManager {
  private restoredIntensity: Nillable<TRate> = null;

  /**
   * Persist whether a Deimos restrictor is active and its current intensity.
   *
   * @param packet - Net packet to write the manager state to.
   */
  public override save(packet: NetPacket): void {
    openSaveMarker(packet, DeimosManager.name);

    for (const [, zone] of registry.zones) {
      const state = registry.objects.get(zone.id());

      if (state.activeScheme === EScheme.SR_DEIMOS) {
        packet.w_bool(true);
        packet.w_float(getSchemeStateByKeyOptimistic<ISchemeDeimosState>(state, EScheme.SR_DEIMOS).intensity);
        closeSaveMarker(packet, DeimosManager.name);

        return;
      }
    }

    packet.w_bool(false);

    closeSaveMarker(packet, DeimosManager.name);
  }

  public override load(reader: NetProcessor): void {
    openLoadMarker(reader, DeimosManager.name);

    this.restoredIntensity = reader.r_bool() ? reader.r_float() : null;

    closeLoadMarker(reader, DeimosManager.name);
  }

  /**
   * @returns Whether it is valid to update Deimos gameplay and screen effects now.
   */
  public canUpdate(): boolean {
    return $isNotNil(registry.actor) && !isBlackScreen();
  }

  /**
   * @returns Current actor movement speed.
   */
  public getActorMovementSpeed(): TRate {
    return registry.actor.get_movement_speed().magnitude();
  }

  /**
   * Consume intensity restored from the most recent game load.
   *
   * @returns Restored intensity, or `null` after it has been consumed or when no active Deimos state was saved.
   */
  public consumeRestoredIntensity(): Nillable<TRate> {
    const intensity: Nillable<TRate> = this.restoredIntensity;

    this.restoredIntensity = null;

    return intensity;
  }

  /**
   * Start primary post-process and noise effects.
   *
   * @param postProcess - Primary post-process effector name without the `.ppe` extension.
   * @param noiseSound - Looped noise sound section to play for the actor.
   */
  public startPrimaryEffects(postProcess: TStringId, noiseSound: TName): void {
    level.add_pp_effector(`${postProcess}.ppe`, deimosConfig.POST_PROCESS_EFFECTOR_ID, true);
    getManager(SoundManager).playLooped(ACTOR_ID, noiseSound);
  }

  /**
   * Start heartbeat looped sound effect.
   *
   * @param heartbeatSound - Looped heartbeat sound section to play for the actor.
   */
  public startHeartbeat(heartbeatSound: TName): void {
    getManager(SoundManager).playLooped(ACTOR_ID, heartbeatSound);
  }

  /**
   * Update active Deimos effect strengths.
   *
   * @param phase - Current Deimos phase, which determines whether heartbeat volume is updated.
   * @param intensity - Current normalized Deimos intensity.
   * @param noiseSound - Looped noise sound section whose volume is updated.
   * @param heartbeatSound - Looped heartbeat sound section whose volume is updated in phase two.
   */
  public updateEffectStrengths(phase: TIndex, intensity: TRate, noiseSound: TName, heartbeatSound: TName): void {
    const soundManager: SoundManager = getManager(SoundManager);

    level.set_pp_effector_factor(deimosConfig.POST_PROCESS_EFFECTOR_ID, intensity);
    soundManager.setLoopedSoundVolume(ACTOR_ID, noiseSound, intensity);

    if (phase > 1) {
      soundManager.setLoopedSoundVolume(ACTOR_ID, heartbeatSound, intensity);
    }
  }

  /**
   * Play high-intensity effects and apply its health loss to the actor.
   *
   * @param cameraEffector - Camera effector name without its path or `.anm` extension.
   * @param postProcess - Secondary post-process effector name without the `.ppe` extension.
   * @param healthLost - Health delta applied to the actor by the engine's delta-style health setter.
   */
  public triggerHighIntensityEffects(cameraEffector: TStringId, postProcess: TStringId, healthLost: TRate): void {
    level.add_cam_effector(`camera_effects\\${cameraEffector}.anm`, deimosConfig.CAMERA_EFFECTOR_ID, false, "");
    level.add_pp_effector(`${postProcess}.ppe`, deimosConfig.POST_PROCESS_EFFECTOR_SECONDARY_ID, false);
    registry.actor.health = -healthLost;
  }

  /**
   * Stop primary effects.
   *
   * @param noiseSound - Looped noise sound section to stop for the actor.
   */
  public stopPrimaryEffects(noiseSound: TName): void {
    getManager(SoundManager).stopLooped(ACTOR_ID, noiseSound);
    level.remove_pp_effector(deimosConfig.POST_PROCESS_EFFECTOR_ID);
  }

  /**
   * Stop heartbeat effect.
   *
   * @param heartbeatSound - Looped heartbeat sound section to stop for the actor.
   */
  public stopHeartbeat(heartbeatSound: TName): void {
    getManager(SoundManager).stopLooped(ACTOR_ID, heartbeatSound);
  }

  /**
   * Remove secondary camera and post-process effects.
   */
  public removeSecondaryEffects(): void {
    level.remove_cam_effector(deimosConfig.CAMERA_EFFECTOR_ID);
    level.remove_pp_effector(deimosConfig.POST_PROCESS_EFFECTOR_SECONDARY_ID);
  }
}
