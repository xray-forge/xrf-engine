import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { level } from "xray16";
import { ServerObject } from "xray16/alias";
import { MockAlifeObject, MockAlifeSimulator } from "xray16/mocks";
import { replaceFunctionMock, resetFunctionMock } from "xray16/testing/utils";

import { registerSimulator, registry } from "@/engine/core/database";
import { EDebugSpawnDestination, EDebugSpawnKind, IDebugSpawnEntry } from "@/engine/core/managers/debug/debug_types";
import { spawnDebugEntry } from "@/engine/core/managers/debug/utils/debug_spawn_actions";
import { spawnItemsAtPosition, spawnItemsForObject, spawnSquadInSmart } from "@/engine/core/utils/spawn";
import { mockRegisteredActor, resetRegistry } from "@/fixtures/engine";

jest.mock("@/engine/core/utils/spawn");

const rifle: IDebugSpawnEntry = { section: "wpn_test", kind: EDebugSpawnKind.WEAPONS, label: "rifle", search: "" };
const monster: IDebugSpawnEntry = { section: "m_test", kind: EDebugSpawnKind.MONSTERS, label: "m_test", search: "" };
const squad: IDebugSpawnEntry = {
  section: "squad_test",
  kind: EDebugSpawnKind.SQUADS,
  label: "squad_test",
  search: "",
};

beforeEach(() => {
  resetRegistry();
  registerSimulator();
  mockRegisteredActor();
  resetFunctionMock(level.get_target_dist);
  registry.smartTerrainNearest.id = null;
});

describe("spawnDebugEntry", () => {
  it("should spawn items into the inventory, and refuse creatures there", () => {
    expect(spawnDebugEntry(rifle, 2, EDebugSpawnDestination.INVENTORY, null)).toBe(
      "spawned 2 x rifle in the inventory"
    );
    expect(spawnItemsForObject).toHaveBeenCalledWith(registry.actor, "wpn_test", 2);

    expect(spawnDebugEntry(monster, 1, EDebugSpawnDestination.INVENTORY, null)).toBe(
      "monsters cannot go to the inventory"
    );
  });

  it("should spawn items and creatures near the actor", () => {
    expect(spawnDebugEntry(rifle, 1, EDebugSpawnDestination.ACTOR, null)).toBe("spawned 1 x rifle near actor");
    expect(spawnItemsAtPosition).toHaveBeenCalledWith(
      "wpn_test",
      registry.actor.game_vertex_id(),
      expect.any(Number),
      expect.anything(),
      1
    );

    expect(spawnDebugEntry(monster, 2, EDebugSpawnDestination.ACTOR, null)).toBe("spawned 2 x m_test near actor");
    expect(registry.simulator.create).toHaveBeenCalledTimes(2);
  });

  it("should spawn at the crosshair only when something is under it", () => {
    replaceFunctionMock(level.get_target_dist, () => 0);

    expect(spawnDebugEntry(rifle, 1, EDebugSpawnDestination.CROSSHAIR, null)).toBe(
      "nothing under the crosshair within 100 m"
    );

    replaceFunctionMock(level.get_target_dist, () => 10);

    expect(spawnDebugEntry(rifle, 1, EDebugSpawnDestination.CROSSHAIR, null)).toBe(
      "spawned 1 x rifle at the crosshair"
    );
  });

  it("should spawn next to the target", () => {
    const target: ServerObject = MockAlifeObject.mock();

    expect(spawnDebugEntry(monster, 1, EDebugSpawnDestination.TARGET, null)).toBe("no target");
    expect(spawnDebugEntry(monster, 1, EDebugSpawnDestination.TARGET, target.id)).toBe(
      "spawned 1 x m_test near target"
    );
    expect(MockAlifeSimulator.getInstance().create).toHaveBeenCalledWith(
      "m_test",
      target.position,
      target.m_level_vertex_id,
      target.m_game_vertex_id
    );
  });

  it("should spawn squads at the nearest smart terrain", () => {
    expect(spawnDebugEntry(squad, 1, EDebugSpawnDestination.ACTOR, null)).toBe(
      "no smart terrain near the actor for the squad"
    );

    const terrain: ServerObject = MockAlifeObject.mock({ name: "test_smart" });

    registry.smartTerrainNearest.id = terrain.id;

    expect(spawnDebugEntry(squad, 2, EDebugSpawnDestination.ACTOR, null)).toBe("spawned 2 x squad_test at test_smart");
    expect(spawnSquadInSmart).toHaveBeenCalledTimes(2);
    expect(spawnSquadInSmart).toHaveBeenCalledWith("squad_test", "test_smart");
  });
});
