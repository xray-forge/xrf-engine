import { describe, expect, it, jest } from "@jest/globals";
import { game, level } from "xray16";
import { Time } from "xray16/alias";
import { createTime } from "xray16/lib";

import { EGameEvent, EventsManager } from "@/engine/core/managers/events";
import { forwardGameTime, getTimeAfter } from "@/engine/core/utils/game/game_time";

describe("forwardGameTime", () => {
  it("should change game time and notify about the jump", () => {
    jest.spyOn(EventsManager, "emitEvent");

    forwardGameTime(2, 15);

    expect(level.change_game_time).toHaveBeenCalledWith(0, 2, 15);
    expect(EventsManager.emitEvent).toHaveBeenCalledWith(EGameEvent.GAME_TIME_FORWARDED);
    expect(jest.mocked(level.change_game_time).mock.invocationCallOrder[0]).toBeLessThan(
      jest.mocked(EventsManager.emitEvent).mock.invocationCallOrder[0]
    );

    forwardGameTime(6);

    expect(level.change_game_time).toHaveBeenCalledWith(0, 6, 0);
  });
});

describe("getTimeAfter", () => {
  it("should create a new engine time the given seconds later", () => {
    const time: Time = createTime(2012, 6, 12, 23, 59, 30, 200);

    jest.mocked(game.CTime).mockClear();

    const result: Time = getTimeAfter(time, 45);

    expect(game.CTime).toHaveBeenCalledTimes(1);
    expect(result).not.toBe(time);
    expect(result.set).toHaveBeenCalledWith(2012, 6, 12, 23, 59, 75, 200);
    expect(time.get(0, 0, 0, 0, 0, 0, 0)).toEqual([2012, 6, 12, 23, 59, 30, 200]);
  });
});
