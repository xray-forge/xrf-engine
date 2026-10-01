import { beforeAll, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { GameObject, ServerObject } from "xray16/alias";
import { MockAlifeObject, MockGameObject } from "xray16/mocks";

import { registerSimulator, registry } from "@/engine/core/database";
import { EGameEvent, EventsManager } from "@/engine/core/managers/events";
import { ENotificationDirection, ENotificationType } from "@/engine/core/managers/notifications/notifications_types";
import { callXrEffect, mockRegisteredActor, resetRegistry } from "@/fixtures/engine";

beforeAll(() => {
  require("@/engine/declarations/effects/actor/remove_item");
});

beforeEach(() => {
  resetRegistry();
  registerSimulator();
});

describe("remove_item", () => {
  it("should release items from actor inventory", () => {
    const item: GameObject = MockGameObject.mock({ section: "test_section" });
    const serverItem: ServerObject = MockAlifeObject.mock({ id: item.id() });
    const { actorGameObject } = mockRegisteredActor({ inventory: [["test_section", item]] });

    jest.spyOn(EventsManager, "emitEvent");

    expect(() => callXrEffect("remove_item", actorGameObject, MockGameObject.mock())).toThrow(
      "Wrong parameters in function 'remove_item'."
    );
    expect(() => callXrEffect("remove_item", actorGameObject, MockGameObject.mock(), "not_existing")).toThrow(
      "Actor has no item to remove with section 'not_existing'."
    );

    callXrEffect("remove_item", actorGameObject, MockGameObject.mock(), "test_section");

    expect(registry.simulator.release).toHaveBeenCalledTimes(1);
    expect(registry.simulator.release).toHaveBeenCalledWith(serverItem, true);
    expect(EventsManager.emitEvent).toHaveBeenCalledTimes(1);
    expect(EventsManager.emitEvent).toHaveBeenCalledWith(EGameEvent.NOTIFICATION, {
      type: ENotificationType.ITEM,
      direction: ENotificationDirection.OUT,
      itemSection: "test_section",
    });
  });
});
