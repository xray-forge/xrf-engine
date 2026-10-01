import { describe, expect, it, jest } from "@jest/globals";
import { game_graph, level } from "xray16";

import {
  simulationPreconditionAlways,
  simulationPreconditionDay,
  simulationPreconditionLateNight,
  simulationPreconditionNear,
  simulationPreconditionNearAndDay,
  simulationPreconditionNearAndNight,
  simulationPreconditionNearDayFight,
  simulationPreconditionNight,
  simulationPreconditionNotSurge,
  simulationPreconditionSurge,
} from "@/engine/core/managers/simulation/activity/simulation_preconditions";
import { surgeConfig } from "@/engine/core/managers/surge/SurgeConfig";
import { Squad } from "@/engine/core/objects/squad";
import { resetPositionCache } from "@/engine/core/utils/position";
import { MockSquad } from "@/fixtures/engine";

describe("simulationPreconditionAlways", () => {
  it("should always return true", () => {
    expect(simulationPreconditionAlways()).toBe(true);
  });
});

describe("simulationPreconditionSurge", () => {
  it("should check surge activity", () => {
    surgeConfig.IS_STARTED = true;
    expect(simulationPreconditionSurge()).toBe(true);

    surgeConfig.IS_STARTED = false;
    expect(simulationPreconditionSurge()).toBe(false);
  });
});

describe("simulationPreconditionNotSurge", () => {
  it("should check surge activity", () => {
    surgeConfig.IS_STARTED = true;
    expect(simulationPreconditionNotSurge()).toBe(false);

    surgeConfig.IS_STARTED = false;
    expect(simulationPreconditionNotSurge()).toBe(true);
  });
});

describe("simulationPreconditionDay", () => {
  it("should check day time", () => {
    jest.spyOn(level, "get_time_hours").mockImplementation(() => 5);
    expect(simulationPreconditionDay(MockSquad.mock(), MockSquad.mock())).toBe(false);

    jest.spyOn(level, "get_time_hours").mockImplementation(() => 6);
    expect(simulationPreconditionDay(MockSquad.mock(), MockSquad.mock())).toBe(true);

    jest.spyOn(level, "get_time_hours").mockImplementation(() => 12);
    expect(simulationPreconditionDay(MockSquad.mock(), MockSquad.mock())).toBe(true);

    jest.spyOn(level, "get_time_hours").mockImplementation(() => 18);
    expect(simulationPreconditionDay(MockSquad.mock(), MockSquad.mock())).toBe(true);

    jest.spyOn(level, "get_time_hours").mockImplementation(() => 19);
    expect(simulationPreconditionDay(MockSquad.mock(), MockSquad.mock())).toBe(false);
  });
});

describe("simulationPreconditionNight", () => {
  it("should check night time", () => {
    jest.spyOn(level, "get_time_hours").mockImplementation(() => 5);
    expect(simulationPreconditionNight(MockSquad.mock(), MockSquad.mock())).toBe(true);

    jest.spyOn(level, "get_time_hours").mockImplementation(() => 6);
    expect(simulationPreconditionNight(MockSquad.mock(), MockSquad.mock())).toBe(false);

    jest.spyOn(level, "get_time_hours").mockImplementation(() => 12);
    expect(simulationPreconditionNight(MockSquad.mock(), MockSquad.mock())).toBe(false);

    jest.spyOn(level, "get_time_hours").mockImplementation(() => 18);
    expect(simulationPreconditionNight(MockSquad.mock(), MockSquad.mock())).toBe(false);

    jest.spyOn(level, "get_time_hours").mockImplementation(() => 19);
    expect(simulationPreconditionNight(MockSquad.mock(), MockSquad.mock())).toBe(true);

    jest.spyOn(level, "get_time_hours").mockImplementation(() => 24);
    expect(simulationPreconditionNight(MockSquad.mock(), MockSquad.mock())).toBe(true);
  });
});

describe("simulationPreconditionLateNight", () => {
  it("should check late night time starting at 21", () => {
    jest.spyOn(level, "get_time_hours").mockImplementation(() => 5);
    expect(simulationPreconditionLateNight(MockSquad.mock(), MockSquad.mock())).toBe(true);

    jest.spyOn(level, "get_time_hours").mockImplementation(() => 6);
    expect(simulationPreconditionLateNight(MockSquad.mock(), MockSquad.mock())).toBe(false);

    jest.spyOn(level, "get_time_hours").mockImplementation(() => 19);
    expect(simulationPreconditionLateNight(MockSquad.mock(), MockSquad.mock())).toBe(false);

    jest.spyOn(level, "get_time_hours").mockImplementation(() => 20);
    expect(simulationPreconditionLateNight(MockSquad.mock(), MockSquad.mock())).toBe(false);

    jest.spyOn(level, "get_time_hours").mockImplementation(() => 21);
    expect(simulationPreconditionLateNight(MockSquad.mock(), MockSquad.mock())).toBe(true);

    jest.spyOn(level, "get_time_hours").mockImplementation(() => 24);
    expect(simulationPreconditionLateNight(MockSquad.mock(), MockSquad.mock())).toBe(true);
  });
});

describe("simulationPreconditionNear", () => {
  it("should check graph distance between objects", () => {
    const first: Squad = MockSquad.mock();
    const second: Squad = MockSquad.mock();

    resetPositionCache();
    jest.spyOn(game_graph().vertex(first.m_game_vertex_id).game_point(), "distance_to").mockImplementation(() => 149.5);
    expect(simulationPreconditionNear(first, second)).toBe(true);

    resetPositionCache();
    jest.spyOn(game_graph().vertex(first.m_game_vertex_id).game_point(), "distance_to").mockImplementation(() => 150);
    expect(simulationPreconditionNear(first, second)).toBe(true);

    resetPositionCache();
    jest.spyOn(game_graph().vertex(first.m_game_vertex_id).game_point(), "distance_to").mockImplementation(() => 150.5);
    expect(simulationPreconditionNear(first, second)).toBe(false);
  });
});

describe("simulationPreconditionNearDayFight", () => {
  it("should check graph distance between objects in fighting hours outside of surges", () => {
    const first: Squad = MockSquad.mock();
    const second: Squad = MockSquad.mock();

    resetPositionCache();
    surgeConfig.IS_STARTED = false;
    jest.spyOn(game_graph().vertex(first.m_game_vertex_id).game_point(), "distance_to").mockImplementation(() => 150);

    jest.spyOn(level, "get_time_hours").mockImplementation(() => 7);
    expect(simulationPreconditionNearDayFight(first, second)).toBe(false);

    jest.spyOn(level, "get_time_hours").mockImplementation(() => 8);
    expect(simulationPreconditionNearDayFight(first, second)).toBe(true);

    jest.spyOn(level, "get_time_hours").mockImplementation(() => 18);
    expect(simulationPreconditionNearDayFight(first, second)).toBe(true);

    jest.spyOn(level, "get_time_hours").mockImplementation(() => 19);
    expect(simulationPreconditionNearDayFight(first, second)).toBe(false);

    jest.spyOn(level, "get_time_hours").mockImplementation(() => 12);
    surgeConfig.IS_STARTED = true;
    expect(simulationPreconditionNearDayFight(first, second)).toBe(false);

    surgeConfig.IS_STARTED = false;
  });

  it("should not fight distant targets", () => {
    const first: Squad = MockSquad.mock();
    const second: Squad = MockSquad.mock();

    resetPositionCache();
    surgeConfig.IS_STARTED = false;
    jest.spyOn(game_graph().vertex(first.m_game_vertex_id).game_point(), "distance_to").mockImplementation(() => 150.5);
    jest.spyOn(level, "get_time_hours").mockImplementation(() => 12);

    expect(simulationPreconditionNearDayFight(first, second)).toBe(false);
  });
});

describe("simulationPreconditionNearAndDay", () => {
  it("should check graph distance between objects with day time", () => {
    const first: Squad = MockSquad.mock();
    const second: Squad = MockSquad.mock();

    resetPositionCache();
    jest.spyOn(game_graph().vertex(first.m_game_vertex_id).game_point(), "distance_to").mockImplementation(() => 150);

    jest.spyOn(level, "get_time_hours").mockImplementation(() => 5);
    expect(simulationPreconditionNearAndDay(first, second)).toBe(false);

    jest.spyOn(level, "get_time_hours").mockImplementation(() => 6);
    expect(simulationPreconditionNearAndDay(first, second)).toBe(true);

    jest.spyOn(level, "get_time_hours").mockImplementation(() => 18);
    expect(simulationPreconditionNearAndDay(first, second)).toBe(true);

    jest.spyOn(level, "get_time_hours").mockImplementation(() => 19);
    expect(simulationPreconditionNearAndDay(first, second)).toBe(false);
  });

  it("should check graph distance between objects with night time", () => {
    const first: Squad = MockSquad.mock();
    const second: Squad = MockSquad.mock();

    resetPositionCache();
    jest.spyOn(game_graph().vertex(first.m_game_vertex_id).game_point(), "distance_to").mockImplementation(() => 150.5);

    jest.spyOn(level, "get_time_hours").mockImplementation(() => 6);
    expect(simulationPreconditionNearAndDay(first, second)).toBe(false);

    jest.spyOn(level, "get_time_hours").mockImplementation(() => 7);
    expect(simulationPreconditionNearAndDay(first, second)).toBe(false);

    jest.spyOn(level, "get_time_hours").mockImplementation(() => 18);
    expect(simulationPreconditionNearAndDay(first, second)).toBe(false);

    jest.spyOn(level, "get_time_hours").mockImplementation(() => 19);
    expect(simulationPreconditionNearAndDay(first, second)).toBe(false);
  });
});

describe("simulationPreconditionNearAndNight", () => {
  it("should check graph distance between objects with day time", () => {
    const first: Squad = MockSquad.mock();
    const second: Squad = MockSquad.mock();

    resetPositionCache();
    jest.spyOn(game_graph().vertex(first.m_game_vertex_id).game_point(), "distance_to").mockImplementation(() => 150);

    jest.spyOn(level, "get_time_hours").mockImplementation(() => 5);
    expect(simulationPreconditionNearAndNight(first, second)).toBe(true);

    jest.spyOn(level, "get_time_hours").mockImplementation(() => 6);
    expect(simulationPreconditionNearAndNight(first, second)).toBe(false);

    jest.spyOn(level, "get_time_hours").mockImplementation(() => 18);
    expect(simulationPreconditionNearAndNight(first, second)).toBe(false);

    jest.spyOn(level, "get_time_hours").mockImplementation(() => 19);
    expect(simulationPreconditionNearAndNight(first, second)).toBe(true);
  });

  it("should check graph distance between objects with night time", () => {
    const first: Squad = MockSquad.mock();
    const second: Squad = MockSquad.mock();

    resetPositionCache();
    jest.spyOn(game_graph().vertex(first.m_game_vertex_id).game_point(), "distance_to").mockImplementation(() => 150.5);

    jest.spyOn(level, "get_time_hours").mockImplementation(() => 6);
    expect(simulationPreconditionNearAndNight(first, second)).toBe(false);

    jest.spyOn(level, "get_time_hours").mockImplementation(() => 7);
    expect(simulationPreconditionNearAndNight(first, second)).toBe(false);

    jest.spyOn(level, "get_time_hours").mockImplementation(() => 18);
    expect(simulationPreconditionNearAndNight(first, second)).toBe(false);

    jest.spyOn(level, "get_time_hours").mockImplementation(() => 19);
    expect(simulationPreconditionNearAndNight(first, second)).toBe(false);
  });
});
