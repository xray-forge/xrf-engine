import { describe, expect, it } from "@jest/globals";

import { SoundStory } from "@/engine/core/managers/sounds/stories/SoundStory";

describe("SoundStory", () => {
  it("should correctly handle corrupted records", () => {
    expect(() => new SoundStory("not-existing-story")).toThrow(
      "There is no story 'not-existing-story' in 'sound_stories.ltx'."
    );
    expect(() => new SoundStory("wrong-story")).toThrow("Wrong first field 'nil' in story 'wrong-story', line '0'");
  });

  it("should handle empty story records", () => {
    const story: SoundStory = new SoundStory("empty-story");

    expect(story.isFinished()).toBe(true);
    expect(story.nextPhraseIndex).toBe(0);
    expect(story.maxPhrasesCount).toBe(-1);
    expect(story.replicas).toEqualLuaTables({});
  });

  it("should correctly parse story objects", () => {
    const story: SoundStory = new SoundStory("second");

    expect(story.isFinished()).toBe(false);
    expect(story.nextPhraseIndex).toBe(0);
    expect(story.maxPhrasesCount).toBe(2);
    expect(story.replicas).toEqualLuaTables({
      "0": {
        theme: "theme-2",
        timeout: 2000,
        who: "teller",
      },
      "1": {
        theme: "theme-3",
        timeout: 2000,
        who: "reaction",
      },
      "2": {
        theme: "theme-10",
        timeout: 1000,
        who: "teller",
      },
    });
  });

  it("should correctly reset", () => {
    const story: SoundStory = new SoundStory("third");

    expect(story.nextPhraseIndex).toBe(0);
    expect(story.maxPhrasesCount).toBe(1);

    expect(story.getNextPhraseDescriptor()).toEqualLuaTables({
      theme: "theme-4",
      timeout: 3000,
      who: "teller",
    });
    expect(story.nextPhraseIndex).toBe(1);

    expect(story.getNextPhraseDescriptor()).toEqualLuaTables({
      theme: "theme-5",
      timeout: 3000,
      who: "reaction_all",
    });
    expect(story.nextPhraseIndex).toBe(2);

    story.reset();

    expect(story.nextPhraseIndex).toBe(0);
  });
});
