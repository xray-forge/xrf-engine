import { FS, game, get_hud, getFS, snd_type, sound_object, stalker_ids, time_global } from "xray16";
import { GameObject, IniFile, NetPacket, NetProcessor, SoundObject } from "xray16/alias";
import {
  abort,
  LuaArray,
  NIL,
  Nillable,
  TCount,
  TDuration,
  TIndex,
  TLabel,
  TName,
  TNumberId,
  TPath,
  TSection,
  TTimestamp,
  ZERO_VECTOR,
} from "xray16/lib";
import { $filename, $isNil, $isNotNil } from "xray16/macros";

import { communities, TCommunity } from "@/engine/constants/communities";
import { roots } from "@/engine/constants/roots";
import { IRegistryObjectState, registry } from "@/engine/core/database";
import { readIniBoolean, readIniNumber, readIniNumberList, readIniString, readIniStringSet } from "@/engine/core/ini";
import { EGameEvent, EventsManager } from "@/engine/core/managers/events";
import { ENotificationType, ISoundNotification } from "@/engine/core/managers/notifications/notifications_types";
import { AbstractPlayableSound } from "@/engine/core/managers/sounds/objects/AbstractPlayableSound";
import { EPlayableSound, ESoundPlaylistType } from "@/engine/core/managers/sounds/sounds_types";
import { getActiveSchemeState } from "@/engine/core/schemes/state";
import { getObjectCommunity } from "@/engine/core/utils/community";
import { LuaLogger } from "@/engine/core/utils/logging";

const logger: LuaLogger = new LuaLogger($filename);

export interface INpcSoundDescriptor {
  id: TNumberId;
  max: TCount;
}

export interface INpcSoundPlayback {
  idleTime: Nillable<TDuration>;
  pdaSoundObject: Nillable<SoundObject>;
  playedSoundIndex: Nillable<TIndex>;
  playingStartedAt: Nillable<TTimestamp>;
}

/**
 * Playable sound voiced by NPC game objects, supporting per-object and group playback.
 */
export class NpcSound extends AbstractPlayableSound {
  public static readonly AVAILABLE_COMMUNITIES_ALL: string = string.format(
    "%s, %s, %s, %s, %s, %s, %s, %s, %s",
    communities.stalker,
    communities.ecolog,
    communities.bandit,
    communities.dolg,
    communities.freedom,
    communities.army,
    communities.zombied,
    communities.monolith,
    communities.killer
  );

  public static baseIndex: TIndex = stalker_ids.sound_script + 10_000;
  public static readonly type: EPlayableSound = EPlayableSound.NPC;

  /**
   * Increment and return the next globally unique NPC sound index.
   *
   * @returns Next available NPC sound base index.
   */
  public static getNextId(): TIndex {
    NpcSound.baseIndex += 1;

    return NpcSound.baseIndex;
  }

  public override readonly type: EPlayableSound = NpcSound.type;

  public readonly prefix: boolean;
  public readonly isCombatSound: boolean;
  public readonly isGroupSound: boolean;

  public readonly canPlaySound: LuaTable<TNumberId, boolean> = new LuaTable();
  public readonly objects: LuaTable<TNumberId, INpcSoundDescriptor> = new LuaTable();
  public readonly availableCommunities: LuaTable<TCommunity, boolean> = new LuaTable();
  public readonly playback: LuaTable<TNumberId, INpcSoundPlayback> = new LuaTable();
  public readonly soundPaths: LuaTable<TNumberId, LuaArray<TPath>> = new LuaTable();
  // Paths resolved once per unique `prefix + path` key and shared by reference across objects, empty lists included.
  public readonly resolvedSoundPaths: LuaMap<TPath, LuaArray<TPath>> = new LuaTable();

  public readonly shuffle: ESoundPlaylistType;

  public canPlayGroupSound: boolean = true;
  public groupPlayback: INpcSoundPlayback = {
    idleTime: null,
    pdaSoundObject: null,
    playedSoundIndex: null,
    playingStartedAt: null,
  };

  public readonly minIdle: TDuration;
  public readonly maxIdle: TDuration;
  public readonly delay: TDuration;
  public readonly random: number;

  public constructor(ini: IniFile, section: TSection) {
    super(ini, section);

    this.prefix = readIniBoolean(ini, section, "npc_prefix", false, false);
    this.shuffle = readIniString(ini, section, "shuffle", false, null, ESoundPlaylistType.RANDOM) as ESoundPlaylistType;
    this.isGroupSound = readIniBoolean(ini, section, "group_snd", false, false);
    this.shouldPlayAlways = readIniBoolean(ini, section, "play_always", false, false);
    this.isCombatSound = readIniBoolean(ini, section, "is_combat_sound", false, false);
    this.delay = readIniNumber(ini, section, "delay_sound", false, 0);

    const idle: LuaArray<TDuration> = readIniNumberList(ini, section, "idle", false, "3,5,100");

    this.minIdle = idle.get(1);
    this.maxIdle = idle.get(2);
    this.random = idle.get(3);

    this.availableCommunities = readIniStringSet(
      ini,
      section,
      "avail_communities",
      false,
      NpcSound.AVAILABLE_COMMUNITIES_ALL
    );
  }

  /**
   * Reset the sound playback state for the object and stop any active PDA sound.
   *
   * @param objectId - Identifier of the object to reset the sound state for.
   */
  public override reset(objectId: TNumberId): void {
    const object: Nillable<GameObject> = registry.objects.get(objectId)?.object as Nillable<GameObject>;
    const playback: INpcSoundPlayback = this.getPlayback(objectId);

    playback.playingStartedAt = null;
    playback.playedSoundIndex = null;

    if (this.isGroupSound) {
      this.canPlayGroupSound = true;
    }

    this.canPlaySound.set(objectId, true);

    if (object) {
      object.set_sound_mask(-1);
      object.set_sound_mask(0);
    }

    if (playback.pdaSoundObject) {
      playback.pdaSoundObject.stop();
      playback.pdaSoundObject = null;
    }
  }

  /**
   * Check whether the object is currently voicing a sound or playing a PDA sound.
   *
   * @param objectId - Identifier of the object to check.
   * @returns Whether the object has an active sound or a playing PDA sound.
   */
  public override isPlaying(objectId: TNumberId): boolean {
    const object: Nillable<GameObject> = registry.objects.get(objectId)?.object;
    const playback: Nillable<INpcSoundPlayback> = this.playback.get(objectId);

    if ($isNil(object)) {
      return false;
    }

    return object.active_sound_count() !== 0 || playback?.pdaSoundObject?.playing() === true;
  }

  /**
   * Select and play the next NPC sound for the object, optionally play a PDA sound and emit a notification.
   *
   * @param objectId - Identifier of the object to play the sound for.
   * @param faction - Faction the sound notification shows the speaker of, the speaker community when missing.
   * @param point - Smart terrain ID or translatable label the sound notification shows the speaker at.
   * @returns Whether a sound started playing.
   */
  public play(objectId: TNumberId, faction?: Nillable<TName>, point?: Nillable<TName | TNumberId>): boolean {
    const object: Nillable<GameObject> = registry.objects.get(objectId)?.object;

    if ($isNil(object)) {
      return false;
    }

    // Sounds are registered lazily on first play request instead of eager net_spawn initialization.
    // Community mismatch mirrors the eager variant where such objects were never registered.
    if (!this.objects.has(objectId)) {
      if (!this.availableCommunities.has(getObjectCommunity(object))) {
        return false;
      }

      this.initializeObject(object);
    }

    const playback: INpcSoundPlayback = this.getPlayback(objectId);

    if (this.isGroupSound) {
      if (!this.canPlayGroupSound) {
        return false;
      }
    } else {
      if (!this.canPlaySound.get(objectId)) {
        return false;
      }
    }

    // Wait for previous sound finish
    if ($isNotNil(playback.playingStartedAt) && time_global() - playback.playingStartedAt < playback.idleTime!) {
      return false;
    }

    logger.info("Play NPC sound for: '%s', '%s', '%s'", object.name(), faction, point);

    playback.playingStartedAt = null;

    const objectDescriptor: Nillable<INpcSoundDescriptor> = this.objects.get(objectId);

    if (!objectDescriptor) {
      return false;
    }

    playback.playedSoundIndex = this.selectNextSound(objectId);

    if (playback.playedSoundIndex === -1) {
      return false;
    }

    object.play_sound(objectDescriptor.id, this.delay + 0.06, this.delay + 0.05, 1, 0, playback.playedSoundIndex);

    const nextIndex: TIndex = playback.playedSoundIndex + 1;
    const soundPath: TPath = this.soundPaths.get(objectId).get(nextIndex);
    const fs: FS = getFS();

    if (
      soundPath &&
      fs.exist(roots.gameSounds, soundPath + "_pda.ogg") &&
      object.position().distance_to_sqr(registry.actor.position()) >= 100
    ) {
      if (playback.pdaSoundObject && playback.pdaSoundObject.playing()) {
        playback.pdaSoundObject.stop();
      }

      playback.pdaSoundObject = new sound_object(soundPath + "_pda");
      playback.pdaSoundObject.play_at_pos(registry.actor, ZERO_VECTOR, this.delay, sound_object.s2d);
      playback.pdaSoundObject.volume = 0.8;
    }

    const [soundCaption] = string.gsub(soundPath, "\\", "_");

    if (this.isGroupSound) {
      this.canPlayGroupSound = false;
    } else {
      this.canPlaySound.set(objectId, false);
    }

    if (game.translate_string(soundCaption) !== soundCaption) {
      if (!faction) {
        faction = getObjectCommunity(object);
      }

      // Attempt to auto-translate object goal.
      if (!point) {
        point = object.profile_name() + "_name";
        if (game.translate_string(point) === point) {
          point = null;
        }
      }

      EventsManager.emitEvent<ISoundNotification>(EGameEvent.NOTIFICATION, {
        type: ENotificationType.SOUND,
        object,
        faction,
        point,
        soundPath,
        soundCaption,
        delay: this.delay,
      });
    } else {
      EventsManager.emitEvent<ISoundNotification>(EGameEvent.NOTIFICATION, {
        type: ENotificationType.SOUND,
        object,
        faction,
        point,
        soundPath,
        delay: this.delay,
      });
    }

    return true;
  }

  /**
   * Stop the object sound and any active PDA sound.
   *
   * @param objectId - Identifier of the object to stop the sound for.
   */
  public override stop(objectId: TNumberId): void {
    const object: Nillable<GameObject> = registry.objects.get(objectId)?.object;
    const playback: Nillable<INpcSoundPlayback> = this.playback.get(objectId);

    if (object && object.alive()) {
      object.set_sound_mask(-1);
      object.set_sound_mask(0);
    }

    if (playback?.pdaSoundObject?.playing()) {
      playback.pdaSoundObject.stop();
    }

    this.playback.delete(objectId);

    if (this.isGroupSound) {
      this.canPlayGroupSound = true;
    } else {
      this.canPlaySound.set(objectId, true);
    }
  }

  /**
   * Handle the end of sound playback by scheduling the next idle delay and firing scheme signals.
   *
   * @param objectId - Identifier of the object whose sound playback ended.
   */
  public override onSoundPlayEnded(objectId: TNumberId): void {
    const playback: INpcSoundPlayback = this.getPlayback(objectId);

    logger.info(
      "Sound play ended: %s %s %s",
      objectId,
      playback.playedSoundIndex,
      this.soundPaths.get(objectId)?.get(playback.playedSoundIndex as TIndex)
    );

    playback.playingStartedAt = time_global();
    playback.idleTime = math.random(this.minIdle, this.maxIdle) * 1000;

    get_hud().RemoveCustomStatic("cs_subtitles_npc");

    if (this.isGroupSound) {
      this.canPlayGroupSound = true;
    } else {
      this.canPlaySound.set(objectId, true);
    }

    const state: Nillable<IRegistryObjectState> = registry.objects.get(objectId);

    const signals: Nillable<LuaTable<TName, boolean>> = getActiveSchemeState(state)?.signals;

    if (!signals || !this.objects.get(objectId)) {
      return;
    }

    // Fire scheme signals.
    if (playback.playedSoundIndex === this.objects.get(objectId).max && this.shuffle !== "rnd") {
      logger.info("Emit sound end signal: %s", state.object.name());
      signals.set("theme_end", true);
      signals.set("sound_end", true);
    } else {
      logger.info("Emit sound end signal: %s", state.object.name());
      signals.set("sound_end", true);
    }
  }

  /**
   * Save the played sound index and group playback flag to the save packet.
   *
   * @param packet - Net packet to write the sound state into.
   */
  public override save(packet: NetPacket): void {
    packet.w_stringZ(tostring(this.isGroupSound ? this.groupPlayback.playedSoundIndex : NIL));

    if (this.isGroupSound) {
      packet.w_bool(this.canPlayGroupSound);
    }
  }

  /**
   * Load the played sound index and group playback flag from the save reader.
   *
   * @param reader - Net processor to read the sound state from.
   */
  public override load(reader: NetProcessor): void {
    const id: string = reader.r_stringZ();

    if (this.isGroupSound) {
      this.groupPlayback.playedSoundIndex = id === NIL ? null : tonumber(id)!;
      this.canPlayGroupSound = reader.r_bool();
    }
  }

  /**
   * Save the per-object playback availability flag for non-group sounds.
   *
   * @param packet - Net packet to write the per-object sound state into.
   * @param object - Game object whose sound state is being saved.
   */
  public override saveObject(packet: NetPacket, object: GameObject): void {
    if (!this.isGroupSound) {
      packet.w_bool(this.canPlaySound.get(object.id()) === true);
    }
  }

  /**
   * Load the per-object playback availability flag for non-group sounds.
   *
   * @param reader - Net processor to read the per-object sound state from.
   * @param object - Game object whose sound state is being loaded.
   */
  public override loadObject(reader: NetProcessor, object: GameObject): void {
    if (!this.isGroupSound) {
      this.canPlaySound.set(object.id(), reader.r_bool());
    }
  }

  /**
   * Register the sound files for the object and collect their playable paths and count.
   *
   * Note: Performance heavy method, called lazily on first play request for the object.
   *
   * @param object - Game object to initialize the NPC sound for.
   */
  public initializeObject(object: GameObject): void {
    const objectId: TNumberId = object.id();
    const objectDescriptor: INpcSoundDescriptor = {
      id: NpcSound.getNextId(),
      max: 0,
    };

    this.objects.set(objectId, objectDescriptor);

    let characterPrefix: string = "";

    if (!this.prefix) {
      characterPrefix = object.sound_prefix();
      object.sound_prefix("characters_voice\\");
    }

    // Register current sounds object as combat/regular sound for target game object.
    objectDescriptor.max = this.isCombatSound
      ? object.add_combat_sound(this.path, 64, snd_type.talk, 2, 1, objectDescriptor.id, "bip01_head") - 1
      : object.add_sound(this.path, 64, snd_type.talk, 2, 1, objectDescriptor.id) - 1;

    const objectSoundPrefix: TLabel = object.sound_prefix();
    const resolvedKey: TPath = objectSoundPrefix + this.path;

    let resolvedPaths: Nillable<LuaArray<TPath>> = this.resolvedSoundPaths.get(resolvedKey);

    if ($isNil(resolvedPaths)) {
      const fs: FS = getFS();

      resolvedPaths = new LuaTable();

      if ($isNotNil(fs.exist(roots.gameSounds, `${resolvedKey}.ogg`))) {
        resolvedPaths.set(1, resolvedKey);
      } else {
        let index: TIndex = 1;

        while (fs.exist(roots.gameSounds, `${resolvedKey}${index}.ogg`)) {
          resolvedPaths.set(index, resolvedKey + index);
          index += 1;
        }
      }

      this.resolvedSoundPaths.set(resolvedKey, resolvedPaths);
    }

    this.soundPaths.set(objectId, resolvedPaths);

    if (objectDescriptor.max < 0) {
      abort(
        "Could not find sounds '%s' with prefix '%s' for object '%s', id '%s', max '%s'.",
        tostring(this.path),
        objectSoundPrefix,
        object.name(),
        objectDescriptor.id,
        objectDescriptor.max
      );
    }

    if (!this.prefix) {
      object.sound_prefix(characterPrefix);
    }

    if (this.isGroupSound) {
      this.canPlayGroupSound = true;
    } else {
      if (this.canPlaySound.get(objectId) !== false) {
        this.canPlaySound.set(objectId, true);
      }
    }
  }

  /**
   * Forget the per-object registration so the next play request re-initializes the sound.
   *
   * Engine-side registrations die with the client object on network destroy, so keeping the descriptor
   * would make `play_sound` silently no-op after the object goes online again. Play availability
   * state is kept intact as it is persisted in object saves.
   *
   * @param objectId - Identifier of the object to invalidate the sound registration for.
   */
  public invalidateObject(objectId: TNumberId): void {
    const playback: Nillable<INpcSoundPlayback> = this.playback.get(objectId);

    if (playback?.pdaSoundObject?.playing()) {
      playback.pdaSoundObject.stop();
    }

    this.objects.delete(objectId);
    this.soundPaths.delete(objectId);
    this.playback.delete(objectId);
    this.canPlaySound.delete(objectId);
  }

  /**
   * Select the index of the next sound to play according to the configured playlist type.
   *
   * @param objectId - Identifier of the object to select the next sound for.
   * @returns Index of the next sound to play, or -1 when the sequence is exhausted.
   */
  public selectNextSound(objectId: TNumberId): TNumberId {
    const objectDescriptor: Nillable<INpcSoundDescriptor> = this.objects.get(objectId);
    const playback: INpcSoundPlayback = this.getPlayback(objectId);

    // Play random
    if (this.shuffle === ESoundPlaylistType.RANDOM) {
      if (objectDescriptor.max === 0) {
        return 0;
      } else if ($isNotNil(playback.playedSoundIndex)) {
        const nextPlayIndex: TIndex = math.random(0, objectDescriptor.max - 1);

        if (nextPlayIndex >= playback.playedSoundIndex) {
          return nextPlayIndex + 1;
        }

        return nextPlayIndex;
      }

      return math.random(0, objectDescriptor.max);
    }

    // Play in sequence.
    if (this.shuffle === ESoundPlaylistType.SEQUENCE) {
      if (playback.playedSoundIndex === -1) {
        return -1;
      } else if ($isNil(playback.playedSoundIndex)) {
        return 0;
      } else if (playback.playedSoundIndex < objectDescriptor.max) {
        return playback.playedSoundIndex + 1;
      } else {
        return -1;
      }
    }

    // Play in loop.
    if (this.shuffle === ESoundPlaylistType.LOOP) {
      if ($isNil(playback.playedSoundIndex)) {
        return 0;
      } else if (playback.playedSoundIndex < objectDescriptor.max) {
        return playback.playedSoundIndex + 1;
      } else {
        return 0;
      }
    }

    abort("Unexpected shuffle type provided: '%s'.", this.shuffle);
  }

  private getPlayback(objectId: TNumberId): INpcSoundPlayback {
    if (this.isGroupSound) {
      return this.groupPlayback;
    }

    let playback: Nillable<INpcSoundPlayback> = this.playback.get(objectId);

    if (!playback) {
      playback = {
        idleTime: null,
        pdaSoundObject: null,
        playedSoundIndex: null,
        playingStartedAt: null,
      };
      this.playback.set(objectId, playback);
    }

    return playback;
  }
}
