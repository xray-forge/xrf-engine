import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { ServerHumanObject } from "xray16/alias";
import { LuaArray } from "xray16/lib";
import { MockAlifeHumanStalker, MockIniFile } from "xray16/mocks";

import { registerSimulator } from "@/engine/core/database";
import { IDebugField } from "@/engine/core/managers/debug/debug_types";
import {
  inspectDebugTerrain,
  summarizeDebugTerrain,
} from "@/engine/core/managers/debug/utils/debug_simulation_terrain";
import {
  assignSimulationSquadToTerrain,
  destroySimulationData,
  resetSimulationDataCache,
} from "@/engine/core/managers/simulation/utils";
import { SmartTerrain } from "@/engine/core/objects/smart_terrain";
import { applySmartTerrainRespawnSectionsConfig } from "@/engine/core/objects/smart_terrain/spawn/smart_terrain_spawn";
import { Squad } from "@/engine/core/objects/squad";
import {
  getDebugFieldValues,
  mockRegisteredActor,
  MockSmartTerrain,
  MockSquad,
  resetRegistry,
} from "@/fixtures/engine";

beforeEach(() => {
  resetRegistry();
  registerSimulator();
  mockRegisteredActor();
  destroySimulationData();
  resetSimulationDataCache();
});

describe("inspectDebugTerrain", () => {
  it("should describe population, squads and jobs", () => {
    const terrain: SmartTerrain = MockSmartTerrain.mockRegistered("test_smart");
    const squad: Squad = MockSquad.mock();
    const scripted: Squad = MockSquad.mock();
    const object: ServerHumanObject = MockAlifeHumanStalker.mock();

    terrain.maxStayingSquadsCount = 2;
    jest.spyOn(scripted, "getScriptedSimulationTarget").mockImplementation(() => terrain.id);
    assignSimulationSquadToTerrain(squad, terrain.id);
    assignSimulationSquadToTerrain(scripted, terrain.id);
    terrain.objectJobDescriptors.set(object.id, { isBegun: true, job: { section: "logic@walker_1" } } as never);

    const fields: LuaArray<IDebugField> = inspectDebugTerrain(terrain);

    expect(getDebugFieldValues(fields, "population")).toEqual(["1/2 squads"]);
    expect(getDebugFieldValues(fields, "squad").sort()).toEqual([squad.name(), `${scripted.name()}, scripted`].sort());
    expect(getDebugFieldValues(fields, "objects")).toEqual(["0 staying, 0 arriving"]);
    expect(getDebugFieldValues(fields, "job")).toEqual([`logic@walker_1: ${object.name()} (${object.id})`]);
    expect(getDebugFieldValues(fields, "respawns")).toEqual([]);
  });

  it("should describe respawn sections and what blocks the next respawn", () => {
    const terrain: SmartTerrain = MockSmartTerrain.mockRegistered("test_smart");

    terrain.ini = MockIniFile.mock("test.ltx", {
      "spawn-section": ["test-section-1"],
      "test-section-1": { spawn_squads: "a", spawn_num: "2" },
    });
    terrain.maxStayingSquadsCount = 0;
    applySmartTerrainRespawnSectionsConfig(terrain, "spawn-section");
    terrain.spawnedSquadsList.get("test-section-1").num = 1;

    const fields: LuaArray<IDebugField> = inspectDebugTerrain(terrain);

    expect(getDebugFieldValues(fields, "respawns")).toEqual(["test-section-1: 1/2"]);
    expect(getDebugFieldValues(fields, "next respawn check")).toEqual(["on the next update"]);
    expect(getDebugFieldValues(fields, "respawn")).toEqual(["full"]);
  });
});

describe("summarizeDebugTerrain", () => {
  it("should sum a terrain up in a few rows, with its respawn when it respawns squads", () => {
    const terrain: SmartTerrain = MockSmartTerrain.mockRegistered("test_smart");

    terrain.maxStayingSquadsCount = 2;

    expect(getDebugFieldValues(summarizeDebugTerrain(terrain), "population")).toEqual(["0/2 squads"]);
    expect(getDebugFieldValues(summarizeDebugTerrain(terrain), "respawn")).toEqual([]);

    terrain.isRespawnPoint = true;
    terrain.maxStayingSquadsCount = 0;

    expect(getDebugFieldValues(summarizeDebugTerrain(terrain), "respawn")).toEqual(["full"]);
  });
});
