import { beforeEach, describe, expect, it } from "@jest/globals";
import { LuaArray, TName, TRate } from "xray16/lib";
import { $fromObject } from "xray16/macros";
import { MockVector } from "xray16/mocks";

import { registerSimulator } from "@/engine/core/database";
import { EDebugSimulationView, IDebugSimulationEntry } from "@/engine/core/managers/debug/debug_types";
import { getDebugObjectLevelName } from "@/engine/core/managers/debug/utils/debug_inspect";
import {
  buildDebugSimulationEntries,
  getDebugSimulationSquad,
  getDebugSimulationTerrain,
} from "@/engine/core/managers/debug/utils/debug_simulation";
import {
  assignSimulationSquadToTerrain,
  destroySimulationData,
  resetSimulationDataCache,
} from "@/engine/core/managers/simulation/utils";
import { SmartTerrain } from "@/engine/core/objects/smart_terrain";
import { Squad } from "@/engine/core/objects/squad";
import { resetPositionCache } from "@/engine/core/utils/position";
import { mockRegisteredActor, MockSmartTerrain, MockSquad, resetRegistry } from "@/fixtures/engine";

/**
 * @param entries - Simulation rows.
 * @returns Their labels, in order.
 */
function getLabels(entries: LuaArray<IDebugSimulationEntry>): Array<string> {
  const labels: Array<string> = [];

  for (const index of $range(1, entries.length())) {
    labels.push(entries.get(index).label);
  }

  return labels;
}

beforeEach(() => {
  resetRegistry();
  registerSimulator();
  mockRegisteredActor();
  destroySimulationData();
  resetSimulationDataCache();
  resetPositionCache();

  MockVector.DEFAULT_DISTANCE = 20;
});

describe("buildDebugSimulationEntries", () => {
  it("should list squads with their faction and level", () => {
    const squad: Squad = MockSquad.mockRegistered();
    const entries: LuaArray<IDebugSimulationEntry> = buildDebugSimulationEntries(EDebugSimulationView.SQUADS);
    const label: string = `${squad.name()} (${squad.faction}, ${getDebugObjectLevelName(squad)})`;

    expect(entries).toEqualLuaArrays([
      { id: squad.id, level: getDebugObjectLevelName(squad), label, search: label.toLowerCase() },
    ]);
  });

  it("should list terrains with their population, searchable by property", () => {
    const terrain: SmartTerrain = MockSmartTerrain.mockRegistered("test_smart");

    terrain.maxStayingSquadsCount = 3;
    terrain.simulationProperties = $fromObject<TName, TRate>({ base: 1, lair: 2 });
    assignSimulationSquadToTerrain(MockSquad.mock(), terrain.id);

    const entries: LuaArray<IDebugSimulationEntry> = buildDebugSimulationEntries(EDebugSimulationView.TERRAINS);

    expect(getLabels(entries)).toEqual([`test_smart 1/3 (${getDebugObjectLevelName(terrain)})`]);
    expect(entries.get(1).search).toContain("base 1, lair 2");
  });

  it("should list a row per level with its squads and terrains", () => {
    const squad: Squad = MockSquad.mockRegistered();

    MockSquad.mockRegistered();
    MockSmartTerrain.mockRegistered();

    const entries: LuaArray<IDebugSimulationEntry> = buildDebugSimulationEntries(EDebugSimulationView.OVERVIEW);
    const level: string = getDebugObjectLevelName(squad);

    expect(entries).toEqualLuaArrays([
      { id: null, level, label: `${level}: 2 squads, 1 terrains`, search: `${level}: 2 squads, 1 terrains` },
    ]);
  });
});

describe("getDebugSimulationSquad", () => {
  it("should find simulation squads only", () => {
    const squad: Squad = MockSquad.mockRegistered();

    expect(getDebugSimulationSquad(squad.id)).toBe(squad);
    expect(getDebugSimulationSquad(MockSquad.mock().id)).toBeNull();
  });
});

describe("getDebugSimulationTerrain", () => {
  it("should find simulation terrains only", () => {
    const terrain: SmartTerrain = MockSmartTerrain.mockRegistered();

    expect(getDebugSimulationTerrain(terrain.id)).toBe(terrain);
    expect(getDebugSimulationTerrain(MockSmartTerrain.mock().id)).toBeUndefined();
  });
});
