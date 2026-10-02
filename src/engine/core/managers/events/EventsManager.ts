import {
  AnyArgs,
  AnyCallable,
  AnyContextualCallable,
  AnyObject,
  assert,
  LuaArray,
  Nillable,
  TCount,
  TIndex,
} from "xray16/lib";
import { $isNil, $isNotNil } from "xray16/macros";

import { getManager } from "@/engine/core/database";
import { AbstractTimersManager } from "@/engine/core/managers/events/AbstractTimersManager";
import { EGameEvent, IEventSubscribers } from "@/engine/core/managers/events/events_types";

/**
 * Manager to dispatch and subscribe to custom global events.
 */
export class EventsManager extends AbstractTimersManager {
  /**
   * Emit event directly from class statics for simplicity.
   *
   * @param event - Event type to emit.
   * @param data - Event parameters.
   */
  public static emitEvent<T>(event: EGameEvent, data: T): void;
  public static emitEvent(event: EGameEvent, ...data: AnyArgs): void;
  public static emitEvent(event: EGameEvent, ...data: AnyArgs): void {
    return getManager(EventsManager).emitEvent(event, ...data);
  }

  // Initialize list of all enum handlers. Note TSTL map created instead for enum.
  public readonly subscribers: Record<EGameEvent, IEventSubscribers> = Object.values(EGameEvent).reduce(
    (acc, it) => {
      if (type(it) === "number") {
        acc[it as EGameEvent] = {
          callbacks: new LuaTable(),
          contexts: new LuaTable(),
          slots: new LuaTable(),
          slotsCount: 0,
          count: 0,
          emitting: 0,
        };
      }

      return acc;
    },
    {} as Record<EGameEvent, IEventSubscribers>
  );

  /**
   * Register callback and subscribe to event, subscribing it again replaces its context.
   * Context parameter is needed to do a proper call of listeners.
   *
   * @param event - Type of event to register callback.
   * @param callback - Callback to register for event.
   * @param context To call callback at.
   */
  public registerCallback<T extends AnyObject>(event: EGameEvent, callback: AnyContextualCallable<T>, context: T): void;
  public registerCallback(event: EGameEvent, callback: AnyCallable): void;
  public registerCallback<T extends AnyObject>(
    event: EGameEvent,
    callback: AnyContextualCallable<T>,
    context: Nillable<T> = null
  ): void {
    this.assertEventIsDeclared(event);

    const subscribers: IEventSubscribers = this.subscribers[event];
    const subscriber: AnyCallable = callback as unknown as AnyCallable;
    const existing: Nillable<TIndex> = subscribers.slots.get(subscriber);

    if ($isNotNil(existing)) {
      subscribers.contexts.set(existing, context ?? false);

      return;
    }

    const slot: TIndex = subscribers.slotsCount + 1;

    subscribers.callbacks.set(slot, subscriber);
    subscribers.contexts.set(slot, context ?? false);
    subscribers.slots.set(subscriber, slot);
    subscribers.slotsCount = slot;
    subscribers.count += 1;
  }

  /**
   * Unregister provided callback from event.
   *
   * @param event - Type of event to unregister callback.
   * @param callback - Callback to unregister for event.
   */
  public unregisterCallback(event: EGameEvent, callback: AnyContextualCallable): void;
  public unregisterCallback(event: EGameEvent, callback: AnyCallable): void {
    this.assertEventIsDeclared(event);

    const subscribers: IEventSubscribers = this.subscribers[event];
    const slot: Nillable<TIndex> = subscribers.slots.get(callback);

    if ($isNil(slot)) {
      return;
    }

    subscribers.slots.delete(callback);
    subscribers.callbacks.set(slot, false);
    subscribers.contexts.set(slot, false);
    subscribers.count -= 1;

    if (subscribers.emitting === 0) {
      this.compactSubscribers(subscribers);
    }
  }

  /**
   * Emit custom event and trigger all registered callbacks.
   * Callbacks subscribed during the emit are first called by the next one, unsubscribed ones are not called again.
   *
   * @param event - Type of event to emit.
   * @param data - Arguments for event emit.
   */
  public emitEvent<T>(event: EGameEvent, data: T): void;
  public emitEvent(event: EGameEvent, ...data: AnyArgs): void;
  public emitEvent(event: EGameEvent, ...data: AnyArgs): void {
    const subscribers: IEventSubscribers = this.subscribers[event];
    const slotsCount: TCount = subscribers.slotsCount;

    if (slotsCount === 0) {
      return;
    }

    const callbacks: LuaArray<AnyCallable | false> = subscribers.callbacks;
    const contexts: LuaArray<AnyObject | false> = subscribers.contexts;

    subscribers.emitting += 1;

    for (const slot of $range(1, slotsCount)) {
      const callback: AnyCallable | false = callbacks.get(slot);

      if (callback) {
        const context: AnyObject | false = contexts.get(slot);

        if (context) {
          (callback as unknown as AnyContextualCallable).call(context, ...data);
        } else {
          callback(...data);
        }
      }
    }

    subscribers.emitting -= 1;

    if (subscribers.emitting === 0 && subscribers.slotsCount !== subscribers.count) {
      this.compactSubscribers(subscribers);
    }
  }

  /**
   * Get count of subscribers active in manager.
   *
   * @returns Subscribers to manager count.
   */
  public getSubscribersCount(): TCount {
    let count: TCount = 0;

    for (const subscribers of Object.values(this.subscribers)) {
      count += subscribers.count;
    }

    return count;
  }

  /**
   * Get count of subscribers active in manager.
   *
   * @param event - Event to check.
   * @returns Count of event subscribers.
   */
  public getEventSubscribersCount(event: EGameEvent): TCount {
    return this.subscribers[event].count;
  }

  /**
   * Assert provided event type is already registered and can be used in game.
   *
   * @param event - Event to assert declaration in list of callbacks.
   */
  public assertEventIsDeclared(event: EGameEvent): void {
    assert(this.subscribers[event], "Callback name '%s' is unknown.", event);
  }

  /**
   * Move subscribed callbacks over the emptied slots of unsubscribed ones, keeping their order.
   *
   * @param subscribers - Subscribers of the event to compact.
   */
  protected compactSubscribers(subscribers: IEventSubscribers): void {
    const callbacks: LuaArray<AnyCallable | false> = subscribers.callbacks;
    const contexts: LuaArray<AnyObject | false> = subscribers.contexts;
    const slotsCount: TCount = subscribers.slotsCount;
    let kept: TIndex = 0;

    for (const slot of $range(1, slotsCount)) {
      const callback: AnyCallable | false = callbacks.get(slot);

      if (callback) {
        kept += 1;

        if (kept !== slot) {
          callbacks.set(kept, callback);
          contexts.set(kept, contexts.get(slot));
          subscribers.slots.set(callback, kept);
        }
      }
    }

    for (const slot of $range(kept + 1, slotsCount)) {
      callbacks.delete(slot);
      contexts.delete(slot);
    }

    subscribers.slotsCount = kept;
  }
}
