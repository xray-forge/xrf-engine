import { describe, expect, it, jest } from "@jest/globals";
import { level } from "xray16";

import { EGameEvent, EventsManager } from "@/engine/core/managers/events";
import { forwardGameTime } from "@/engine/core/utils/game/game_time";

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
