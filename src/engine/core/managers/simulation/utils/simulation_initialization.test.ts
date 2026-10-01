import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { game_graph } from "xray16";
import { ServerObject } from "xray16/alias";
import { TName, TNumberId } from "xray16/lib";
import { $fromObject } from "xray16/macros";
import { resetFunctionMock } from "xray16/testing/utils";

import { registerSimulator } from "@/engine/core/database";
import { simulationConfig } from "@/engine/core/managers/simulation/SimulationConfig";
import { ISmartTerrainDescriptor } from "@/engine/core/managers/simulation/types";
import {
  destroySimulationData,
  initializeDefaultSimulationSquads,
} from "@/engine/core/managers/simulation/utils/simulation_initialization";
import {
  assignSimulationSquadToTerrain,
  createSimulationSquad,
} from "@/engine/core/managers/simulation/utils/simulation_squads";
import { SmartTerrain } from "@/engine/core/objects/smart_terrain";
import { Squad } from "@/engine/core/objects/squad";
import { mockRegisteredActor, MockSmartTerrain, MockSquad, resetRegistry } from "@/fixtures/engine";

jest.mock("@/engine/core/managers/simulation/utils/simulation_squads");

describe("initializeDefaultSimulationSquads", () => {
  beforeEach(() => {
    resetRegistry();
    registerSimulator();
    mockRegisteredActor();

    resetFunctionMock(assignSimulationSquadToTerrain);
    resetFunctionMock(createSimulationSquad);
  });

  it("should correctly initialize if not initialized yet", () => {
    simulationConfig.IS_SIMULATION_INITIALIZED = false;

    const terrainPriA16: SmartTerrain = MockSmartTerrain.mockRegistered("pri_a16");
    const terrainZatStalkerBase: SmartTerrain = MockSmartTerrain.mockRegistered("zat_stalker_base_smart");
    const terrainJupB41: SmartTerrain = MockSmartTerrain.mockRegistered("jup_b41");

    initializeDefaultSimulationSquads();

    expect(createSimulationSquad).toHaveBeenCalledTimes(8);
    // Created squads are assigned to their terrain on creation.
    expect(assignSimulationSquadToTerrain).not.toHaveBeenCalled();

    expect(createSimulationSquad).toHaveBeenCalledWith(terrainZatStalkerBase, "zat_a2_stalker_nimble_squad");
    expect(createSimulationSquad).toHaveBeenCalledWith(terrainZatStalkerBase, "zat_b30_owl_stalker_trader_squad");
    expect(createSimulationSquad).toHaveBeenCalledWith(terrainZatStalkerBase, "zat_b7_bandit_boss_sultan_squad");

    expect(createSimulationSquad).toHaveBeenCalledWith(terrainJupB41, "jup_b6_scientist_group");
    expect(createSimulationSquad).toHaveBeenCalledWith(terrainJupB41, "jup_b43_stalker_assistant_squad");

    expect(createSimulationSquad).toHaveBeenCalledWith(terrainPriA16, "pri_a22_military_merkulov_squad");
    expect(createSimulationSquad).toHaveBeenCalledWith(terrainPriA16, "pri_a22_military_skelja_squad");
    expect(createSimulationSquad).toHaveBeenCalledWith(terrainPriA16, "pri_a22_military_yarmoshuk_squad");
  });

  it("should spawn squads of next levels when a level has no start positions", () => {
    simulationConfig.IS_SIMULATION_INITIALIZED = false;

    MockSmartTerrain.mockRegistered("pri_a16");
    MockSmartTerrain.mockRegistered("zat_stalker_base_smart");
    MockSmartTerrain.mockRegistered("jup_b41");

    jest
      .mocked(game_graph().levels)
      .mockReturnValueOnce([{ id: 4 }, { id: 1 }, { id: 2 }, { id: 3 }] as unknown as LuaIterable<ServerObject>);

    initializeDefaultSimulationSquads();

    expect(createSimulationSquad).toHaveBeenCalledTimes(8);
  });

  it("should not initialize if initialized", () => {
    simulationConfig.IS_SIMULATION_INITIALIZED = true;

    initializeDefaultSimulationSquads();

    expect(createSimulationSquad).toHaveBeenCalledTimes(0);
    expect(assignSimulationSquadToTerrain).toHaveBeenCalledTimes(0);
  });
});

describe("destroySimulationData", () => {
  beforeEach(() => {
    registerSimulator();

    simulationConfig.IS_SIMULATION_INITIALIZED = false;
  });

  it("should correctly destroy values with getters", () => {
    simulationConfig.IS_SIMULATION_INITIALIZED = true;
    simulationConfig.TERRAINS = $fromObject<TName, SmartTerrain>({ a: MockSmartTerrain.mock() });
    simulationConfig.TERRAIN_DESCRIPTORS = $fromObject<TNumberId, ISmartTerrainDescriptor>({
      1: { terrain: MockSmartTerrain.mock(), assignedSquads: new LuaTable() },
    });
    simulationConfig.SQUADS = $fromObject<TNumberId, Squad>({ 1: MockSquad.mock() });

    destroySimulationData();

    expect(simulationConfig.IS_SIMULATION_INITIALIZED).toBe(false);
    expect(simulationConfig.SQUADS).toEqualLuaTables({});
    expect(simulationConfig.TEMPORARY_ASSIGNED_SQUADS).toEqualLuaTables({});
    expect(simulationConfig.TERRAIN_DESCRIPTORS).toEqualLuaTables({});
    expect(simulationConfig.TERRAINS).toEqualLuaTables({});
  });
});
