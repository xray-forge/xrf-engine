import { level } from "xray16";
import { TLabel, TName, TNumberId } from "xray16/lib";

import { mapMarks } from "@/engine/constants/map_marks";
import { treasureConfig } from "@/engine/core/managers/treasures/TreasureConfig";
import { ETreasureType, ITreasureDescriptor } from "@/engine/core/managers/treasures/treasures_types";

/**
 * Display map spot for treasure.
 *
 * @param id - Treasure restrictor ID to display on game map.
 * @param descriptor - Treasure descriptor.
 * @param hint - Label to display on secret hovering.
 */
export function showTreasureMapSpot(id: TNumberId, descriptor: ITreasureDescriptor, hint?: TLabel): void {
  level.map_add_object_spot_ser(id, getTreasureMapSpot(descriptor), hint ?? "");
}

/**
 * Remove treasure spot for treasure descriptor.
 * Removes both the common and the typed spot, as enhanced mode can be toggled after the spot was shown.
 *
 * @param id - Treasure restrictor ID to remove from game map.
 * @param descriptor - Treasure descriptor.
 */
export function removeTreasureMapSpot(id: TNumberId, descriptor: ITreasureDescriptor): void {
  const typedSpot: TName = getTypedTreasureMapSpot(descriptor);

  level.map_remove_object_spot(id, mapMarks.treasure);

  if (typedSpot !== mapMarks.treasure) {
    level.map_remove_object_spot(id, typedSpot);
  }
}

/**
 * @param descriptor - Descriptor of treasure object to get mark for.
 * @returns Icon name for provided descriptor, based on treasure type.
 */
export function getTreasureMapSpot(descriptor: ITreasureDescriptor): TName {
  return treasureConfig.ENHANCED_MODE_ENABLED ? getTypedTreasureMapSpot(descriptor) : mapMarks.treasure;
}

/**
 * @param descriptor - Descriptor of treasure object to get mark for.
 * @returns Icon name for provided descriptor type, as shown in enhanced mode.
 */
export function getTypedTreasureMapSpot(descriptor: ITreasureDescriptor): TName {
  switch (descriptor.type) {
    case ETreasureType.RARE:
      return mapMarks.treasure_rare;

    case ETreasureType.EPIC:
      return mapMarks.treasure_epic;

    case ETreasureType.UNIQUE:
      return mapMarks.treasure_unique;

    case ETreasureType.COMMON:
    default:
      return mapMarks.treasure;
  }
}
