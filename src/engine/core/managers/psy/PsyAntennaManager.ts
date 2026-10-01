import { get_hud, hit, level, sound_object, StaticDrawableWrapper, time_global } from "xray16";
import {
  ESoundObjectType,
  GameHud,
  GameObject,
  Hit,
  NetPacket,
  NetProcessor,
  SoundObject,
  TSoundObjectType,
  Vector,
} from "xray16/alias";
import {
  abort,
  clamp,
  createEmptyVector,
  createVector,
  NIL,
  Nillable,
  TCount,
  TDistance,
  TDuration,
  TName,
  TNumberId,
  TProbability,
  TRate,
  TTimestamp,
  vectorRotateY,
} from "xray16/lib";
import { $filename, $isNil, $isNotNil } from "xray16/macros";

import {
  closeLoadMarker,
  closeSaveMarker,
  disposeManager,
  getManager,
  openSaveMarker,
  registry,
} from "@/engine/core/database";
import { getWeakManager, isManagerInitialized } from "@/engine/core/database/managers";
import { openLoadMarker } from "@/engine/core/database/save_markers";
import { AbstractManager } from "@/engine/core/managers/abstract";
import { EGameEvent, EventsManager } from "@/engine/core/managers/events";
import { PhantomManager } from "@/engine/core/managers/psy/PhantomManager";
import { IPsyPostProcessDescriptor, IPsyZoneEffects } from "@/engine/core/managers/psy/psy_antenna_types";
import { psyAntennaConfig } from "@/engine/core/managers/psy/PsyAntennaConfig";
import { isGameLevelChanging } from "@/engine/core/utils/game";
import { LuaLogger } from "@/engine/core/utils/logging";

const logger: LuaLogger = new LuaLogger($filename);

/**
 * Manager handling psy antenna effects such as psy hits, mumbling sounds, post-process effectors and phantoms.
 * Exists while psy zones need it, so it is saved only when it does.
 */
export class PsyAntennaManager extends AbstractManager {
  /**
   * Load the static psy antenna manager state from the save reader and restore the manager if it was active.
   *
   * @param reader - Net processor to read the manager state from.
   */
  public static load(reader: NetProcessor): void {
    openLoadMarker(reader, PsyAntennaManager.name + "_static");

    if (reader.r_bool()) {
      if (isManagerInitialized(PsyAntennaManager)) {
        abort("PsyAntennaManager already exists!");
      }

      getManager(PsyAntennaManager).load(reader);
    }

    closeLoadMarker(reader, PsyAntennaManager.name + "_static");
  }

  /**
   * Save the static psy antenna manager state to the save packet, marking whether an active manager exists.
   *
   * @param packet - Net packet to write the manager state to.
   */
  public static save(packet: NetPacket): void {
    openSaveMarker(packet, PsyAntennaManager.name + "_static");

    const manager: Nillable<PsyAntennaManager> = getWeakManager(PsyAntennaManager);

    if (manager && !isGameLevelChanging()) {
      packet.w_bool(true);

      manager.save(packet);
    } else {
      packet.w_bool(false);
    }

    closeSaveMarker(packet, PsyAntennaManager.name + "_static");
  }

  /**
   * Dispose the psy antenna manager once the actor goes offline, as its effects belong to the level left.
   */
  public static dispose(): void {
    logger.info("Dispose psy antenna manager");
    disposeManager(PsyAntennaManager);
  }

  public readonly soundObjectRight: SoundObject = new sound_object("anomaly\\psy_voices_1_r");
  public readonly soundObjectLeft: SoundObject = new sound_object("anomaly\\psy_voices_1_l");
  // Game sound volume to restore once the psy effects end.
  public readonly initialSoundVolume: TRate = level.get_snd_volume();

  // Effects added up over the zones the actor is in.
  public zonesCount: TCount = 0;
  public hitIntensity: TRate = 0;
  public soundIntensityBase: TRate = 0;
  public muteSoundThreshold: TRate = 0;
  public phantomSpawnProbability: TProbability = 0;
  public postprocess: LuaTable<TName, IPsyPostProcessDescriptor> = new LuaTable();

  // Effects of the zone entered last.
  public noStatic: boolean = false;
  public noMumble: boolean = false;
  public hitType: TName = "wound";
  public hitFreq: TDuration = 5000;

  // Mumble intensity approaching the one zones add up to.
  public soundIntensity: TRate = 0;
  public isSoundStarted: boolean = false;
  // Last post process effector id taken, kept apart from the active effectors count.
  public postprocessLastId: TNumberId = psyAntennaConfig.POSTPROCESS_BASE_ID;

  public lastHitAt: TTimestamp = 0;
  public lastPhantomRollAt: TTimestamp = 0;
  public phantomRollDelay: TDuration = math.random(
    psyAntennaConfig.PHANTOM_FIRST_IDLE_MIN,
    psyAntennaConfig.PHANTOM_FIRST_IDLE_MAX
  );

  public constructor() {
    super();

    this.soundObjectLeft.volume = 0;
    this.soundObjectRight.volume = 0;
  }

  public override initialize(): void {
    const eventsManager: EventsManager = getManager(EventsManager);

    eventsManager.registerCallback(EGameEvent.ACTOR_UPDATE, this.update, this);
    eventsManager.registerCallback(EGameEvent.ACTOR_GO_OFFLINE, PsyAntennaManager.dispose);
  }

  public override destroy(): void {
    const eventsManager: EventsManager = getManager(EventsManager);

    eventsManager.unregisterCallback(EGameEvent.ACTOR_UPDATE, this.update);
    eventsManager.unregisterCallback(EGameEvent.ACTOR_GO_OFFLINE, PsyAntennaManager.dispose);

    this.soundObjectRight.stop();
    this.soundObjectLeft.stop();

    level.set_snd_volume(this.initialSoundVolume);

    get_hud().enable_fake_indicators(false);
  }

  public override save(packet: NetPacket): void {
    openSaveMarker(packet, PsyAntennaManager.name);

    packet.w_u8(this.zonesCount);
    packet.w_float(this.hitIntensity);
    packet.w_float(this.soundIntensity);
    packet.w_float(this.soundIntensityBase);
    packet.w_float(this.muteSoundThreshold);
    packet.w_float(this.phantomSpawnProbability);
    packet.w_bool(this.noStatic);
    packet.w_bool(this.noMumble);
    packet.w_stringZ(this.hitType);
    packet.w_u32(this.hitFreq);

    packet.w_u8(table.size(this.postprocess));

    for (const [name, postprocess] of this.postprocess) {
      packet.w_stringZ(name);
      packet.w_float(postprocess.intensity);
      packet.w_float(postprocess.intensityBase);
      packet.w_u16(postprocess.id);
    }

    closeSaveMarker(packet, PsyAntennaManager.name);
  }

  public override load(reader: NetProcessor): void {
    openLoadMarker(reader, PsyAntennaManager.name);

    this.zonesCount = reader.r_u8();
    this.hitIntensity = reader.r_float();
    this.soundIntensity = reader.r_float();
    this.soundIntensityBase = reader.r_float();
    this.muteSoundThreshold = reader.r_float();
    this.phantomSpawnProbability = reader.r_float();
    this.noStatic = reader.r_bool();
    this.noMumble = reader.r_bool();
    this.hitType = reader.r_stringZ();
    this.hitFreq = reader.r_u32();

    const count: TCount = reader.r_u8();

    this.postprocess = new LuaTable();
    this.postprocessLastId = psyAntennaConfig.POSTPROCESS_BASE_ID;

    for (const _ of $range(1, count)) {
      const name: TName = reader.r_stringZ();
      const intensity: TRate = reader.r_float();
      const intensityBase: TRate = reader.r_float();
      const id: TNumberId = reader.r_u16();

      this.postprocess.set(name, { intensityBase, intensity, id });
      this.postprocessLastId = math.max(this.postprocessLastId, id);

      level.add_pp_effector(name, id, true);
      level.set_pp_effector_factor(id, intensity);
    }

    closeLoadMarker(reader, PsyAntennaManager.name);
  }

  /**
   * Update psy antenna state on each game tick, advancing sound, post-process and psy hit intensities.
   *
   * @param delta - Time delta since the previous update in milliseconds.
   */
  public override update(delta: TDuration): void {
    this.generatePhantoms();

    if (!this.noMumble) {
      this.soundIntensity = this.getNextIntensity(this.soundIntensityBase, this.soundIntensity, delta);
      this.updateSound();
    }

    for (const [name, postprocess] of this.postprocess) {
      postprocess.intensity = this.getNextIntensity(postprocess.intensityBase, postprocess.intensity, delta);

      if (!this.updatePostprocess(postprocess)) {
        this.postprocess.delete(name);
      }
    }

    this.updatePsyHit(delta);
  }

  /**
   * Update the looped psy voice sounds and global sound volume based on the current sound intensity.
   */
  public updateSound(): void {
    if (!this.isSoundStarted) {
      logger.info("Initialize sounds");

      this.isSoundStarted = true;
      this.soundObjectLeft.play_at_pos(
        registry.actor,
        createVector(-1, 0, 1),
        0,
        (ESoundObjectType.S2D + ESoundObjectType.LOOPED) as TSoundObjectType
      );
      this.soundObjectRight.play_at_pos(
        registry.actor,
        createVector(1, 0, 1),
        0,
        (ESoundObjectType.S2D + ESoundObjectType.LOOPED) as TSoundObjectType
      );
    }

    const volume: TRate = 1 - Math.pow(this.soundIntensity, 3) * 0.9;
    const antennaVolume: TRate = 1 / volume - 1;

    level.set_snd_volume(volume < this.muteSoundThreshold ? this.muteSoundThreshold : volume);

    this.soundObjectLeft.volume = antennaVolume;
    this.soundObjectRight.volume = antennaVolume;
  }

  /**
   * Apply or remove the post-process effector based on its current intensity.
   *
   * @param postprocess - Post-process effector descriptor to update.
   * @returns Whether the effector is still active and should be kept.
   */
  public updatePostprocess(postprocess: IPsyPostProcessDescriptor): boolean {
    if (postprocess.intensity === 0) {
      level.remove_pp_effector(postprocess.id);

      return false;
    } else {
      level.set_pp_effector_factor(postprocess.id, postprocess.intensity, 0.3);

      return true;
    }
  }

  /**
   * Apply periodic psy hits to the actor and toggle the psy danger HUD indicator based on hit intensity.
   *
   * @param delta - Time delta since the previous update in milliseconds.
   */
  public updatePsyHit(delta: TDuration): void {
    const hud: GameHud = get_hud();
    const customStatic: Nillable<StaticDrawableWrapper> = hud.GetCustomStatic("cs_psy_danger");

    if (this.hitIntensity > 0.0001) {
      if ($isNil(customStatic) && !this.noStatic) {
        hud.AddCustomStatic("cs_psy_danger", true);
        hud.GetCustomStatic("cs_psy_danger")!.wnd().TextControl().SetTextST("st_psy_danger");
      }
    } else {
      if ($isNotNil(customStatic)) {
        hud.RemoveCustomStatic("cs_psy_danger");
      }
    }

    if (time_global() - this.lastHitAt > this.hitFreq) {
      this.lastHitAt = time_global();

      const power: number = psyAntennaConfig.HIT_AMPLITUDE * this.hitIntensity;

      if (power > 0.0001) {
        const actor: GameObject = registry.actor;
        const psyHit: Hit = new hit();

        psyHit.power = power;
        psyHit.direction = createEmptyVector();
        psyHit.impulse = 0;
        psyHit.draftsman = actor;

        const hitValue: TRate = (power <= 1 && power) || 1;

        if (this.hitType === "chemical") {
          hud.update_fake_indicators(2, hitValue);
          psyHit.type = hit.chemical_burn;
        } else {
          hud.update_fake_indicators(3, hitValue);
          psyHit.type = hit.telepatic;
        }

        actor.hit(psyHit);

        if (actor.health < 0.0001 && actor.alive()) {
          actor.kill(actor);
        }
      }
    }
  }

  /**
   * Add the effects of a psy zone the actor entered to the ones of the zones they are already in.
   *
   * @param effects - Psy effects of the zone.
   */
  public addZoneEffects(effects: IPsyZoneEffects): void {
    this.zonesCount += 1;
    this.soundIntensityBase += effects.intensity;
    this.muteSoundThreshold += effects.muteSoundThreshold;
    this.hitIntensity += effects.hitIntensity;
    this.phantomSpawnProbability += effects.phantomProb;

    this.noStatic = effects.noStatic;
    this.noMumble = effects.noMumble;
    this.hitType = effects.hitType;
    this.hitFreq = effects.hitFreq;

    get_hud().enable_fake_indicators(true);

    if (effects.postprocess === NIL) {
      return;
    }

    let postprocess: Nillable<IPsyPostProcessDescriptor> = this.postprocess.get(effects.postprocess);

    if ($isNil(postprocess)) {
      this.postprocessLastId += 1;

      postprocess = { intensityBase: 0, intensity: 0, id: this.postprocessLastId };

      this.postprocess.set(effects.postprocess, postprocess);

      level.add_pp_effector(effects.postprocess, postprocess.id, true);
      level.set_pp_effector_factor(postprocess.id, 0.01);
    }

    postprocess.intensityBase += effects.intensity;
  }

  /**
   * Take the effects of a psy zone the actor left away from the ones of the zones they are still in.
   * Post processes fade out and end on their own once no zone keeps them.
   *
   * @param effects - Psy effects of the zone.
   */
  public removeZoneEffects(effects: IPsyZoneEffects): void {
    this.zonesCount -= 1;
    this.soundIntensityBase -= effects.intensity;
    this.muteSoundThreshold -= effects.muteSoundThreshold;
    this.hitIntensity -= effects.hitIntensity;
    this.phantomSpawnProbability -= effects.phantomProb;

    get_hud().enable_fake_indicators(this.zonesCount > 0);

    if (effects.postprocess === NIL) {
      return;
    }

    const postprocess: Nillable<IPsyPostProcessDescriptor> = this.postprocess.get(effects.postprocess);

    if ($isNotNil(postprocess)) {
      postprocess.intensityBase -= effects.intensity;
    }
  }

  /**
   * Spawn phantoms around the actor based on the configured probability and spawn limits once the idle delay passes.
   */
  public generatePhantoms(): void {
    const now: TTimestamp = time_global();

    if (now - this.lastPhantomRollAt > this.phantomRollDelay) {
      logger.info("Generate phantoms");

      this.lastPhantomRollAt = now;
      this.phantomRollDelay = math.random(psyAntennaConfig.PHANTOM_IDLE_MIN, psyAntennaConfig.PHANTOM_IDLE_MAX);

      if (math.random() < this.phantomSpawnProbability) {
        const actor: GameObject = registry.actor;
        const phantomManager: PhantomManager = getManager(PhantomManager);

        if (phantomManager.phantomsCount < psyAntennaConfig.PHANTOM_MAX_COUNT) {
          const radius: TDistance = psyAntennaConfig.PHANTOM_SPAWN_RADIUS * (math.random() * 0.5 + 0.5);
          const angle: TRate = psyAntennaConfig.PHANTOM_FOV * math.random() - psyAntennaConfig.PHANTOM_FOV * 0.5;
          const direction: Vector = vectorRotateY(actor.direction(), angle);

          phantomManager.spawnPhantom(actor.position().add(direction.mul(radius)));
        }
      }
    }
  }

  /**
   * @param target - Intensity the zones add up to.
   * @param current - Current intensity.
   * @param delta - Time delta since the previous update in milliseconds.
   * @returns Current intensity moved towards the target by one inertia step, within 0 and 1.
   */
  protected getNextIntensity(target: TRate, current: TRate, delta: TDuration): TRate {
    const step: TRate = psyAntennaConfig.INTENSITY_INERTIA * delta * 0.01;

    // Within one step of the target, the target is taken at once.
    if (math.abs(target - current) < step) {
      return clamp(target, 0, 1);
    }

    return clamp(target < current ? current - step : current + step, 0, 1);
  }
}
