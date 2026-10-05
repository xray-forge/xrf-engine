import { describe, expect, it } from "@jest/globals";
import { GameObject } from "xray16/alias";
import { MockGameObject } from "xray16/mocks";

import { restoreObjectCondition } from "@/engine/core/utils/object/object_condition";

describe("restoreObjectCondition", () => {
  it("should fully restore a creature", () => {
    const object: GameObject = MockGameObject.mock({ bleeding: 0.5, health: 0.4, power: 0.3, radiation: 0.2 });

    restoreObjectCondition(object);

    expect(object.health).toBe(1);
    expect(object.power).toBe(1);
    expect(object.radiation).toBe(0);
    expect(object.bleeding).toBe(0);
  });

  it("should leave a healthy creature as it is", () => {
    const object: GameObject = MockGameObject.mock({ bleeding: 0, health: 1, power: 1, radiation: 0 });

    restoreObjectCondition(object);

    expect(object.health).toBe(1);
    expect(object.power).toBe(1);
    expect(object.radiation).toBe(0);
    expect(object.bleeding).toBe(0);
  });
});
