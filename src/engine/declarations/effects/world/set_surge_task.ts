import { GameObject } from "xray16/alias";
import { extern, TSection } from "xray16/lib";

import { getManager } from "@/engine/core/database";
import { SurgeManager } from "@/engine/core/managers/surge/SurgeManager";

/**
 * Set the task given to hide from the next surge, `empty` giving no task.
 *
 * @param actor - Actor game object initiating the effect.
 * @param object - Game object owning the logics scheme.
 * @param task - Task section to give when the surge starts.
 */
extern("xr_effects.set_surge_task", (_: GameObject, __: GameObject, [task]: [TSection]): void => {
  getManager(SurgeManager).setSurgeTask(task);
});
