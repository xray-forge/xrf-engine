import { createVector } from "xray16/lib";

import { teleportToPoint } from "@/engine/checks/framework/world";
import { levels } from "@/engine/constants/levels";

/**
 * Move the actor to Nimble's counter in Skadovsk.
 *
 * Measured standing at Nimble rather than derived from him: his own position resolves to a vertex on the far side of
 * the level, and every spot reachable from it sits behind the counter he stands at.
 *
 * @returns Whether the actor was moved.
 */
export function teleportToNimble(): boolean {
  return teleportToPoint("Nimble", levels.zaton, createVector(107.096, -1.339, 185.976));
}
