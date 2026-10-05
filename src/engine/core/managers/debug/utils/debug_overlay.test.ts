import { beforeEach, describe, expect, it } from "@jest/globals";
import { LuaArray } from "xray16/lib";
import { $fromArray } from "xray16/macros";

import { registerSimulator } from "@/engine/core/database";
import {
  EDebugOverlayView,
  IDebugField,
  IDebugFlowResult,
  IDebugOverlayState,
} from "@/engine/core/managers/debug/debug_types";
import { inspectDebugOverlayView } from "@/engine/core/managers/debug/utils/debug_overlay";
import { mockRegisteredActor, resetRegistry } from "@/fixtures/engine";

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

const state: IDebugOverlayState = { targetId: null, flow: null, flowResult: null };

beforeEach(() => {
  resetRegistry();
  registerSimulator();
  mockRegisteredActor();
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
