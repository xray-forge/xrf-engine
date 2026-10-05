import { beforeEach, describe, expect, it } from "@jest/globals";
import { LuaArray, Nillable } from "xray16/lib";
import { $fromArray } from "xray16/macros";
import { MockAlifeObject } from "xray16/mocks";

import { registerSimulator } from "@/engine/core/database";
import {
  EDebugOverlayView,
  IDebugField,
  IDebugFlowResult,
  IDebugOverlayState,
  IDebugPreferences,
  IDebugSimulationRecord,
} from "@/engine/core/managers/debug/debug_types";
import { inspectDebugOverlayView, isDebugOverlayViewShown } from "@/engine/core/managers/debug/utils/debug_overlay";
import { createDebugPreferences } from "@/engine/core/managers/debug/utils/debug_preferences";
import { destroySimulationData } from "@/engine/core/managers/simulation/utils";
import { SmartTerrain } from "@/engine/core/objects/smart_terrain";
import { Squad } from "@/engine/core/objects/squad";
import { mockRegisteredActor, MockSmartTerrain, MockSquad, resetRegistry } from "@/fixtures/engine";

/**
 * @param fields - Inspected fields.
 * @returns Fields as `label: value` lines.
 */
function toLines(fields: LuaArray<IDebugField>): Array<string> {
  const lines: Array<string> = [];

  for (const index of $range(1, fields.length())) {
    lines.push(`${fields.get(index).label}: ${fields.get(index).value}`);
  }

  return lines;
}

const state: IDebugOverlayState = {
  targetId: null,
  flow: null,
  flowResult: null,
  simulationId: null,
  simulationRecords: new LuaTable(),
};

beforeEach(() => {
  resetRegistry();
  registerSimulator();
  mockRegisteredActor();
  destroySimulationData();
});

describe("inspectDebugOverlayView", () => {
  it("should show nothing for a view that is off", () => {
    expect(inspectDebugOverlayView(EDebugOverlayView.OFF, state, 30).length()).toBe(0);
  });

  it("should show no target or flow when none is followed", () => {
    expect(toLines(inspectDebugOverlayView(EDebugOverlayView.TARGET, state, 30))).toEqual(["target: none"]);
    expect(toLines(inspectDebugOverlayView(EDebugOverlayView.FLOW, state, 30))).toEqual(["flow: none pinned"]);
  });

  it("should show the actor and the world", () => {
    expect(toLines(inspectDebugOverlayView(EDebugOverlayView.ACTOR, state, 30))[0]).toMatch(/^level: /);
    expect(toLines(inspectDebugOverlayView(EDebugOverlayView.WORLD, state, 30))[0]).toMatch(/^time: /);
  });

  it("should show where the pinned flow stands and what to do, wrapped", () => {
    const flowResult: IDebugFlowResult = {
      outcome: "WAITING",
      stepNames: $fromArray(["1 - met", "2 - asked", "3 - done"]),
      position: 1,
      waiting: { position: 2, name: "2 - asked", handOff: "ask Sultan for work at the base" },
      failures: new LuaTable(),
      skipReason: null,
    };
    const flow = { identity: "quests_test", module: "checks.test", source: "test.flow.ts", level: null };

    expect(toLines(inspectDebugOverlayView(EDebugOverlayView.FLOW, { ...state, flow }, 30))).toEqual([
      "flow: quests_test - not run yet",
    ]);
    expect(toLines(inspectDebugOverlayView(EDebugOverlayView.FLOW, { ...state, flow, flowResult }, 16))).toEqual([
      "flow: quests_test",
      "outcome: WAITING",
      "steps: 1 / 3",
      "next: 2 - asked",
      "to do: ask Sultan for",
      ": work at the base",
    ]);
  });
});

describe("inspectDebugOverlayView simulation", () => {
  it("should follow the pinned squad or terrain with its latest events", () => {
    const squad: Squad = MockSquad.mockRegistered();
    const terrain: SmartTerrain = MockSmartTerrain.mockRegistered("test_smart");
    const gone: number = MockAlifeObject.mock().id;
    const simulationRecords: LuaArray<IDebugSimulationRecord> = $fromArray<IDebugSimulationRecord>([
      { serial: 1, time: "10:05", id: squad.id, name: squad.name(), level: "zaton", text: "heads to test_smart" },
    ]);

    function lines(simulationId: Nillable<number>): Array<string> {
      return toLines(
        inspectDebugOverlayView(EDebugOverlayView.SIMULATION, { ...state, simulationId, simulationRecords }, 30)
      );
    }

    expect(lines(null)).toEqual(["simulation: none pinned"]);
    expect(lines(squad.id)[0]).toBe(`squad: ${squad.name()} (${squad.id})`);
    expect(lines(squad.id).at(-1)).toBe("10:05: heads to test_smart");
    expect(lines(terrain.id)[0]).toBe(`smart terrain: test_smart (${terrain.id})`);
    expect(lines(gone)[0]).toMatch(/left the simulation$/);
  });
});

describe("isDebugOverlayViewShown", () => {
  it("should tell whether the overlay is on with a panel showing the view", () => {
    const preferences: IDebugPreferences = createDebugPreferences();

    expect(isDebugOverlayViewShown(preferences, EDebugOverlayView.TARGET)).toBe(false);

    preferences.isOverlayEnabled = true;

    expect(isDebugOverlayViewShown(preferences, EDebugOverlayView.TARGET)).toBe(true);
    expect(isDebugOverlayViewShown(preferences, EDebugOverlayView.SIMULATION)).toBe(false);
  });
});
