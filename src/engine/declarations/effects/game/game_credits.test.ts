import { beforeAll, beforeEach, describe, expect, it } from "@jest/globals";
import { game } from "xray16";
import { MockGameObject } from "xray16/mocks";
import { resetFunctionMock } from "xray16/testing/utils";

import { getManager } from "@/engine/core/database";
import { GameOutroManager } from "@/engine/core/managers/outro";
import { callXrEffect, resetRegistry } from "@/fixtures/engine";

beforeAll(() => {
  require("@/engine/declarations/effects/game/game_credits");
});

beforeEach(() => {
  resetRegistry();
  resetFunctionMock(game.start_tutorial);
});

describe("game_credits", () => {
  it("should correctly show game credits", () => {
    expect(game.start_tutorial).toHaveBeenCalledTimes(0);

    callXrEffect("game_credits", MockGameObject.mockActor(), MockGameObject.mock());

    expect(game.start_tutorial).toHaveBeenCalledTimes(1);
    expect(game.start_tutorial).toHaveBeenCalledWith("credits_seq");
    expect(getManager(GameOutroManager).isGameoverCreditsStarted).toBe(true);
  });
});
