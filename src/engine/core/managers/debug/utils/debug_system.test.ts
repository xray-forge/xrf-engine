import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { replaceFunctionMock, resetFunctionMock } from "xray16/testing/utils";

import { forgeConfig } from "@/engine/core/database/forge_config";
import {
  collectDebugGarbage,
  dumpDebugLuaData,
  dumpDebugSystemIni,
  inspectDebugSystem,
  toggleDebugSimulationView,
} from "@/engine/core/managers/debug/utils/debug_system";
import { dumpLuaData, dumpSystemIni } from "@/engine/core/utils/debug/debug_dump";

jest.mock("@/engine/core/utils/debug/debug_dump");

beforeEach(() => {
  resetFunctionMock(collectgarbage);
});

describe("inspectDebugSystem", () => {
  it("should describe the Lua runtime", () => {
    replaceFunctionMock(collectgarbage, () => 2_048);

    const labels: Array<string> = [];

    for (const [, field] of inspectDebugSystem()) {
      labels.push(field.label);
    }

    expect(labels).toEqual(["lua", "jit", "lua memory", "simulation debug", "command line"]);
    expect(inspectDebugSystem().get(3)).toEqual({ label: "lua memory", value: "2.000 MB" });
  });
});

describe("collectDebugGarbage", () => {
  it("should collect garbage and report how much", () => {
    let count: number = 3_072;

    replaceFunctionMock(collectgarbage, (option: string) => {
      if (option === "collect") {
        count = 1_024;
      }

      return count;
    });

    expect(collectDebugGarbage()).toBe("collected 2.000 MB of lua garbage");
    expect(collectgarbage).toHaveBeenCalledWith("collect");
  });
});

describe("toggleDebugSimulationView", () => {
  it("should switch the simulation view", () => {
    forgeConfig.DEBUG.IS_SIMULATION_ENABLED = false;

    expect(toggleDebugSimulationView()).toBe("simulation debug on");
    expect(forgeConfig.DEBUG.IS_SIMULATION_ENABLED).toBe(true);

    expect(toggleDebugSimulationView()).toBe("simulation debug off");
    expect(forgeConfig.DEBUG.IS_SIMULATION_ENABLED).toBe(false);
  });
});

describe("dumpDebugLuaData", () => {
  it("should report where it dumped", () => {
    replaceFunctionMock(dumpLuaData, () => "lua_data.json");

    expect(dumpDebugLuaData()).toBe("dumped lua_data.json");
  });
});

describe("dumpDebugSystemIni", () => {
  it("should report where it dumped", () => {
    replaceFunctionMock(dumpSystemIni, () => "system.ltx");

    expect(dumpDebugSystemIni()).toBe("dumped system.ltx");
  });
});
