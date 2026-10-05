import { describe, expect, it } from "@jest/globals";

import { DebugPager } from "@/engine/core/ui/debug/tabs/DebugPager";

describe("DebugPager", () => {
  it("should count pages, at least one", () => {
    const pager: DebugPager = new DebugPager(10);

    expect(pager.getPageCount(0)).toBe(1);
    expect(pager.getPageCount(10)).toBe(1);
    expect(pager.getPageCount(11)).toBe(2);
  });

  it("should turn pages within the list", () => {
    const pager: DebugPager = new DebugPager(10);

    pager.turn(-1, 25);
    expect(pager.page).toBe(1);

    pager.turn(5, 25);
    expect(pager.page).toBe(3);
    expect(pager.describe(25)).toBe("page 3 / 3");
  });

  it("should map positions on the page to positions in the list", () => {
    const pager: DebugPager = new DebugPager(10);

    expect(pager.getListIndex(1)).toBe(1);

    pager.turn(1, 25);

    expect(pager.getListIndex(1)).toBe(11);
    expect(pager.getListIndex(0)).toBe(10);
  });
});
