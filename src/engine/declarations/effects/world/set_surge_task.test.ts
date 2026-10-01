import { beforeAll, beforeEach, describe, expect, it } from "@jest/globals";
import { MockGameObject } from "xray16/mocks";

import { getManager } from "@/engine/core/database";
import { SurgeManager } from "@/engine/core/managers/surge";
import { callXrEffect, resetRegistry } from "@/fixtures/engine";

beforeAll(() => {
  require("@/engine/declarations/effects/world/set_surge_task");
});

beforeEach(() => {
  resetRegistry();
});

describe("set_surge_task", () => {
  it("should set the task given to hide from the next surge", () => {
    const surgeManager: SurgeManager = getManager(SurgeManager);

    callXrEffect("set_surge_task", MockGameObject.mockActor(), MockGameObject.mock(), "surge_task");

    expect(surgeManager.surgeTaskSection).toBe("surge_task");

    callXrEffect("set_surge_task", MockGameObject.mockActor(), MockGameObject.mock(), "empty");

    expect(surgeManager.surgeTaskSection).toBe("empty");
  });
});
