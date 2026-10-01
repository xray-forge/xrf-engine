import { time_global } from "xray16";
import { LuaArray, NIL, Nillable, TCount, TDuration, TNumberId, TStringId, TTimestamp } from "xray16/lib";
import { $isNil, $isNotNil } from "xray16/macros";

import { getManager, registry } from "@/engine/core/database";
import { SoundManager } from "@/engine/core/managers/sounds/SoundManager";
import { ESoundStoryParticipant, IReplicDescriptor } from "@/engine/core/managers/sounds/sounds_types";
import { soundsConfig } from "@/engine/core/managers/sounds/SoundsConfig";
import { SoundStory } from "@/engine/core/managers/sounds/stories/SoundStory";

/**
 * Controller coordinating playback of a sound story for one camp or squad.
 */
export class StoryPlaybackController {
  public readonly id: TStringId;
  public readonly objects: LuaArray<{ objectId: TNumberId }> = new LuaTable();

  public storyteller: Nillable<TNumberId> = null;
  public story: Nillable<SoundStory> = null;

  public lastPlayingObjectId: Nillable<TNumberId> = null;
  public phraseTimeout: Nillable<TDuration> = null;
  public phraseIdle: TDuration = 0;

  public constructor(id: TStringId) {
    this.id = id;
  }

  /**
   * Set the object acting as the storyteller for the current story.
   *
   * @param objectId - Id of the object to use as storyteller, or null to clear it.
   */
  public setStoryTeller(objectId: Nillable<TNumberId>): void {
    this.storyteller = objectId;
  }

  /**
   * Register an object as a participant of the story.
   *
   * @param objectId - Id of the object to add as a story participant.
   */
  public registerObject(objectId: TNumberId): void {
    table.insert(this.objects, { objectId: objectId });
  }

  /**
   * @returns Whether sound story is finished.
   */
  public isFinished(): boolean {
    return !this.story || this.story.isFinished();
  }

  /**
   * Set active story sound to play by ID of the story.
   *
   * @param storyId - Id of sound story to play.
   */
  public setActiveStory(storyId: TStringId): void {
    this.story = new SoundStory(storyId);
  }

  /**
   * Remove an object from the story participants, stopping its sound and clearing storyteller role if needed.
   *
   * @param objectId - Id of the object to remove from the story.
   */
  public unregisterObject(objectId: TNumberId): void {
    if (this.lastPlayingObjectId === objectId && soundsConfig.playing.get(this.lastPlayingObjectId)) {
      this.story = null;
      soundsConfig.playing.get(this.lastPlayingObjectId).stop(objectId);
    }

    if (this.storyteller === objectId) {
      this.storyteller = null;
    }

    let idToRemove: Nillable<TNumberId> = null;

    for (const [id, descriptor] of this.objects) {
      if (descriptor.objectId === objectId) {
        idToRemove = id;
        break;
      }
    }

    if ($isNotNil(idToRemove)) {
      table.remove(this.objects, idToRemove);
    }
  }

  /**
   * Advance the story on each tick by selecting the next speaker and playing the next phrase.
   */
  public update(): void {
    if ($isNil(this.story)) {
      return;
    }

    const lastPlayingObjectId: Nillable<TNumberId> = this.lastPlayingObjectId;

    // Wait for the previous phrase to finish, breaking the story off when its speaker gets into a fight.
    if ($isNotNil(lastPlayingObjectId) && soundsConfig.playing.has(lastPlayingObjectId)) {
      if ($isNotNil(registry.objects.get(lastPlayingObjectId)?.object?.best_enemy())) {
        this.story = null;
        soundsConfig.playing.get(lastPlayingObjectId).stop(lastPlayingObjectId);
      }

      return;
    }

    const now: TTimestamp = time_global();

    if ($isNil(this.phraseTimeout)) {
      this.phraseTimeout = now;
    }

    if (now - this.phraseTimeout < this.phraseIdle) {
      return;
    }

    const nextPhraseDescriptor: Nillable<IReplicDescriptor> = this.story.getNextPhraseDescriptor();

    if ($isNil(nextPhraseDescriptor)) {
      return;
    }

    let nextSpeakerObjectId: Nillable<TNumberId> = null;
    const participantsCount: TCount = this.objects.length();

    if (participantsCount === 0) {
      return;
    }

    if (nextPhraseDescriptor.who === ESoundStoryParticipant.TELLER) {
      if (!this.storyteller) {
        this.storyteller = table.random(this.objects)[1].objectId;
      }

      nextSpeakerObjectId = this.storyteller;
    } else if (nextPhraseDescriptor.who === ESoundStoryParticipant.REACTION) {
      let tellerId: TNumberId = 0;

      for (const [k, v] of this.objects) {
        if (v.objectId === this.storyteller) {
          tellerId = k;
          break;
        }
      }

      if (participantsCount >= 2) {
        let id: TNumberId = math.random(1, participantsCount - 1);

        if (id >= tellerId) {
          id = id + 1;
        }

        nextSpeakerObjectId = this.objects.get(id).objectId;
      } else {
        nextSpeakerObjectId = this.objects.get(1).objectId;
      }
    } else if (nextPhraseDescriptor.who === ESoundStoryParticipant.REACTION_ALL) {
      let objectId: Nillable<TNumberId> = null;

      for (const [_index, descriptor] of this.objects) {
        if (descriptor.objectId !== this.storyteller) {
          getManager(SoundManager).play(descriptor.objectId, nextPhraseDescriptor.theme);
          objectId = descriptor.objectId;
        }
      }

      this.lastPlayingObjectId = objectId;
      this.phraseTimeout = null;
      this.phraseIdle = nextPhraseDescriptor.timeout * 1000;

      return;
    } else {
      nextSpeakerObjectId = table.random(this.objects)[1].objectId;
    }

    if ($isNil(nextSpeakerObjectId) || $isNil(registry.objects.get(nextSpeakerObjectId))) {
      return;
    }

    if (
      $isNotNil(registry.objects.get(nextSpeakerObjectId).object!.best_enemy()) &&
      $isNotNil(soundsConfig.playing.get(nextSpeakerObjectId))
    ) {
      this.story = null;
      soundsConfig.playing.get(nextSpeakerObjectId).stop(nextSpeakerObjectId);

      return;
    }

    this.phraseTimeout = null;
    this.lastPlayingObjectId = nextSpeakerObjectId;
    this.phraseIdle = nextPhraseDescriptor.timeout * 1000;

    if (nextPhraseDescriptor.theme !== NIL) {
      getManager(SoundManager).play(nextSpeakerObjectId, nextPhraseDescriptor.theme);
    }
  }
}
