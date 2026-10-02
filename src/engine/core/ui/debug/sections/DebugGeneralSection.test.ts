import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { MockCUIScriptWnd } from "xray16/mocks";

import { getManager } from "@/engine/core/database";
import { forgeConfig } from "@/engine/core/database/forge_config";
import { DebugManager } from "@/engine/core/managers/debug";
import { DebugGeneralSection } from "@/engine/core/ui/debug/sections/DebugGeneralSection";
import { resetRegistry } from "@/fixtures/engine";

/**
 * Controls are assigned by the base constructor before subclass field declarations are defined, so initialization
 * has to be repeated to observe the resulting UI state.
 */
function createSection(): DebugGeneralSection {
  const section: DebugGeneralSection = new DebugGeneralSection(MockCUIScriptWnd.mock(), "test-name");

  section.initializeControls();
  section.initializeCallBacks();
  section.initializeState();

  return section;
}

describe("DebugGeneralSection", () => {
  beforeEach(() => {
    resetRegistry();
    forgeConfig.DEBUG.IS_SIMULATION_ENABLED = false;
  });

  it("should correctly initialize state", () => {
    const section: DebugGeneralSection = createSection();

    expect(section.uiMemoryUsageCountLabel.TextControl().SetText).toHaveBeenCalledWith(section.getUsedMemoryLabel());
    expect(section.uiLuaVersionLabel.TextControl().SetText).toHaveBeenCalledWith("Lua version: " + _VERSION);
    expect(section.uiLuaJitLabel.TextControl().SetText).toHaveBeenCalledWith("JIT enabled");
    expect(section.uiSimulationDebugToggleButton.TextControl().SetText).toHaveBeenCalledWith("Enable simulation debug");
  });

  it("should build used memory label", () => {
    const section: DebugGeneralSection = createSection();

    jest.spyOn(getManager(DebugManager), "getLuaMemoryUsed").mockImplementation(() => 2_048);

    expect(section.getUsedMemoryLabel()).toBe("RAM: 2.000 MB");
  });

  it("should collect memory garbage and refresh label", () => {
    const section: DebugGeneralSection = createSection();
    const debugManager: DebugManager = getManager(DebugManager);

    jest.spyOn(debugManager, "collectLuaGarbage").mockImplementation(jest.fn());
    jest.mocked(section.uiMemoryUsageCountLabel.TextControl().SetText).mockClear();

    section.onCollectMemoryButtonClick();

    expect(debugManager.collectLuaGarbage).toHaveBeenCalledTimes(1);
    expect(section.uiMemoryUsageCountLabel.TextControl().SetText).toHaveBeenCalledWith(section.getUsedMemoryLabel());
  });

  it("should refresh memory usage label", () => {
    const section: DebugGeneralSection = createSection();

    jest.mocked(section.uiMemoryUsageCountLabel.TextControl().SetText).mockClear();

    section.onRefreshMemoryButtonClick();

    expect(section.uiMemoryUsageCountLabel.TextControl().SetText).toHaveBeenCalledWith(section.getUsedMemoryLabel());
  });

  it("should toggle simulation debug flag and re-render state", () => {
    const section: DebugGeneralSection = createSection();

    section.onToggleSimulationDebugButtonClick();

    expect(forgeConfig.DEBUG.IS_SIMULATION_ENABLED).toBe(true);
    expect(section.uiSimulationDebugToggleButton.TextControl().SetText).toHaveBeenCalledWith(
      "Disable simulation debug"
    );

    section.onToggleSimulationDebugButtonClick();

    expect(forgeConfig.DEBUG.IS_SIMULATION_ENABLED).toBe(false);
    expect(section.uiSimulationDebugToggleButton.TextControl().SetText).toHaveBeenCalledWith("Enable simulation debug");
  });
});
