import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { replaceFunctionMock, resetFunctionMock } from "xray16/testing/utils";

import { EDebugTab } from "@/engine/core/managers/debug/debug_types";
import { debugConfig } from "@/engine/core/managers/debug/DebugConfig";
import {
  createDebugPreferences,
  loadDebugPreferences,
  saveDebugPreferences,
} from "@/engine/core/managers/debug/utils/debug_preferences";
import { loadObjectFromFile, saveObjectToFile } from "@/engine/core/utils/fs";

jest.mock("@/engine/core/utils/fs");

beforeEach(() => {
  resetFunctionMock(loadObjectFromFile);
  resetFunctionMock(saveObjectToFile);
});

describe("createDebugPreferences", () => {
  it("should create the defaults", () => {
    expect(createDebugPreferences()).toEqual({ tab: debugConfig.DEFAULT_TAB });
  });
});

describe("loadDebugPreferences", () => {
  it("should fall back to the defaults without a saved file", () => {
    replaceFunctionMock(loadObjectFromFile, () => null);

    expect(loadDebugPreferences()).toEqual(createDebugPreferences());
    expect(loadObjectFromFile).toHaveBeenCalledWith("$app_data_root$\\debugger.dat");
  });

  it("should read saved preferences and ignore unknown values", () => {
    replaceFunctionMock(loadObjectFromFile, () => ({ tab: EDebugTab.SYSTEM }));

    expect(loadDebugPreferences()).toEqual({ tab: EDebugTab.SYSTEM });

    replaceFunctionMock(loadObjectFromFile, () => ({ tab: "removed_tab" }));

    expect(loadDebugPreferences()).toEqual(createDebugPreferences());
  });
});

describe("saveDebugPreferences", () => {
  it("should write preferences to the user data folder", () => {
    saveDebugPreferences({ tab: EDebugTab.PLAYER });

    expect(saveObjectToFile).toHaveBeenCalledWith("$app_data_root$\\", "debugger.dat", { tab: EDebugTab.PLAYER });
  });
});
