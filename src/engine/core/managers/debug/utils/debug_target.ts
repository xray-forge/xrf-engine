import { level } from "xray16";
import { GameObject } from "xray16/alias";
import { LuaArray, Nillable, TNumberId } from "xray16/lib";
import { $isNil, $isNotNil } from "xray16/macros";

import { registry } from "@/engine/core/database";
import { IDebugTarget } from "@/engine/core/managers/debug/debug_types";
import { debugConfig } from "@/engine/core/managers/debug/DebugConfig";

/**
 * Make an object the debugger target, moving it to the front of the recent targets.
 *
 * @param target - Debugger target state.
 * @param id - Id of the object to target.
 */
export function selectDebugTarget(target: IDebugTarget, id: TNumberId): void {
  const recentIds: LuaArray<TNumberId> = new LuaTable();

  recentIds.set(1, id);

  for (const index of $range(1, target.recentIds.length())) {
    const recentId: TNumberId = target.recentIds.get(index);

    if (recentId !== id && recentIds.length() < debugConfig.RECENT_TARGETS_LIMIT) {
      recentIds.set(recentIds.length() + 1, recentId);
    }
  }

  target.id = id;
  target.recentIds = recentIds;
}

/**
 * Forget the target, keeping it among the recent ones.
 *
 * @param target - Debugger target state.
 */
export function clearDebugTarget(target: IDebugTarget): void {
  target.id = null;
  target.isPinned = false;
}

/**
 * Pin or unpin the target. Only a target can be pinned.
 *
 * @param target - Debugger target state.
 * @param isPinned - Whether to pin the target.
 * @returns Whether the target is pinned now.
 */
export function pinDebugTarget(target: IDebugTarget, isPinned: boolean): boolean {
  target.isPinned = isPinned && $isNotNil(target.id);

  return target.isPinned;
}

/**
 * Take the object under the crosshair as the target when the debugger opens, unless the current target is pinned.
 *
 * @param target - Debugger target state.
 */
export function pickDebugTargetOnOpen(target: IDebugTarget): void {
  if (target.isPinned) {
    return;
  }

  const object: Nillable<GameObject> = level.get_target_obj();

  if ($isNotNil(object)) {
    selectDebugTarget(target, object.id());
  }
}

/**
 * Forget targets whose objects no longer exist, as after loading another save.
 *
 * @param target - Debugger target state.
 */
export function pruneDebugTargets(target: IDebugTarget): void {
  const recentIds: LuaArray<TNumberId> = new LuaTable();

  for (const index of $range(1, target.recentIds.length())) {
    const id: TNumberId = target.recentIds.get(index);

    if ($isNotNil(registry.simulator.object(id))) {
      recentIds.set(recentIds.length() + 1, id);
    }
  }

  target.recentIds = recentIds;

  if ($isNotNil(target.id) && $isNil(registry.simulator.object(target.id))) {
    clearDebugTarget(target);
  }
}
