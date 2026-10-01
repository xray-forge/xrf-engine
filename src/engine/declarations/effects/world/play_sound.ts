import { GameObject } from "xray16/alias";
import { abort, extern, Nillable, TName, TNumberId } from "xray16/lib";
import { $isNotNil } from "xray16/macros";

import { TCommunity } from "@/engine/constants/communities";
import { getManager } from "@/engine/core/database";
import { getSimulationTerrainByName } from "@/engine/core/managers/simulation/utils";
import { SoundManager } from "@/engine/core/managers/sounds/SoundManager";
import { SmartTerrain } from "@/engine/core/objects/smart_terrain";
import { isStalker } from "@/engine/core/utils/class_ids";

/**
 * Should play sound based on provided parameters in smart terrain.
 *
 * Where:
 * - theme - name of sound theme to play
 * - faction - faction prefix for theme playing
 * - terrainNameOrId - name of smart terrain or ID to play sound in.
 */
extern(
  "xr_effects.play_sound",
  (
    _: GameObject,
    object: GameObject,
    [theme, faction, terrainNameOrId]: [Nillable<TName>, Nillable<TCommunity>, Nillable<TName | TNumberId>]
  ): void => {
    const terrain: Nillable<SmartTerrain> = getSimulationTerrainByName(terrainNameOrId as TName);
    const terrainId: TNumberId = terrain ? terrain.id : (terrainNameOrId as TNumberId);

    if (object && isStalker(object) && !object.alive()) {
      abort("Stalker '%s' is dead while trying to play theme sound '%s'.", object.name(), theme);
    }

    if ($isNotNil(theme)) {
      getManager(SoundManager).play(object.id(), theme, faction, terrainId);
    }
  }
);
