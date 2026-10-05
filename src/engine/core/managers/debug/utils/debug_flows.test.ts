import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { level } from "xray16";
import { AnyObject, LuaArray } from "xray16/lib";
import { $fromArray } from "xray16/macros";
import { replaceFunctionMock } from "xray16/testing/utils";

import { IDebugField, IDebugFlow, IDebugFlowResult, IDebugQuestEntry } from "@/engine/core/managers/debug/debug_types";
import {
  buildDebugFlowEntries,
  inspectDebugFlowResult,
  readDebugFlows,
  runDebugFlow,
} from "@/engine/core/managers/debug/utils/debug_flows";

const run = jest.fn(() => ({ outcome: "waiting" }));

jest.mock("checks.test_flow", () => ({}), { virtual: true });
jest.mock("checks.framework.index", () => ({ run }), { virtual: true });

const globals: AnyObject = globalThis as AnyObject;

beforeEach(() => {
  globals.package = { loaded: {} };
});

afterEach(() => {
  delete globals.package;
});

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

describe("readDebugFlows", () => {
  it("should read nothing when flows are not built", () => {
    expect(readDebugFlows()).toBeNull();
  });
});

describe("buildDebugFlowEntries", () => {
  it("should list flows requiring the loaded level or none", () => {
    replaceFunctionMock(level.name, () => "zaton");

    const entries: LuaArray<IDebugQuestEntry> = buildDebugFlowEntries(
      $fromArray<IDebugFlow>([
        { identity: "quests_zat", module: "checks.zat", source: "zat.flow.ts", level: "zaton" },
        { identity: "quests_jup", module: "checks.jup", source: "jup.flow.ts", level: "jupiter" },
        { identity: "quests_any", module: "checks.any", source: "any.flow.ts", level: null },
      ])
    );

    expect(entries.length()).toBe(2);
    expect(entries.get(1).key).toBe("quests_zat");
    expect(entries.get(2).key).toBe("quests_any");
  });
});

describe("runDebugFlow", () => {
  it("should require the flow afresh and run it through the framework", () => {
    const loaded: AnyObject = globals.package.loaded;

    loaded["checks.test_flow"] = { stale: true };

    expect(
      runDebugFlow({ identity: "quests_test", module: "checks.test_flow", source: "test.flow.ts", level: null }, false)
    ).toEqual({ outcome: "waiting" });
    expect(loaded["checks.test_flow"]).toBeNull();
    expect(run).toHaveBeenCalledWith("quests_test", false, true);
  });

  it("should run a flow quietly when asked", () => {
    runDebugFlow(
      { identity: "quests_test", module: "checks.test_flow", source: "test.flow.ts", level: null },
      false,
      false
    );

    expect(run).toHaveBeenCalledWith("quests_test", false, false);
  });
});

describe("inspectDebugFlowResult", () => {
  it("should show each step's state and what to do about the one waited on", () => {
    const result: IDebugFlowResult = {
      outcome: "waiting",
      stepNames: $fromArray(["first", "second", "third"]),
      position: 1,
      waiting: { position: 2, name: "second", handOff: "talk to the barman" },
      failures: $fromArray([{ assertion: "task given", detail: "missing" }]),
      skipReason: null,
    };

    expect(toLines(inspectDebugFlowResult(result))).toEqual([
      "outcome: waiting",
      "reached: first",
      "waiting: second",
      "ahead: third",
      "to reach it: talk to the barman",
      "failure: task given: missing",
    ]);
  });
});
