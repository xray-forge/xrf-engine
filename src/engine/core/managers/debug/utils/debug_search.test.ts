import { describe, expect, it } from "@jest/globals";
import { LuaArray } from "xray16/lib";
import { $fromArray } from "xray16/macros";

import { filterDebugEntries } from "@/engine/core/managers/debug/utils/debug_search";

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
