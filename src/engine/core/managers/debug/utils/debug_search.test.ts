import { describe, expect, it } from "@jest/globals";
import { LuaArray } from "xray16/lib";
import { $fromArray } from "xray16/macros";

import { filterDebugEntries, sortDebugEntriesByLevel } from "@/engine/core/managers/debug/utils/debug_search";

describe("filterDebugEntries", () => {
  it("should match the search text regardless of the query case", () => {
    const entries: LuaArray<{ search: string }> = $fromArray([{ search: "wpn_ak74 ak-74" }, { search: "wpn_svd svd" }]);

    expect(filterDebugEntries(entries, "")).toBe(entries);
    expect(filterDebugEntries(entries, "AK-74")).toEqualLuaArrays([{ search: "wpn_ak74 ak-74" }]);
    expect(filterDebugEntries(entries, "wpn_")).toEqualLuaArrays([
      { search: "wpn_ak74 ak-74" },
      { search: "wpn_svd svd" },
    ]);
    expect(filterDebugEntries(entries, "pistol")).toEqualLuaArrays([]);
  });
});

describe("sortDebugEntriesByLevel", () => {
  it("should put the loaded level's rows first, each part by label", () => {
    const entries: LuaArray<{ level: string; label: string }> = $fromArray([
      { level: "jupiter", label: "b" },
      { level: "zaton", label: "c" },
      { level: "jupiter", label: "a" },
      { level: "pripyat", label: "d" },
      { level: "zaton", label: "a" },
    ]);

    expect(sortDebugEntriesByLevel(entries, "zaton")).toEqualLuaArrays([
      { level: "zaton", label: "a" },
      { level: "zaton", label: "c" },
      { level: "jupiter", label: "a" },
      { level: "jupiter", label: "b" },
      { level: "pripyat", label: "d" },
    ]);
  });
});
