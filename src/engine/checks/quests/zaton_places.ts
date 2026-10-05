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

/**
 * Move the actor to the edge of the lost mercs' hideout, where they warn a newcomer to put the weapon away.
 *
 * Measured inside 'zat_b103_sr_def_restr' and outside 'zat_b103_merc_territory': inside the territory the mercs open
 * fire on an armed actor at once, which fails b103, and an actor leaving Skadovsk gets the weapon back on the way out.
 *
 * @returns Whether the actor was moved.
 */
export function teleportToLostMercsHideout(): boolean {
  return teleportToPoint("the lost mercs' hideout", levels.zaton, createVector(-128.1, 21.241, -373.8));
}
