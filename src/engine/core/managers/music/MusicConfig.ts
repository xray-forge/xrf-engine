import { $fromArray } from "xray16/macros";

import { IDynamicMusicDescriptor } from "@/engine/core/managers/sounds";

export const musicConfig = {
  // Combat music starts for an enemy closer than `MIN_DIST`, and keeps playing while one is closer than `MAX_DIST`.
  MAX_DIST: 100,
  MIN_DIST: 75,
  TRACK_SWITCH_DELTA: 3000,
  // Milliseconds the theme and the game music take to fade by one fiftieth of the game music volume.
  THEME_FADE_STEP_DURATION: 100,
  AMBIENT_FADE_STEP_DURATION: 200,
  LOGIC_UPDATE_STEP: 300,
  dynamicMusicThemes: $fromArray<IDynamicMusicDescriptor>([
    {
      files: $fromArray([
        "music\\combat\\theme1_part_1",
        "music\\combat\\theme1_part_2",
        "music\\combat\\theme1_part_3",
      ]),
    },
    {
      files: $fromArray([
        "music\\combat\\theme2_part_1",
        "music\\combat\\theme2_part_2",
        "music\\combat\\theme2_part_3",
      ]),
    },
    {
      files: $fromArray([
        "music\\combat\\theme3_part_1",
        "music\\combat\\theme3_part_2",
        "music\\combat\\theme3_part_3",
      ]),
    },
    {
      files: $fromArray([
        "music\\combat\\theme4_part_1",
        "music\\combat\\theme4_part_2",
        "music\\combat\\theme4_part_3",
      ]),
    },
  ]),
};
