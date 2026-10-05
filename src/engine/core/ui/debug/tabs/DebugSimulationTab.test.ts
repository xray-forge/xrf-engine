import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { AnyObject } from "xray16/lib";

import { getManager, registerSimulator } from "@/engine/core/database";
import { EDebugSimulationView, EDebugTab } from "@/engine/core/managers/debug/debug_types";
import { DebugManager } from "@/engine/core/managers/debug/DebugManager";
import {
  clearDebugTerrainSquads,
  sendDebugSquadToTarget,
} from "@/engine/core/managers/debug/utils/debug_simulation_actions";
import { inspectDebugSimulationLevel } from "@/engine/core/managers/debug/utils/debug_simulation_level";
import { inspectDebugSquad } from "@/engine/core/managers/debug/utils/debug_simulation_squad";
import { inspectDebugTerrain } from "@/engine/core/managers/debug/utils/debug_simulation_terrain";
import { destroySimulationData } from "@/engine/core/managers/simulation/utils";
import { SmartTerrain } from "@/engine/core/objects/smart_terrain";
import { Squad } from "@/engine/core/objects/squad";
import { Debugger } from "@/engine/core/ui/debug/Debugger";
import { DebugSimulationTab } from "@/engine/core/ui/debug/tabs/DebugSimulationTab";
import { mockRegisteredActor, MockSmartTerrain, MockSquad, resetRegistry } from "@/fixtures/engine";

jest.mock("@/engine/core/managers/debug/utils/debug_preferences", () => {
  const actual: { createDebugPreferences: () => object } = jest.requireActual(
    "@/engine/core/managers/debug/utils/debug_preferences"
  );

  function create(): object {
    return { ...actual.createDebugPreferences(), tab: "simulation" };
  }

  return {
    createDebugPreferences: jest.fn(create),
    loadDebugPreferences: jest.fn(create),
    saveDebugPreferences: jest.fn(),
  };
});

jest.mock("@/engine/core/managers/debug/utils/debug_simulation_squad", () => {
  const actual: AnyObject = jest.requireActual("@/engine/core/managers/debug/utils/debug_simulation_squad");

  return { inspectDebugSquad: jest.fn(actual.inspectDebugSquad) };
});

jest.mock("@/engine/core/managers/debug/utils/debug_simulation_terrain", () => {
  const actual: AnyObject = jest.requireActual("@/engine/core/managers/debug/utils/debug_simulation_terrain");

  return { inspectDebugTerrain: jest.fn(actual.inspectDebugTerrain) };
});

jest.mock("@/engine/core/managers/debug/utils/debug_simulation_level", () => {
  const actual: AnyObject = jest.requireActual("@/engine/core/managers/debug/utils/debug_simulation_level");

  return { inspectDebugSimulationLevel: jest.fn(actual.inspectDebugSimulationLevel) };
});

jest.mock("@/engine/core/managers/debug/utils/debug_simulation_actions", () => ({
  clearDebugTerrainSquads: jest.fn(() => "cleared"),
  respawnDebugTerrainSquad: jest.fn(() => "respawned"),
  sendDebugSquadToTarget: jest.fn(() => "sent"),
}));

/**
 * @returns Simulation tab of a new debugger window.
 */
function createSimulationTab(): DebugSimulationTab {
  const debuggerWindow: Debugger = new Debugger(getManager(DebugManager));

  jest.spyOn(debuggerWindow, "resume").mockImplementation(jest.fn());
  jest.spyOn(debuggerWindow, "report");

  return debuggerWindow.tabs.get(EDebugTab.SIMULATION) as DebugSimulationTab;
}

beforeEach(() => {
  resetRegistry();
  registerSimulator();
  mockRegisteredActor();
  destroySimulationData();
  jest.clearAllMocks();
});

describe("DebugSimulationTab", () => {
  it("should show the selected squad, terrain or level of each view", () => {
    const squad: Squad = MockSquad.mockRegistered();
    const terrain: SmartTerrain = MockSmartTerrain.mockRegistered();
    const tab: DebugSimulationTab = createSimulationTab();
    const manager: DebugManager = getManager(DebugManager);

    expect(manager.preferences.simulationView).toBe(EDebugSimulationView.SQUADS);

    tab.refresh();
    tab.onEntryClicked(1);

    expect(inspectDebugSquad).toHaveBeenCalledWith(squad);

    tab.uiViews.SetActiveTab(EDebugSimulationView.TERRAINS);
    tab.onViewChanged();
    tab.onEntryClicked(1);

    expect(manager.preferences.simulationView).toBe(EDebugSimulationView.TERRAINS);
    expect(inspectDebugTerrain).toHaveBeenCalledWith(terrain);

    tab.uiViews.SetActiveTab(EDebugSimulationView.OVERVIEW);
    tab.onViewChanged();
    tab.onEntryClicked(1);

    expect(inspectDebugSimulationLevel).toHaveBeenCalledWith(tab.selected?.level);
  });

  it("should send the selected squad to the debugger target", () => {
    const squad: Squad = MockSquad.mockRegistered();
    const terrain: SmartTerrain = MockSmartTerrain.mockRegistered();
    const tab: DebugSimulationTab = createSimulationTab();

    tab.refresh();
    tab.onSendToTarget();

    expect(tab.owner.report).toHaveBeenCalledWith("select a squad");

    tab.onEntryClicked(1);
    tab.onSendToTarget();

    expect(tab.owner.report).toHaveBeenCalledWith("target a smart terrain, a squad or the actor first");

    tab.owner.setTarget(terrain.id);
    tab.onSendToTarget();

    expect(sendDebugSquadToTarget).toHaveBeenCalledWith(squad, terrain.id);
  });

  it("should run terrain actions on terrains only", () => {
    const terrain: SmartTerrain = MockSmartTerrain.mockRegistered();
    const tab: DebugSimulationTab = createSimulationTab();

    MockSquad.mockRegistered();

    tab.refresh();
    tab.onEntryClicked(1);
    tab.onTerrainAction(clearDebugTerrainSquads);

    expect(tab.owner.report).toHaveBeenCalledWith("select a smart terrain");
    expect(clearDebugTerrainSquads).not.toHaveBeenCalled();

    tab.uiViews.SetActiveTab(EDebugSimulationView.TERRAINS);
    tab.onViewChanged();
    tab.onEntryClicked(1);
    tab.onTerrainAction(clearDebugTerrainSquads);

    expect(clearDebugTerrainSquads).toHaveBeenCalledWith(terrain);
  });
});
