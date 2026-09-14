import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { AnyCallable, AnyObject } from "xray16/lib";

import { getManager } from "@/engine/core/database";
import { EGameEvent, EventsManager } from "@/engine/core/managers/events";
import { resetRegistry } from "@/fixtures/engine";

describe("EventsManager", () => {
  beforeEach(() => {
    resetRegistry();
  });

  it("should correctly initialize", () => {
    const manager: EventsManager = getManager(EventsManager);

    expect(table.size(manager.callbacks)).toBe(130);

    Object.keys(manager.callbacks).forEach((it) => {
      expect(table.size(manager.callbacks[it as unknown as EGameEvent])).toBe(0);
    });

    expect(manager.getSubscribersCount()).toBe(0);
  });

  it("should correctly add listeners", () => {
    const manager: EventsManager = getManager(EventsManager);
    const contextObject: AnyObject = {};

    const mockFn: AnyCallable = jest.fn(function (this: unknown, param: number) {
      expect(this).toBe(contextObject);
      expect(param).toBe(255);
    });

    manager.emitEvent(EGameEvent.ACTOR_UPDATE, 255);
    manager.registerCallback(EGameEvent.ACTOR_UPDATE, mockFn, contextObject);
    manager.emitEvent(EGameEvent.ACTOR_UPDATE, 255);
    manager.emitEvent(EGameEvent.ACTOR_UPDATE, 255);

    expect(mockFn).toHaveBeenCalledTimes(2);
    expect(table.size(manager.callbacks[EGameEvent.ACTOR_UPDATE])).toBe(1);
    expect(manager.getEventSubscribersCount(EGameEvent.ACTOR_UPDATE)).toBe(1);

    manager.unregisterCallback(EGameEvent.ACTOR_UPDATE, mockFn);
    EventsManager.emitEvent(EGameEvent.ACTOR_UPDATE, 255);

    expect(mockFn).toHaveBeenCalledTimes(2);
    expect(table.size(manager.callbacks[EGameEvent.ACTOR_UPDATE])).toBe(0);
    expect(manager.getEventSubscribersCount(EGameEvent.ACTOR_UPDATE)).toBe(0);
  });
});
