/**
 * In-game utilities the game MCP gives its Lua chunks as `mcp`, so probes reach them without module paths.
 */
export {
  getManagerByName,
  getObjectByStoryId,
  getServerObjectByStoryId,
  getStoryIdByObjectId,
  registry,
} from "@/engine/core/database";
export {
  getSimulationSquads,
  getSimulationTerrainByName,
} from "@/engine/core/managers/simulation/utils/simulation_data";
export { isCreature, isMonster, isStalker } from "@/engine/core/utils/class_ids";
export { forwardGameTime } from "@/engine/core/utils/game/game_time";
export { disableInfoPortion, giveInfoPortion, hasInfoPortion } from "@/engine/core/utils/info_portion";
export {
  isObjectOnLevel,
  teleportActorNearPosition,
  teleportActorToPosition,
  teleportActorToStoryObject,
} from "@/engine/core/utils/position";
export {
  getGameObjects,
  getNearestGameObject,
  getNearestServerObject,
  getServerObjects,
} from "@/engine/core/utils/registry";
export { giveItemsToActor, giveMoneyToActor, transferItemsToActor } from "@/engine/core/utils/reward";
export { getObjectSquad } from "@/engine/core/utils/squad/squad_get";
export { getSquadMembers, killSquadMember } from "@/engine/core/utils/squad/squad_members";
