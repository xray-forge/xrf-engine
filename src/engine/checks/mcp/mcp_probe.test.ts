import { describe, expect, it } from "@jest/globals";

import * as mcp from "@/engine/checks/mcp/mcp_probe";
import { getManagerByName, registry } from "@/engine/core/database";
import { forwardGameTime } from "@/engine/core/utils/game/game_time";
import { getGameObjects } from "@/engine/core/utils/registry";
import { killSquadMember } from "@/engine/core/utils/squad/squad_members";

describe("mcp probe utilities", () => {
  it("should hand chunks the in-game utilities themselves, under their own names", () => {
    expect(Object.keys(mcp).sort()).toEqual([
      "disableInfoPortion",
      "forwardGameTime",
      "getGameObjects",
      "getManagerByName",
      "getNearestGameObject",
      "getNearestServerObject",
      "getObjectByStoryId",
      "getObjectSquad",
      "getServerObjectByStoryId",
      "getServerObjects",
      "getSimulationSquads",
      "getSimulationTerrainByName",
      "getSquadMembers",
      "getStoryIdByObjectId",
      "giveInfoPortion",
      "giveItemsToActor",
      "giveMoneyToActor",
      "hasInfoPortion",
      "isCreature",
      "isMonster",
      "isObjectOnLevel",
      "isStalker",
      "killSquadMember",
      "registry",
      "teleportActorNearPosition",
      "teleportActorToPosition",
      "teleportActorToStoryObject",
      "transferItemsToActor",
    ]);
    expect(mcp.registry).toBe(registry);
    expect(mcp.getManagerByName).toBe(getManagerByName);
    expect(mcp.getGameObjects).toBe(getGameObjects);
    expect(mcp.forwardGameTime).toBe(forwardGameTime);
    expect(mcp.killSquadMember).toBe(killSquadMember);
  });
});
