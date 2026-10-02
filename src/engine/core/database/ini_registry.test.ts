import { describe, expect, it } from "@jest/globals";
import { IniFile } from "xray16/alias";
import { MockIniFile } from "xray16/mocks";

import { DUMMY_LTX, DYNAMIC_LTX_PREFIX, FORGE_LTX, GAME_LTX, SYSTEM_INI } from "@/engine/core/database/ini_registry";

describe("ini_registry database module", () => {
  it("should have correct prefix for RAM ini files", () => {
    expect(DYNAMIC_LTX_PREFIX).toBe("*");
  });

  it("should correctly define ini files globals", () => {
    const expectedIniFiles: Array<IniFile> = [SYSTEM_INI, DUMMY_LTX, GAME_LTX, FORGE_LTX];

    expectedIniFiles.forEach((it) => expect(it instanceof MockIniFile).toBeTruthy());
  });
});
