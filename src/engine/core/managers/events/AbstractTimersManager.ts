import { time_global } from "xray16";
import { AnyCallable, AnyObject, assert, LuaArray, Nillable, TCount, TDuration, TIndex, TTimestamp } from "xray16/lib";
import { $filename, $isNil } from "xray16/macros";

import { getManager } from "@/engine/core/database";
import { AbstractManager } from "@/engine/core/managers/abstract";
import { IIntervalDescriptor, ITimeoutDescriptor, ITimersList } from "@/engine/core/managers/events/events_types";
import { LuaLogger } from "@/engine/core/utils/logging";

const logger: LuaLogger = new LuaLogger($filename);

/**
 * Abstract intervals manager.
 * Timers registered during a tick are first checked by the next one, removed ones are not called again.
 */
export class AbstractTimersManager extends AbstractManager {
  /**
   * @param callback - Functor to call on defined period.
   * @param period - Period time to call functor, expect values bigger than 50.
   * @returns Cancel, descriptor, callback.
   */
  public static registerGameInterval(
    callback: (offset: TDuration) => void,
    period: TDuration
  ): LuaMultiReturn<[AnyCallable, IIntervalDescriptor, AnyCallable]> {
    return getManager(this).registerGameInterval(callback, period);
  }

  /**
   * @param callback - Functor to call after delay.
   * @param delay - Delay time.
   * @returns Cancel, descriptor, callback.
   */
  public static registerGameTimeout(
    callback: (offset: TDuration) => void,
    delay?: TDuration
  ): LuaMultiReturn<[AnyCallable, ITimeoutDescriptor, AnyCallable]> {
    return getManager(this).registerGameTimeout(callback, delay || 0);
  }

  public readonly intervals: ITimersList<IIntervalDescriptor> = {
    timers: new LuaTable(),
    slots: new LuaTable(),
    slotsCount: 0,
    count: 0,
  };

  public readonly timeouts: ITimersList<ITimeoutDescriptor> = {
    timers: new LuaTable(),
    slots: new LuaTable(),
    slotsCount: 0,
    count: 0,
  };

  // Whether timers are being checked, removed timers only empty their slots until it ends.
  public isTicking: boolean = false;

  /**
   * Register game interval to call it every `period` time when possible.
   * Guarantees that callback will be called on period and not frequently than `period` time.
   * Some offsets/delays may happen so actual call offset is supplied as parameter to each callback call.
   *
   * @param callback - Functor to call on defined period.
   * @param period - Period time to call functor, expect values bigger than 50.
   * @returns Cancel, descriptor, callback.
   */
  public registerGameInterval(
    callback: (offset: TDuration) => void,
    period: TDuration
  ): LuaMultiReturn<[AnyCallable, IIntervalDescriptor, AnyCallable]> {
    logger.info("Register new interval: %s", period);

    assert(period >= 50, "Low value interval may be problematic.");

    const descriptor: IIntervalDescriptor = { callback, period, last: time_global() };

    this.addTimer(this.intervals, descriptor);

    return $multi(() => this.unregisterGameInterval(descriptor), descriptor, callback);
  }

  /**
   * Unregister game interval.
   *
   * @param descriptor - Descriptor of interval to stop.
   */
  public unregisterGameInterval(descriptor: IIntervalDescriptor): void {
    if (this.removeTimer(this.intervals, descriptor)) {
      logger.info("Unregister interval: %s", descriptor.period);
    } else {
      logger.info("Tried to unregister not existing interval");
    }
  }

  /**
   * Register game timeout to call function after some `delay` time when possible.
   * Guarantees that callback will be called only after certain period of time once.
   * Some offsets/delays may happen so actual call offset is supplied as parameter when calling delayed function.
   *
   * @param callback - Functor to call after delay.
   * @param delay - Delay time.
   * @returns Cancel, descriptor, callback.
   */
  public registerGameTimeout(
    callback: (offset: TDuration) => void,
    delay: TDuration
  ): LuaMultiReturn<[AnyCallable, ITimeoutDescriptor, AnyCallable]> {
    const now: TTimestamp = time_global();
    const descriptor: ITimeoutDescriptor = { callback, delay, last: now };

    logger.info("Register new timeout: %s %s", delay, now);

    this.addTimer(this.timeouts, descriptor);

    return $multi(() => this.unregisterGameTimeout(descriptor), descriptor, callback);
  }

  /**
   * Unregister game timeout.
   *
   * @param descriptor - Descriptor of timeout to stop.
   */
  public unregisterGameTimeout(descriptor: ITimeoutDescriptor): void {
    if (this.removeTimer(this.timeouts, descriptor)) {
      logger.info("Unregister timeout: %s", descriptor.delay);
    } else {
      logger.info("Tried to unregister not existing timeout");
    }
  }

  /**
   * On game update tick.
   * Based on actor game object - when game is paused / in menu it does not count.
   */
  public tick(): void {
    const intervalsCount: TCount = this.intervals.slotsCount;
    const timeoutsCount: TCount = this.timeouts.slotsCount;

    if (intervalsCount === 0 && timeoutsCount === 0) {
      return;
    }

    const now: TTimestamp = time_global();
    const intervals: LuaArray<IIntervalDescriptor | false> = this.intervals.timers;
    const timeouts: LuaArray<ITimeoutDescriptor | false> = this.timeouts.timers;

    this.isTicking = true;

    for (const slot of $range(1, intervalsCount)) {
      const descriptor: IIntervalDescriptor | false = intervals.get(slot);

      if (descriptor) {
        const diff: TDuration = now - descriptor.last;

        if (diff >= descriptor.period) {
          descriptor.last = now;
          descriptor.callback(diff);
        }
      }
    }

    for (const slot of $range(1, timeoutsCount)) {
      const descriptor: ITimeoutDescriptor | false = timeouts.get(slot);

      if (descriptor) {
        const diff: TDuration = now - descriptor.last;

        if (diff >= descriptor.delay) {
          this.removeTimer(this.timeouts, descriptor);
          descriptor.callback(diff);
        }
      }
    }

    this.isTicking = false;

    this.compactTimers(this.intervals);
    this.compactTimers(this.timeouts);
  }

  /**
   * @returns Count of active intervals.
   */
  public getIntervalsCount(): TCount {
    return this.intervals.count;
  }

  /**
   * @returns Count of active timeouts.
   */
  public getTimeoutsCount(): TCount {
    return this.timeouts.count;
  }

  /**
   * @param list - Timers to add to.
   * @param descriptor - Timer to add.
   */
  protected addTimer<T extends AnyObject>(list: ITimersList<T>, descriptor: T): void {
    const slot: TIndex = list.slotsCount + 1;

    list.timers.set(slot, descriptor);
    list.slots.set(descriptor, slot);
    list.slotsCount = slot;
    list.count += 1;
  }

  /**
   * @param list - Timers to remove from.
   * @param descriptor - Timer to remove.
   * @returns Whether the timer was registered.
   */
  protected removeTimer<T extends AnyObject>(list: ITimersList<T>, descriptor: T): boolean {
    const slot: Nillable<TIndex> = list.slots.get(descriptor);

    if ($isNil(slot)) {
      return false;
    }

    list.slots.delete(descriptor);
    list.timers.set(slot, false);
    list.count -= 1;

    if (!this.isTicking) {
      this.compactTimers(list);
    }

    return true;
  }

  /**
   * Move registered timers over the emptied slots of removed ones, keeping their order.
   *
   * @param list - Timers to compact.
   */
  protected compactTimers<T extends AnyObject>(list: ITimersList<T>): void {
    const slotsCount: TCount = list.slotsCount;

    if (slotsCount === list.count) {
      return;
    }

    const timers: LuaArray<T | false> = list.timers;
    let kept: TIndex = 0;

    for (const slot of $range(1, slotsCount)) {
      const descriptor: T | false = timers.get(slot);

      if (descriptor) {
        kept += 1;

        if (kept !== slot) {
          timers.set(kept, descriptor);
          list.slots.set(descriptor, kept);
        }
      }
    }

    for (const slot of $range(kept + 1, slotsCount)) {
      timers.delete(slot);
    }

    list.slotsCount = kept;
  }
}
