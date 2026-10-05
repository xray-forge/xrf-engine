import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { AnyCallable, AnyObject } from "xray16/lib";

import { getManager } from "@/engine/core/database";
import { EGameEvent, EventsManager, IEventSubscribers } from "@/engine/core/managers/events";
import { resetRegistry } from "@/fixtures/engine";

describe("EventsManager", () => {
  beforeEach(() => {
    resetRegistry();
  });

  it("should correctly initialize", () => {
    const manager: EventsManager = getManager(EventsManager);

    expect(Object.keys(manager.subscribers)).toHaveLength(137);

    Object.keys(manager.subscribers).forEach((it) => {
      expect(manager.getEventSubscribersCount(it as unknown as EGameEvent)).toBe(0);
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
    expect(manager.getEventSubscribersCount(EGameEvent.ACTOR_UPDATE)).toBe(1);
    expect(manager.getSubscribersCount()).toBe(1);

    manager.unregisterCallback(EGameEvent.ACTOR_UPDATE, mockFn);
    EventsManager.emitEvent(EGameEvent.ACTOR_UPDATE, 255);

    expect(mockFn).toHaveBeenCalledTimes(2);
    expect(manager.getEventSubscribersCount(EGameEvent.ACTOR_UPDATE)).toBe(0);
    expect(manager.getSubscribersCount()).toBe(0);
  });

  it("should call plain functions without context and pass every argument", () => {
    const manager: EventsManager = getManager(EventsManager);
    const callback: AnyCallable = jest.fn();

    manager.registerCallback(EGameEvent.ACTOR_UPDATE, callback);
    manager.emitEvent(EGameEvent.ACTOR_UPDATE, 1, "two", 3);

    expect(callback).toHaveBeenCalledWith(1, "two", 3);
  });

  it("should call callbacks in subscription order", () => {
    const manager: EventsManager = getManager(EventsManager);
    const calls: Array<string> = [];

    manager.registerCallback(EGameEvent.ACTOR_UPDATE, () => calls.push("first"));
    manager.registerCallback(EGameEvent.ACTOR_UPDATE, () => calls.push("second"));
    manager.registerCallback(EGameEvent.ACTOR_UPDATE, () => calls.push("third"));

    manager.emitEvent(EGameEvent.ACTOR_UPDATE);

    expect(calls).toEqual(["first", "second", "third"]);
  });

  it("should replace the context of a callback subscribed again", () => {
    const manager: EventsManager = getManager(EventsManager);
    const first: AnyObject = {};
    const second: AnyObject = {};
    const contexts: Array<unknown> = [];
    const callback: AnyCallable = jest.fn(function (this: unknown) {
      contexts.push(this);
    });

    manager.registerCallback(EGameEvent.ACTOR_UPDATE, callback, first);
    manager.registerCallback(EGameEvent.ACTOR_UPDATE, callback, second);
    manager.emitEvent(EGameEvent.ACTOR_UPDATE);

    expect(manager.getEventSubscribersCount(EGameEvent.ACTOR_UPDATE)).toBe(1);
    expect(contexts).toEqual([second]);
  });

  it("should not call callbacks unsubscribed while the event is emitted", () => {
    const manager: EventsManager = getManager(EventsManager);
    const later: AnyCallable = jest.fn();
    const first: AnyCallable = jest.fn(() => manager.unregisterCallback(EGameEvent.ACTOR_UPDATE, later));

    manager.registerCallback(EGameEvent.ACTOR_UPDATE, first);
    manager.registerCallback(EGameEvent.ACTOR_UPDATE, later);
    manager.emitEvent(EGameEvent.ACTOR_UPDATE);

    expect(first).toHaveBeenCalledTimes(1);
    expect(later).not.toHaveBeenCalled();
    expect(manager.getEventSubscribersCount(EGameEvent.ACTOR_UPDATE)).toBe(1);
  });

  it("should keep calling the other callbacks when one unsubscribes itself", () => {
    const manager: EventsManager = getManager(EventsManager);
    const once: AnyCallable = jest.fn(() => manager.unregisterCallback(EGameEvent.ACTOR_UPDATE, once));
    const after: AnyCallable = jest.fn();

    manager.registerCallback(EGameEvent.ACTOR_UPDATE, once);
    manager.registerCallback(EGameEvent.ACTOR_UPDATE, after);
    manager.emitEvent(EGameEvent.ACTOR_UPDATE);
    manager.emitEvent(EGameEvent.ACTOR_UPDATE);

    expect(once).toHaveBeenCalledTimes(1);
    expect(after).toHaveBeenCalledTimes(2);
  });

  it("should call callbacks subscribed while the event is emitted from its next emit", () => {
    const manager: EventsManager = getManager(EventsManager);
    const added: AnyCallable = jest.fn();
    const first: AnyCallable = jest.fn(() => manager.registerCallback(EGameEvent.ACTOR_UPDATE, added));

    manager.registerCallback(EGameEvent.ACTOR_UPDATE, first);
    manager.emitEvent(EGameEvent.ACTOR_UPDATE);

    expect(added).not.toHaveBeenCalled();

    manager.emitEvent(EGameEvent.ACTOR_UPDATE);

    expect(added).toHaveBeenCalledTimes(1);
  });

  it("should compact emptied slots only once nested emits of the event end", () => {
    const manager: EventsManager = getManager(EventsManager);
    const subscribers: IEventSubscribers = manager.subscribers[EGameEvent.ACTOR_UPDATE];
    const removed: AnyCallable = jest.fn();
    const kept: AnyCallable = jest.fn();
    let depth: number = 0;

    const nesting: AnyCallable = jest.fn(() => {
      depth += 1;

      if (depth === 1) {
        manager.emitEvent(EGameEvent.ACTOR_UPDATE);
        manager.unregisterCallback(EGameEvent.ACTOR_UPDATE, removed);

        expect(subscribers.slotsCount).toBe(3);
      }
    });

    manager.registerCallback(EGameEvent.ACTOR_UPDATE, nesting);
    manager.registerCallback(EGameEvent.ACTOR_UPDATE, removed);
    manager.registerCallback(EGameEvent.ACTOR_UPDATE, kept);
    manager.emitEvent(EGameEvent.ACTOR_UPDATE);

    expect(removed).toHaveBeenCalledTimes(1);
    expect(kept).toHaveBeenCalledTimes(2);
    expect(subscribers.emitting).toBe(0);
    expect(subscribers.slotsCount).toBe(2);
    expect(subscribers.count).toBe(2);
    expect(subscribers.slots.get(kept)).toBe(2);
  });

  it("should ignore unsubscribing callbacks that are not subscribed", () => {
    const manager: EventsManager = getManager(EventsManager);

    expect(() => manager.unregisterCallback(EGameEvent.ACTOR_UPDATE, jest.fn())).not.toThrow();
    expect(manager.getEventSubscribersCount(EGameEvent.ACTOR_UPDATE)).toBe(0);
  });

  it("should fail on events that are not declared", () => {
    const manager: EventsManager = getManager(EventsManager);

    expect(() => manager.registerCallback(-1 as EGameEvent, jest.fn())).toThrow("Callback name '-1' is unknown.");
  });
});
