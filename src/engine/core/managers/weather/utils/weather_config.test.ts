import { describe, expect, it } from "@jest/globals";
import { MockIniFile } from "xray16/mocks";

import { readLevelWeatherPeriods } from "@/engine/core/managers/weather/utils/weather_config";
import { WEATHER_MANAGER_LEVELS_LTX } from "@/engine/core/managers/weather/WeatherConfig";

describe("readLevelWeatherPeriods", () => {
  it("should correctly read values", () => {
    expect(readLevelWeatherPeriods(WEATHER_MANAGER_LEVELS_LTX)).toEqualLuaTables({
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
      readLevelWeatherPeriods(
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
