import { beforeEach, describe, expect, it, jest } from "@jest/globals";

import { registerSimulator, registerStoryLink, registry } from "@/engine/core/database";
import {
  clearDebugTerrainSquads,
  respawnDebugTerrainSquad,
  sendDebugSquadToTarget,
} from "@/engine/core/managers/debug/utils/debug_simulation_actions";
import {
  assignSimulationSquadToTerrain,
  destroySimulationData,
  releaseSimulationSquad,
} from "@/engine/core/managers/simulation/utils";
import { SmartTerrain } from "@/engine/core/objects/smart_terrain";
import { respawnSmartTerrainSquad } from "@/engine/core/objects/smart_terrain/spawn/smart_terrain_spawn";
import { Squad } from "@/engine/core/objects/squad";
import { ESquadActionType } from "@/engine/core/objects/squad/squad_types";
import { mockRegisteredActor, MockSmartTerrain, MockSquad, resetRegistry } from "@/fixtures/engine";

jest.mock("@/engine/core/managers/simulation/utils", () => ({
  ...(jest.requireActual("@/engine/core/managers/simulation/utils") as object),
  releaseSimulationSquad: jest.fn(),
}));

jest.mock("@/engine/core/objects/smart_terrain/spawn/smart_terrain_spawn", () => ({
  ...(jest.requireActual("@/engine/core/objects/smart_terrain/spawn/smart_terrain_spawn") as object),
  respawnSmartTerrainSquad: jest.fn(() => null),
}));

beforeEach(() => {
  resetRegistry();
  registerSimulator();
  mockRegisteredActor();
  destroySimulationData();
  jest.clearAllMocks();
});

describe("sendDebugSquadToTarget", () => {
  it("should send a squad to a target that takes it", () => {
    const squad: Squad = MockSquad.mockRegistered();
    const target: Squad = MockSquad.mockRegistered();

    jest.spyOn(target, "isValidSimulationTarget").mockImplementation(() => true);
    jest.spyOn(target, "isReachedBySimulationObject").mockImplementation(() => false);
    registry.simulationObjects.set(target.id, target);

    expect(sendDebugSquadToTarget(squad, target.id)).toBe(`sent ${squad.name()} to ${target.name()}`);
    expect(squad.assignedTargetId).toBe(target.id);
    expect(squad.currentAction?.type).toBe(ESquadActionType.REACH_TARGET);
  });

  it("should refuse scripted squads, itself, and targets that are not simulation targets now", () => {
    const squad: Squad = MockSquad.mockRegistered();
    const scripted: Squad = MockSquad.mockRegistered();
    const target: Squad = MockSquad.mockRegistered();

    jest.spyOn(scripted, "getScriptedSimulationTarget").mockImplementation(() => target.id);
    registry.simulationObjects.delete(target.id);

    expect(sendDebugSquadToTarget(scripted, target.id)).toBe(`${scripted.name()} follows its scripted targets`);
    expect(sendDebugSquadToTarget(squad, squad.id)).toBe("a squad cannot target itself");
    expect(sendDebugSquadToTarget(squad, target.id)).toBe(
      `${target.name()} (${target.id}) is not a simulation target now`
    );
    expect(squad.assignedTargetId).toBeNull();
  });

  it("should refuse targets on another level, and terrains that do not take the squad, saying why", () => {
    const squad: Squad = MockSquad.mockRegistered();
    const terrain: SmartTerrain = MockSmartTerrain.mockRegistered("test_smart");
    const far: MockSquad = MockSquad.mockRegistered() as MockSquad;

    terrain.maxStayingSquadsCount = 0;
    registry.simulationObjects.set(terrain.id, terrain);
    registry.simulationObjects.set(far.id, far);
    far.mockSetGameVertexId(330);

    expect(sendDebugSquadToTarget(squad, far.id)).toBe(`${far.name()} is on another level`);
    expect(sendDebugSquadToTarget(squad, terrain.id)).toBe(`test_smart does not take ${squad.name()}: full`);
    expect(squad.assignedTargetId).toBeNull();
  });
});

describe("respawnDebugTerrainSquad", () => {
  it("should respawn at respawn points only, within their limits", () => {
    const terrain: SmartTerrain = MockSmartTerrain.mockRegistered("test_smart");
    const squad: Squad = MockSquad.mock();

    expect(respawnDebugTerrainSquad(terrain)).toBe("test_smart does not respawn squads");
    expect(respawnSmartTerrainSquad).not.toHaveBeenCalled();

    terrain.isRespawnPoint = true;

    expect(respawnDebugTerrainSquad(terrain)).toBe("every respawn section of test_smart is at its limit");

    jest.mocked(respawnSmartTerrainSquad).mockImplementation(() => squad);

    expect(respawnDebugTerrainSquad(terrain)).toBe(`respawned ${squad.name()} at test_smart`);
    expect(respawnSmartTerrainSquad).toHaveBeenCalledWith(terrain);
  });
});

describe("clearDebugTerrainSquads", () => {
  it("should release the terrain's squads but story ones", () => {
    const terrain: SmartTerrain = MockSmartTerrain.mockRegistered("test_smart");
    const squad: Squad = MockSquad.mock();
    const story: Squad = MockSquad.mock();

    assignSimulationSquadToTerrain(squad, terrain.id);
    assignSimulationSquadToTerrain(story, terrain.id);
    registerStoryLink(story.id, "test_story_squad");

    expect(clearDebugTerrainSquads(terrain)).toBe("released 1 squads of test_smart, kept 1 story squads");
    expect(releaseSimulationSquad).toHaveBeenCalledTimes(1);
    expect(releaseSimulationSquad).toHaveBeenCalledWith(squad);
  });
});
