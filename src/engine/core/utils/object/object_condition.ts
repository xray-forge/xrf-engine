import { GameObject } from "xray16/alias";

/**
 * Restore a creature's condition: full health and stamina, radiation cleared and wounds closed.
 *
 * Condition setters add to the current value, except bleeding, which closes wounds by the share given, so full shares
 * restore any state.
 *
 * @param object - Creature to restore.
 */
export function restoreObjectCondition(object: GameObject): void {
  object.health = 1;
  object.power = 1;
  object.radiation = -1;
  object.bleeding = 1;
}
