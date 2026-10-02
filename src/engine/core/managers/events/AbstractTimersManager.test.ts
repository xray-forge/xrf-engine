import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { time_global } from "xray16";
import { getFunctionMock } from "xray16/testing/utils";

import { getManager } from "@/engine/core/database";
import { AbstractTimersManager } from "@/engine/core/managers/events/AbstractTimersManager";
import { resetRegistry } from "@/fixtures/engine";

describe("AbstractTimersManager", () => {
  class TimersManager extends AbstractTimersManager {}

  beforeEach(() => {
    resetRegistry();
  });

  it("should correctly initialize", () => {
    const manager: TimersManager = getManager(TimersManager);

    expect(manager.intervals.slotsCount).toBe(0);
    expect(manager.timeouts.slotsCount).toBe(0);

    expect(manager.getIntervalsCount()).toBe(0);
    expect(manager.getTimeoutsCount()).toBe(0);
  });

  it("should correctly call ticks for timeouts and cancel them", () => {
    jest.spyOn(Date, "now").mockImplementation(() => 200);

    const manager: TimersManager = getManager(TimersManager);
    const timeout = jest.fn();
    const [, descriptor, callback] = manager.registerGameTimeout(timeout, 1000);

    expect(callback).toBe(timeout);
    expect(callback).not.toHaveBeenCalled();
    expect(descriptor).toEqual({ delay: 1000, callback, last: 200 });
    expect(manager.getTimeoutsCount()).toBe(1);

    manager.tick();

    expect(manager.getTimeoutsCount()).toBe(1);
    expect(callback).not.toHaveBeenCalled();

    jest.spyOn(Date, "now").mockImplementation(() => 1100);
    manager.tick();

    expect(manager.getTimeoutsCount()).toBe(1);
    expect(callback).not.toHaveBeenCalled();

    jest.spyOn(Date, "now").mockImplementation(() => 1250);
    manager.tick();

    expect(manager.getTimeoutsCount()).toBe(0);
    expect(callback).toHaveBeenCalledWith(1050);

    const nextTimeout = jest.fn();
    const [cancel, nextDescriptor, nextCallback] = manager.registerGameTimeout(nextTimeout, 555);

    expect(nextDescriptor).toEqual({ delay: 555, callback: nextTimeout, last: 1250 });
    expect(manager.getTimeoutsCount()).toBe(1);

    cancel();
    expect(manager.getTimeoutsCount()).toBe(0);

    jest.spyOn(Date, "now").mockImplementation(() => 999999);
    manager.tick();

    expect(manager.getTimeoutsCount()).toBe(0);
    expect(nextCallback).not.toHaveBeenCalled();
  });

  it("should correctly call ticks for intervals and cancel them", () => {
    jest.spyOn(Date, "now").mockImplementation(() => 100);

    const manager: TimersManager = getManager(TimersManager);
    const first = jest.fn();
    const second = jest.fn();
    const [, firstDescriptor, firstCallback] = manager.registerGameInterval(first, 500);
    const [cancel, secondDescriptor, secondCallback] = manager.registerGameInterval(second, 600);

    expect(firstDescriptor).toEqual({ period: 500, callback: first, last: 100 });
    expect(secondDescriptor).toEqual({ period: 600, callback: second, last: 100 });

    jest.spyOn(Date, "now").mockImplementation(() => 750);
    manager.tick();

    expect(firstCallback).toHaveBeenCalledWith(650);
    expect(firstCallback).toHaveBeenCalledWith(650);

    jest.spyOn(Date, "now").mockImplementation(() => 1250);
    manager.tick();

    expect(firstCallback).toHaveBeenCalledTimes(2);
    expect(secondCallback).toHaveBeenCalledTimes(1);
    expect(manager.getIntervalsCount()).toBe(2);

    cancel();

    jest.spyOn(Date, "now").mockImplementation(() => 2000);
    manager.tick();

    expect(firstCallback).toHaveBeenCalledTimes(3);
    expect(firstCallback).toHaveBeenNthCalledWith(3, 750);
    expect(secondCallback).toHaveBeenCalledTimes(1);
    expect(manager.getIntervalsCount()).toBe(1);
  });

  it("should not read time on ticks without timers", () => {
    const manager: TimersManager = getManager(TimersManager);

    getFunctionMock(time_global).mockClear();
    manager.tick();

    expect(time_global).not.toHaveBeenCalled();
  });

  it("should check timeouts registered during a tick from the next one", () => {
    jest.spyOn(Date, "now").mockImplementation(() => 100);

    const manager: TimersManager = getManager(TimersManager);
    const added = jest.fn();

    manager.registerGameTimeout(() => manager.registerGameTimeout(added, 0), 0);
    manager.tick();

    expect(added).not.toHaveBeenCalled();
    expect(manager.getTimeoutsCount()).toBe(1);

    manager.tick();

    expect(added).toHaveBeenCalledTimes(1);
    expect(manager.getTimeoutsCount()).toBe(0);
    expect(manager.timeouts.slotsCount).toBe(0);
  });

  it("should not call timers cancelled during a tick", () => {
    jest.spyOn(Date, "now").mockImplementation(() => 100);

    const manager: TimersManager = getManager(TimersManager);
    const later = jest.fn();
    const kept = jest.fn();

    manager.registerGameInterval(() => cancel(), 50);

    const [cancel] = manager.registerGameInterval(later, 50);

    manager.registerGameInterval(kept, 50);

    jest.spyOn(Date, "now").mockImplementation(() => 200);
    manager.tick();

    expect(later).not.toHaveBeenCalled();
    expect(kept).toHaveBeenCalledTimes(1);
    expect(manager.getIntervalsCount()).toBe(2);
    expect(manager.intervals.slotsCount).toBe(2);
  });
});
