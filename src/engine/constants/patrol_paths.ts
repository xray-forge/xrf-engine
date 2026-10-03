/* eslint sort-keys-fix/sort-keys-fix: "error" */

/**
 * Patrol path names shared by quest logic and checks.
 *
 * @virtual
 */
export const patrolPaths = {
  jup_b16_teleport_in: "jup_b16_teleport_in",
  jup_b16_teleport_out: "jup_b16_teleport_out",
  jup_b8_actor_visual_stalker_look: "jup_b8_actor_visual_stalker_look",
  jup_b8_actor_visual_stalker_walk: "jup_b8_actor_visual_stalker_walk",
  jup_b9_actor_visual_stalker_look: "jup_b9_actor_visual_stalker_look",
  jup_b9_actor_visual_stalker_walk: "jup_b9_actor_visual_stalker_walk",
  zat_b29_actor_base_look: "zat_b29_actor_base_look",
  zat_b29_actor_base_walk: "zat_b29_actor_base_walk",
} as const;

export type TPatrolPaths = typeof patrolPaths;

export type TPatrolPath = TPatrolPaths[keyof TPatrolPaths];
