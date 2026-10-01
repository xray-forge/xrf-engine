import { GameObject, IniFile, NetPacket, NetProcessor, SoundObject } from "xray16/alias";
import { Nillable, TName, TNumberId, TPath, TRate, TSection } from "xray16/lib";

import { readIniString } from "@/engine/core/ini";
import { EPlayableSound } from "@/engine/core/managers/sounds/sounds_types";

/**
 * Abstract base class representing a playable sound type loaded from an ini section.
 */
export abstract class AbstractPlayableSound {
  public abstract readonly type: EPlayableSound;

  public readonly section: TSection;
  public path: TPath;
  public soundObject: Nillable<SoundObject> = null;
  public shouldPlayAlways: boolean = false;

  protected constructor(ini: IniFile, section: TSection) {
    this.section = section;
    this.path = readIniString(ini, section, "path", true);
  }

  /**
   * Check whether the sound is currently playing for an object.
   *
   * @param _objectId - Identifier of the object playing the sound.
   * @returns Whether the sound object exists and is playing.
   */
  public isPlaying(_objectId: TNumberId): boolean {
    return this.soundObject ? this.soundObject.playing() : false;
  }

  /**
   * Get the sound object currently used for playback by an object.
   *
   * @param objectId - Identifier of the object playing the sound.
   * @returns Active sound object, or null when this sound type does not create one for the object.
   */
  public getSoundObject(objectId: TNumberId): Nillable<SoundObject> {
    return this.soundObject;
  }

  /**
   * Stop the sound playing for an object.
   *
   * @param _objectId - Identifier of the object playing the sound.
   */
  public stop(_objectId: TNumberId): void {
    if (this.soundObject) {
      this.soundObject.stop();
    }
  }

  /**
   * Set the playback volume of the sound object if it exists.
   *
   * @param level - Volume level to apply to the sound object.
   */
  public setVolume(level: TRate): void {
    if (this.soundObject) {
      this.soundObject.volume = level;
    }
  }

  /**
   * Set the playback volume for an object-specific sound instance.
   *
   * @param objectId - Identifier of the object playing the sound.
   * @param level - Volume level to apply.
   */
  public setVolumeForObject(objectId: TNumberId, level: TRate): void {
    this.setVolume(level);
  }

  /**
   * Play the sound for an object.
   *
   * @param objectId - Identifier of the object to play the sound for.
   * @param faction - Faction the sound notification shows the speaker of.
   * @param point - Smart terrain ID or translatable label the sound notification shows the speaker at.
   * @returns Whether the sound started playing successfully.
   */
  public abstract play(objectId: TNumberId, faction?: Nillable<TName>, point?: Nillable<TName | TNumberId>): boolean;

  /**
   * Reset the sound state of an object, before it plays the sound again at once.
   *
   * @param _objectId - Identifier of the object playing the sound.
   */
  public reset(_objectId: TNumberId): void {}

  /**
   * Handle the event when sound playback has ended for an object.
   *
   * @param objectId - Identifier of the object whose sound playback ended.
   */
  public onSoundPlayEnded(objectId: TNumberId): void {}

  /**
   * Save the sound state to the save packet.
   *
   * @param packet - Net packet to write the sound state into.
   */
  public save(packet: NetPacket): void {}

  /**
   * Load the sound state from the save reader.
   *
   * @param reader - Net processor to read the sound state from.
   */
  public load(reader: NetProcessor): void {}

  /**
   * Save the per-object sound state to the save packet.
   *
   * @param packet - Net packet to write the per-object sound state into.
   * @param object - Game object whose sound state is being saved.
   */
  public saveObject(packet: NetPacket, object: GameObject): void {}

  /**
   * Load the per-object sound state from the save reader.
   *
   * @param processor - Net processor to read the per-object sound state from.
   * @param object - Game object whose sound state is being loaded.
   */
  public loadObject(processor: NetProcessor, object: GameObject): void {}
}
