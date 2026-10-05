import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { get_console, level } from "xray16";
import { Console } from "xray16/alias";
import { MockConsole } from "xray16/mocks";
import { replaceFunctionMock } from "xray16/testing/utils";

import { consoleCommands } from "@/engine/constants/console_commands";
import { getManager, registry } from "@/engine/core/database";
import { EDebugToggleType } from "@/engine/core/managers/debug/debug_types";
import {
  changeDebugWeather,
  forwardDebugTime,
  giveDebugMoney,
  healDebugActor,
  isDebugToggleEnabled,
  logDebugActorLocation,
  setDebugToggle,
  toggleDebugSurge,
} from "@/engine/core/managers/debug/utils/debug_player_actions";
import { surgeConfig, SurgeManager } from "@/engine/core/managers/surge";
import { WeatherManager } from "@/engine/core/managers/weather";
import { forwardGameTime } from "@/engine/core/utils/game/game_time";
import { restoreObjectCondition } from "@/engine/core/utils/object";
import { giveMoneyToActor } from "@/engine/core/utils/reward";
import { mockRegisteredActor, resetRegistry } from "@/fixtures/engine";

jest.mock("@/engine/core/utils/game/game_time");
jest.mock("@/engine/core/utils/object/object_condition");
jest.mock("@/engine/core/utils/reward");

beforeEach(() => {
  resetRegistry();
  mockRegisteredActor({ money: 500 });
  MockConsole.reset();

  surgeConfig.IS_STARTED = false;
});

describe("giveDebugMoney", () => {
  it("should give and take money", () => {
    expect(giveDebugMoney(1_000)).toBe("money +1000, now 500");
    expect(giveMoneyToActor).toHaveBeenCalledWith(1_000);

    expect(giveDebugMoney(-100)).toBe("money -100, now 400");
    expect(registry.actor.give_money).toHaveBeenCalledWith(-100);
  });
});

describe("healDebugActor", () => {
  it("should restore the actor", () => {
    expect(healDebugActor()).toBe("actor healed");
    expect(restoreObjectCondition).toHaveBeenCalledWith(registry.actor);
  });
});

describe("isDebugToggleEnabled", () => {
  it("should read the toggle value", () => {
    const console: Console = get_console();

    jest.spyOn(console, "get_bool").mockImplementation(() => true);

    expect(isDebugToggleEnabled({ command: consoleCommands.g_god, type: EDebugToggleType.ON_OFF })).toBe(true);
    expect(console.get_bool).toHaveBeenCalledWith(consoleCommands.g_god);
  });
});

describe("setDebugToggle", () => {
  it("should execute the command with the value style of the toggle", () => {
    const console: Console = get_console();

    expect(setDebugToggle({ command: consoleCommands.g_god, type: EDebugToggleType.ON_OFF }, true)).toBe("g_god on");
    expect(console.execute).toHaveBeenCalledWith("g_god on");

    expect(setDebugToggle({ command: consoleCommands.wpn_aim_toggle, type: EDebugToggleType.ZERO_ONE }, false)).toBe(
      "wpn_aim_toggle 0"
    );
    expect(console.execute).toHaveBeenCalledWith("wpn_aim_toggle 0");
  });
});

describe("forwardDebugTime", () => {
  it("should skip game time", () => {
    replaceFunctionMock(level.get_time_hours, () => 13);
    replaceFunctionMock(level.get_time_minutes, () => 5);

    expect(forwardDebugTime(1)).toBe("time forwarded by 1 h, now 13:05");
    expect(forwardGameTime).toHaveBeenCalledWith(1);
  });
});

describe("changeDebugWeather", () => {
  it("should switch to a new weather state", () => {
    const weatherManager: WeatherManager = getManager(WeatherManager);

    jest.spyOn(weatherManager, "changeWeatherState").mockImplementation(jest.fn());

    expect(changeDebugWeather()).toBe("weather now default");
    expect(weatherManager.changeWeatherState).toHaveBeenCalledTimes(1);
  });
});

describe("toggleDebugSurge", () => {
  it("should start and stop surges", () => {
    const surgeManager: SurgeManager = getManager(SurgeManager);

    jest.spyOn(surgeManager, "requestSurgeStart").mockImplementation(() => {
      surgeConfig.IS_STARTED = true;
    });
    jest.spyOn(surgeManager, "requestSurgeStop").mockImplementation(() => {
      surgeConfig.IS_STARTED = false;
    });

    expect(toggleDebugSurge()).toBe("surge started");
    expect(toggleDebugSurge()).toBe("surge stopped");

    jest.spyOn(surgeManager, "requestSurgeStart").mockImplementation(jest.fn());

    expect(toggleDebugSurge()).toBe("no surge covers on this level");
  });
});

describe("logDebugActorLocation", () => {
  it("should report the actor location", () => {
    replaceFunctionMock(level.name, () => "zaton");

    expect(logDebugActorLocation()).toMatch(/^logged zaton {2}/);
  });
});
