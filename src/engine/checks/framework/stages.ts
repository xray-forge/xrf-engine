import { abort, TIndex, TName } from "xray16/lib";

import { hasInfoPortion } from "@/engine/core/utils/info_portion";

/**
 * Find a stage in its chain.
 *
 * @param stages - Info portions a quest moves through, in order.
 * @param stage - Stage to find.
 * @returns Index of the stage in the chain.
 */
function findStageIndex(stages: ReadonlyArray<TName>, stage: TName): TIndex {
  const index: TIndex = stages.indexOf(stage);

  if (index < 0) {
    abort("Stage '%s' is not part of the chain.", stage);
  }

  return index;
}

/**
 * Whether a quest reached a stage of its chain or any stage after it.
 *
 * A chain lists the info portions a quest moves through in order. Logic often lets a player skip ahead, such as
 * walking straight into a hideout or killing what the plan was to gas, so a stage counts as passed once a later one is.
 *
 * @param stages - Info portions a quest moves through, in order.
 * @param stage - Stage to test, one of the chain.
 * @returns Whether the stage or a later one is reached.
 */
export function isStagePassed(stages: ReadonlyArray<TName>, stage: TName): boolean {
  for (const index of $range(findStageIndex(stages, stage), stages.length - 1)) {
    if (hasInfoPortion(stages[index])) {
      return true;
    }
  }

  return false;
}

/**
 * Whether a quest is at a stage of its chain: passed it, and not passed the one after.
 *
 * @param stages - Info portions a quest moves through, in order.
 * @param stage - Stage to test, one of the chain.
 * @returns Whether the stage is the furthest one reached.
 */
export function isStageCurrent(stages: ReadonlyArray<TName>, stage: TName): boolean {
  const index: TIndex = findStageIndex(stages, stage);

  return isStagePassed(stages, stage) && (index === stages.length - 1 || !isStagePassed(stages, stages[index + 1]));
}
