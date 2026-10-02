import { describe, expect, it } from "@jest/globals";

import { compareDumps, describeComparison, flattenDump } from "#/mcp/game_dump";

describe("game dumps", () => {
  it("should flatten tables into paths and lists of plain values into sorted sets", () => {
    expect(
      flattenDump({ Manager: { list: ["b", "a"], nested: { value: 1, empty: {} }, objects: [{ id: 2 }] } })
    ).toEqual(
      new Map([
        ["Manager.list", JSON.stringify(['"a"', '"b"'])],
        ["Manager.nested.value", "1"],
        ["Manager.nested.empty", "{}"],
        ["Manager.objects.0.id", "2"],
      ])
    );
  });

  it("should drop placeholder key numbers, telling keys sharing a name apart by their value", () => {
    const before = {
      Manager: {
        actions: {
          "<table>#1": { id: 1 },
          "<table>#2": { id: 2 },
          "<game_object 7 bandit>#1": true,
          "<userdata>#1": 1,
        },
      },
    };
    const after = {
      Manager: {
        actions: {
          "<userdata>#1": 1,
          "<game_object 7 bandit>#1": false,
          "<table>#1": { id: 2 },
          "<table>#2": { id: 1 },
        },
      },
    };

    expect([...flattenDump(before).keys()]).toEqual([
      expect.stringMatching(/^Manager\.actions\.<table>:[0-9a-f]{8}\.id$/),
      expect.stringMatching(/^Manager\.actions\.<table>:[0-9a-f]{8}\.id$/),
      "Manager.actions.<game_object 7 bandit>",
      "Manager.actions.<userdata>",
    ]);
    expect(compareDumps(before, after).differences).toEqual([
      { path: "Manager.actions.<game_object 7 bandit>", before: "true", after: "false" },
    ]);
  });

  it("should compare dumps, leaving out reordered lists, clock fields and ignored paths", () => {
    const before = {
      DatabaseManager: { managers: ["A", "B"], nextUpdateAt: 100 },
      WeatherManager: { weatherPeriodDuration: 21_600, lastSurgeAt: "<userdata>", removed: true },
      SimulationManager: { squads: { "1": 2 } },
    };
    const after = {
      DatabaseManager: { managers: ["B", "A"], nextUpdateAt: 900 },
      WeatherManager: { weatherPeriodDuration: 25_200, lastSurgeAt: "<userdata>", added: 1 },
      SimulationManager: { squads: { "1": 3 } },
    };

    expect(compareDumps(before, after, ["SimulationManager.squads"])).toEqual({
      differences: [
        { path: "WeatherManager.added", before: undefined, after: "1" },
        { path: "WeatherManager.removed", before: "true", after: undefined },
        { path: "WeatherManager.weatherPeriodDuration", before: "21600", after: "25200" },
      ],
      ignored: 2,
      shifts: [],
    });
  });

  it("should count numeric fields moving together by a second or more as the game clock", () => {
    const comparison = compareDumps(
      { A: { begin: 9_047, timer: 8_299, until: 11_299, wait: 1_000, count: 0, other: 0, more: 0, seen: 5_000 } },
      { A: { begin: 20_026, timer: 19_278, until: 22_278, wait: 11_979, count: 1, other: 1, more: 1, seen: 6_000 } }
    );

    expect(comparison.shifts).toEqual([{ delta: 10_979, count: 4 }]);
    expect(comparison.differences.map((it) => it.path)).toEqual(["A.count", "A.more", "A.other", "A.seen"]);
    expect(describeComparison(comparison, 0).split("\n")[0]).toBe(
      "4 differences in 1 managers, 0 clock or ignored fields left out. 4 fields moved with the game clock: " +
        "+10979 ms on 4."
    );
  });

  it("should report differences per manager, as many as asked for", () => {
    const comparison = compareDumps({ A: { x: 1, y: 1, z: 1 } }, { A: { x: 2, y: 2, z: 2 }, B: { w: 1 } });

    expect(describeComparison(comparison, 2)).toBe(
      [
        "4 differences in 2 managers, 0 clock or ignored fields left out.",
        "## A (3)",
        "~ x: 1 -> 2",
        "~ y: 1 -> 2",
        "... 1 more",
        "## B (1)",
        "+ w = 1",
      ].join("\n")
    );
  });
});
