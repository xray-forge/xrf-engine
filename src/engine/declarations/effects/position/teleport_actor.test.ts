import { beforeAll, beforeEach, describe, expect, it } from "@jest/globals";
import { patrol } from "xray16";
import { MockGameObject } from "xray16/mocks";

import { callXrEffect, mockRegisteredActor, resetRegistry } from "@/fixtures/engine";

beforeAll(() => {
  require("@/engine/declarations/effects/position/teleport_actor");
});

beforeEach(() => {
  resetRegistry();
});

describe("teleport_actor", () => {
  it("should teleport actors", () => {
    const { actorGameObject } = mockRegisteredActor();

    expect(() => callXrEffect("teleport_actor", MockGameObject.mockActor(), MockGameObject.mock())).toThrow(
      "Wrong parameters in 'teleport_actor' effect."
    );

    callXrEffect("teleport_actor", actorGameObject, MockGameObject.mock(), "test-wp");

    expect(actorGameObject.set_actor_direction).toHaveBeenCalledTimes(0);
    expect(actorGameObject.set_actor_position).toHaveBeenCalledWith(new patrol("test-wp").point(0));

    callXrEffect("teleport_actor", actorGameObject, MockGameObject.mock(), "test-wp-2", "test-wp-3");

    expect(actorGameObject.set_actor_direction).toHaveBeenCalledWith(expect.closeTo(-1.5707));
    expect(actorGameObject.set_actor_position).toHaveBeenCalledWith(new patrol("test-wp-2").point(0));
  });
});
