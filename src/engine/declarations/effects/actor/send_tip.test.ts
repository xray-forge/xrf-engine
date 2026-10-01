import { beforeAll, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { MockGameObject } from "xray16/mocks";

import { EGameEvent, EventsManager } from "@/engine/core/managers/events";
import { ENotificationType } from "@/engine/core/managers/notifications/notifications_types";
import { callXrEffect, resetRegistry } from "@/fixtures/engine";

beforeAll(() => {
  require("@/engine/declarations/effects/actor/send_tip");
});

beforeEach(() => {
  resetRegistry();
});

describe("send_tip", () => {
  it("should send notifications for actor", () => {
    jest.spyOn(EventsManager, "emitEvent");

    expect(() => callXrEffect("send_tip", MockGameObject.mockActor(), MockGameObject.mock())).toThrow(
      "Expected caption to be provided for sent_tip effect."
    );

    callXrEffect(
      "send_tip",
      MockGameObject.mockActor(),
      MockGameObject.mock(),
      "test-caption",
      "test-icon",
      "test-sender"
    );

    expect(EventsManager.emitEvent).toHaveBeenCalledTimes(1);
    expect(EventsManager.emitEvent).toHaveBeenCalledWith(EGameEvent.NOTIFICATION, {
      type: ENotificationType.TIP,
      caption: "test-caption",
      sender: "test-icon",
      senderId: "test-sender",
    });
  });
});
