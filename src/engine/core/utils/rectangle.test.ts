import { describe, expect, it } from "@jest/globals";
import { Frect } from "xray16";

import { createScreenRectangle } from "@/engine/core/utils/rectangle";

describe("createScreenRectangle", () => {
  it("should correctly create rectangles describing screen", () => {
    const rectangle: Frect = createScreenRectangle();

    expect(rectangle.x1).toBe(0);
    expect(rectangle.y1).toBe(0);
    expect(rectangle.x2).toBe(1024);
    expect(rectangle.y2).toBe(768);
  });
});
