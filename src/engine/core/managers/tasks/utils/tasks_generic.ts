import { level } from "xray16";
import { Nillable, TName, TNumberId, TStringId } from "xray16/lib";
import { $isNil, $isNotNil } from "xray16/macros";

import { mapMarks } from "@/engine/constants/map_marks";
import { getObjectIdByStoryId } from "@/engine/core/database";
import { taskConfig } from "@/engine/core/managers/tasks/TaskConfig";

/**
 * Add a map spot for the guider leading from one level to another, marking it as storyline or secondary.
 *
 * @param from - Name of the level the guider leads from.
 * @param to - Name of the level the guider leads to.
 * @param isStoryline - Whether the spot represents a storyline task instead of a secondary one.
 */
export function addGuiderSpot(from: TName, to: TName, isStoryline: boolean): void {
  const guiderStoryId: Nillable<TStringId> = taskConfig.GUIDERS_BY_LEVEL.get(from)?.get(to);

  if ($isNil(guiderStoryId)) {
    return;
  }

  const guiderId: Nillable<TNumberId> = getObjectIdByStoryId(guiderStoryId);

  if ($isNil(guiderId)) {
    return;
  }

  const spotToAdd: TName = isStoryline ? mapMarks.storyline_task_on_guider : mapMarks.secondary_task_on_guider;
  const spotToRemove: TName = isStoryline ? mapMarks.secondary_task_on_guider : mapMarks.storyline_task_on_guider;

  level.map_remove_object_spot(guiderId, spotToRemove);
  level.map_add_object_spot(guiderId, spotToAdd, "");
}

/**
 * Remove all storyline and secondary guider map spots for the guiders of the provided level.
 *
 * @param from - Name of the level whose guider spots should be removed.
 */
export function removeGuiderSpot(from: TName): void {
  const guidersByLevel: Nillable<LuaTable<TName, TStringId>> = taskConfig.GUIDERS_BY_LEVEL.get(from);

  if (!guidersByLevel) {
    return;
  }

  for (const [, storyId] of guidersByLevel) {
    const guiderId: Nillable<TNumberId> = getObjectIdByStoryId(storyId);

    if ($isNotNil(guiderId)) {
      if (level.map_has_object_spot(guiderId, mapMarks.storyline_task_on_guider) !== 0) {
        level.map_remove_object_spot(guiderId, mapMarks.storyline_task_on_guider);
      }

      if (level.map_has_object_spot(guiderId, mapMarks.secondary_task_on_guider) !== 0) {
        level.map_remove_object_spot(guiderId, mapMarks.secondary_task_on_guider);
      }
    }
  }
}
