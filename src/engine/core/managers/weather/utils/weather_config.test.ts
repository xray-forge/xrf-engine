import { describe, expect, it } from "@jest/globals";
import { MockIniFile } from "xray16/mocks";

import { readFogDistances, readLevelWeathersConfiguration } from "@/engine/core/managers/weather/utils/weather_config";
import { WEATHER_MANAGER_LEVELS_LTX } from "@/engine/core/managers/weather/WeatherConfig";

describe("readLevelWeathersConfiguration", () => {
  it("should correctly read values", () => {
    expect(readLevelWeathersConfiguration(WEATHER_MANAGER_LEVELS_LTX)).toEqualLuaTables({
      default: {
        periodBad: "foggy_rainy",
        periodBadLength: 6,
        periodGood: "clear_foggy",
        periodGoodLength: 6,
      },
      jupiter: {
        periodBad: "foggy_rainy",
        periodBadLength: 4,
        periodGood: "clear",
        periodGoodLength: 8,
      },
      pripyat: {
        periodBad: "stormy",
        periodBadLength: 8,
        periodGood: "clear_foggy",
        periodGoodLength: 4,
      },
      zaton: {
        periodBad: "rainy",
        periodBadLength: 6,
        periodGood: "clear_foggy",
        periodGoodLength: 6,
      },
    });
  });

  it("should correctly read values with custom levels or incomplete data", () => {
    expect(
      readLevelWeathersConfiguration(
        MockIniFile.mock("test.ltx", {
          unknown_level: {
            period_bad: "stormy",
            period_bad_length: 16,
            period_good: "clear",
            period_good_length: 8,
          },
          incomplete: {},
        })
      )
    ).toEqualLuaTables({
      default: {
        periodBad: "foggy_rainy",
        periodBadLength: 6,
        periodGood: "clear_foggy",
        periodGoodLength: 6,
      },
      unknown_level: {
        periodBad: "stormy",
        periodBadLength: 16,
        periodGood: "clear",
        periodGoodLength: 8,
      },
      incomplete: {
        periodBad: "foggy_rainy",
        periodBadLength: 6,
        periodGood: "clear_foggy",
        periodGoodLength: 6,
      },
    });
  });
});

describe("readFogDistances", () => {
  it("should correctly read values", () => {
    expect(readFogDistances(MockIniFile.mock("test.ltx", {}))).toEqualLuaTables({});
    expect(readFogDistances(MockIniFile.mock("test.ltx", { dof_kernels: {} }))).toEqualLuaTables({});

    expect(
      readFogDistances(
        MockIniFile.mock("test.ltx", {
          dof_kernels: {
            clear: 1,
          },
        })
      )
    ).toEqualLuaTables({
      clear: {
        "00:00:00": 500,
        "01:00:00": 500,
        "02:00:00": 500,
        "03:00:00": 500,
        "04:00:00": 500,
        "05:00:00": 500,
        "06:00:00": 500,
        "07:00:00": 500,
        "08:00:00": 500,
        "09:00:00": 500,
        "10:00:00": 500,
        "11:00:00": 500,
        "12:00:00": 500,
        "13:00:00": 500,
        "14:00:00": 500,
        "15:00:00": 500,
        "16:00:00": 500,
        "17:00:00": 500,
        "18:00:00": 500,
        "19:00:00": 500,
        "20:00:00": 500,
        "21:00:00": 500,
        "22:00:00": 500,
        "23:00:00": 500,
      },
    });
  });
});
