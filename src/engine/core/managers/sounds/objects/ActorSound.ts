import { FS, get_hud, getFS, sound_object, time_global } from "xray16";
import { IniFile, NetPacket, NetProcessor } from "xray16/alias";
import {
  assert,
  createEmptyVector,
  LuaArray,
  NIL,
  Nillable,
  StringNillable,
  TCount,
  TDuration,
  TIndex,
  TName,
  TNumberId,
  TPath,
  TSection,
  TStringId,
  TTimestamp,
} from "xray16/lib";
import { $filename, $isNil, $isNotNil } from "xray16/macros";

import { roots } from "@/engine/constants/roots";
import { IRegistryObjectState, registry } from "@/engine/core/database";
import { parseStringsList, readIniBoolean, readIniString } from "@/engine/core/ini";
import { EGameEvent, EventsManager } from "@/engine/core/managers/events";
import { ENotificationType, ISoundNotification } from "@/engine/core/managers/notifications/notifications_types";
import { AbstractPlayableSound } from "@/engine/core/managers/sounds/objects/AbstractPlayableSound";
import { EPlayableSound, ESoundPlaylistType } from "@/engine/core/managers/sounds/sounds_types";
import { getActiveSchemeState, IBaseSchemeState } from "@/engine/core/schemes/state";
import { LuaLogger } from "@/engine/core/utils/logging";

const logger: LuaLogger = new LuaLogger($filename);

/**
 * Playable sound played in 2D from the actor, used for actor voice lines and dialogue.
 */
export class ActorSound extends AbstractPlayableSound {
  public static readonly type: EPlayableSound = EPlayableSound.ACTOR;

  public readonly type: EPlayableSound = ActorSound.type;
  public readonly soundPaths: LuaArray<TPath> = new LuaTable();

  public isStereo: boolean;
  public isPrefixed: boolean;
  public canPlaySound: boolean = true;

  public shuffle: ESoundPlaylistType;

  public playedSoundIndex: Nillable<TIndex> = null;
  public playingStartedAt: Nillable<TTimestamp> = null;

  public idleTime: Nillable<TDuration> = null;
  public minIdle: TDuration;
  public maxIdle: TDuration;
  public random: number;

  public constructor(ini: IniFile, section: TSection) {
    super(ini, section);

    this.isStereo = readIniBoolean(ini, section, "actor_stereo", false, false);
    this.isPrefixed = readIniBoolean(ini, section, "npc_prefix", false, false);
    this.shuffle = readIniString(ini, section, "shuffle", false, null, ESoundPlaylistType.RANDOM) as ESoundPlaylistType;
    this.shouldPlayAlways = readIniBoolean(ini, section, "play_always", false, false);

    if (this.isPrefixed) {
      this.path = "characters_voice\\" + this.path;
    }

    const interval = parseStringsList(readIniString(ini, section, "idle", false, null, "3,5,100"));

    this.minIdle = tonumber(interval.get(1))!;
    this.maxIdle = tonumber(interval.get(2))!;
    this.random = tonumber(interval.get(3))!;

    const fs: FS = getFS();

    if ($isNotNil(fs.exist(roots.gameSounds, this.path + ".ogg"))) {
      this.soundPaths.set(1, this.path);
    } else {
      let index: TCount = 1;

      while (fs.exist(roots.gameSounds, this.path + index + ".ogg")) {
        this.soundPaths.set(index, this.path + index);
        index = index + 1;
      }
    }

    assert(this.soundPaths.length() > 0, "There are no sound collection with path: '%s'.", this.path);
  }

  /**
   * Start playing the next sound from the playlist as a 2D sound attached to the actor.
   *
   * @param _objectId - Identifier of the object the playback is requested for, the sound plays for the actor.
   * @param faction - Faction the sound notification shows the speaker of.
   * @param point - Smart terrain ID or translatable label the sound notification shows the speaker at.
   * @returns Whether the sound playback was started.
   */
  public play(_objectId: TNumberId, faction?: Nillable<TName>, point?: Nillable<TName | TNumberId>): boolean {
    if (!this.canPlaySound) {
      return false;
    }

    if ($isNotNil(this.playingStartedAt) && time_global() - this.playingStartedAt < this.idleTime!) {
      return false;
    }

    this.playingStartedAt = null;
    this.playedSoundIndex = this.selectNextSound();

    if (this.playedSoundIndex === -1) {
      return false;
    }

    const soundPath: TPath = this.soundPaths.get(this.playedSoundIndex!);

    this.soundObject = new sound_object(soundPath);
    this.soundObject.volume = 0.8;
    this.soundObject.play_at_pos(registry.actor, createEmptyVector(), 0, sound_object.s2d);
    this.soundObject.volume = 0.8;
    this.canPlaySound = false;

    EventsManager.emitEvent<ISoundNotification>(EGameEvent.NOTIFICATION, {
      type: ENotificationType.SOUND,
      faction,
      point,
      soundPath,
    });

    return true;
  }

  /**
   * Handle end of sound playback by resetting state, scheduling idle time and emitting scheme end signals.
   *
   * @param objectId - Id of the game object whose sound finished playing.
   */
  public override onSoundPlayEnded(objectId: TNumberId): void {
    logger.info(
      "Sound play ended: %s %s %s",
      objectId,
      this.playedSoundIndex,
      this.soundPaths.get(this.playedSoundIndex as TIndex)
    );

    this.playingStartedAt = time_global();
    this.idleTime = math.random(this.minIdle, this.maxIdle) * 1000;
    this.soundObject = null;
    this.canPlaySound = true;

    get_hud().RemoveCustomStatic("cs_subtitles_actor");

    const objectState: IRegistryObjectState = registry.objects.get(objectId);

    const schemeState: Nillable<IBaseSchemeState> = getActiveSchemeState(objectState);

    if ($isNil(schemeState?.signals)) {
      return;
    }

    if (this.playedSoundIndex === this.soundPaths.length() && this.shuffle !== "rnd") {
      logger.info("Emit sound end signal: %s", objectState.object.name());
      schemeState.signals.set("theme_end", true);
      schemeState.signals.set("sound_end", true);
    } else {
      schemeState.signals.set("sound_end", true);
    }
  }

  /**
   * Select the index of the next sound to play based on the configured playlist type.
   *
   * @returns Index of the next sound to play, -1 when the sequence is exhausted, or null when type is unknown.
   */
  public selectNextSound(): Nillable<TIndex> {
    const soundsCount: TCount = this.soundPaths.length();

    // Play one from the list.
    if (this.shuffle === ESoundPlaylistType.RANDOM) {
      if (soundsCount === 1) {
        return 1;
      } else if ($isNotNil(this.playedSoundIndex)) {
        const playedSoundIndex: TIndex = math.random(1, soundsCount - 1);

        if (playedSoundIndex >= this.playedSoundIndex) {
          return playedSoundIndex + 1;
        }

        return playedSoundIndex;
      }

      return math.random(1, soundsCount);
    }

    // Play sounds in from first to last, then end.
    if (this.shuffle === ESoundPlaylistType.SEQUENCE) {
      if (this.playedSoundIndex === -1) {
        return -1;
      } else if ($isNil(this.playedSoundIndex)) {
        return 1;
      } else if (this.playedSoundIndex < soundsCount) {
        return this.playedSoundIndex + 1;
      } else {
        return -1;
      }
    }

    // Play sounds in a loop, from first to last.
    if (this.shuffle === ESoundPlaylistType.LOOP) {
      if ($isNil(this.playedSoundIndex)) {
        return 1;
      } else if (this.playedSoundIndex < soundsCount) {
        return this.playedSoundIndex + 1;
      } else {
        return 1;
      }
    }

    return null;
  }

  /**
   * Reset playback state so the sound can be played again from the start.
   */
  public override reset(): void {
    this.playingStartedAt = null;
    this.playedSoundIndex = null;
  }

  /**
   * Save the index of the last played sound to the save packet.
   *
   * @param packet - Net packet to write the sound state into.
   */
  public override save(packet: NetPacket): void {
    packet.w_stringZ(tostring(this.playedSoundIndex));
  }

  /**
   * Load the index of the last played sound from the save reader.
   *
   * @param reader - Net processor to read the sound state from.
   */
  public override load(reader: NetProcessor): void {
    const id: StringNillable<TStringId> = reader.r_stringZ();

    this.playedSoundIndex = id === NIL ? null : tonumber(id)!;
  }
}
