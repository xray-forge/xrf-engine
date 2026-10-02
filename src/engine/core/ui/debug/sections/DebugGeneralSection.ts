import { command_line, CUI3tButton, CUIStatic, LuabindClass, ui_events } from "xray16";
import { XmlInit } from "xray16/alias";
import { TPath } from "xray16/lib";
import { $filename, $isNil } from "xray16/macros";

import { getManager } from "@/engine/core/database";
import { forgeConfig } from "@/engine/core/database/forge_config";
import { DebugManager } from "@/engine/core/managers/debug";
import { AbstractDebugSection } from "@/engine/core/ui/debug/sections/AbstractDebugSection";
import { LuaLogger } from "@/engine/core/utils/logging";
import { EElementType, initializeElement, resolveXmlFile } from "@/engine/core/utils/ui";

const logger: LuaLogger = new LuaLogger($filename);
const base: TPath = "menu\\debug\\DebugGeneralSection.component";

/**
 * Section of debug menu to handle generic information / generic actions.
 */
@LuabindClass()
export class DebugGeneralSection extends AbstractDebugSection {
  public uiLuaVersionLabel!: CUIStatic;
  public uiMemoryUsageCountLabel!: CUIStatic;
  public uiSimulationDebugToggleButton!: CUI3tButton;

  public uiLuaJitLabel!: CUIStatic;

  public initializeControls(): void {
    const xml: XmlInit = resolveXmlFile(base, this.xml);

    xml.InitStatic("lua_version_label", this);
    xml
      .InitStatic("game_command_line", this)
      .TextControl()
      .SetText("Command line args:" + (command_line() || "unknown"));

    this.uiMemoryUsageCountLabel = initializeElement(xml, EElementType.STATIC, "memory_usage_count", this);
    this.uiLuaVersionLabel = initializeElement(xml, EElementType.STATIC, "lua_version_label", this);
    this.uiLuaJitLabel = initializeElement(xml, EElementType.STATIC, "lua_jit_label", this);

    this.uiSimulationDebugToggleButton = initializeElement(
      xml,
      EElementType.BUTTON,
      "debug_simulation_toggle_button",
      this,
      {
        context: this.owner,
        [ui_events.BUTTON_CLICKED]: () => this.onToggleSimulationDebugButtonClick(),
      }
    );

    initializeElement(xml, EElementType.BUTTON, "refresh_memory_button", this, {
      context: this.owner,
      [ui_events.BUTTON_CLICKED]: () => this.onRefreshMemoryButtonClick(),
    });

    initializeElement(xml, EElementType.BUTTON, "collect_memory_button", this, {
      context: this.owner,
      [ui_events.BUTTON_CLICKED]: () => this.onCollectMemoryButtonClick(),
    });

    initializeElement(xml, EElementType.BUTTON, "dump_system_ini_button", this, {
      context: this.owner,
      [ui_events.BUTTON_CLICKED]: () => getManager(DebugManager).dumpSystemIni(),
    });

    initializeElement(xml, EElementType.BUTTON, "dump_lua_data_button", this, {
      context: this.owner,
      [ui_events.BUTTON_CLICKED]: () => getManager(DebugManager).dumpLuaData(),
    });
  }

  /**
   * Initialize section state from current state.
   */
  public override initializeState(): void {
    this.uiMemoryUsageCountLabel.TextControl().SetText(this.getUsedMemoryLabel());
    this.uiLuaVersionLabel.TextControl().SetText("Lua version: " + (_VERSION || "unknown"));
    this.uiLuaJitLabel.TextControl().SetText("JIT " + ($isNil(jit) ? "disabled" : "enabled"));

    this.uiSimulationDebugToggleButton
      .TextControl()
      .SetText(forgeConfig.DEBUG.IS_SIMULATION_ENABLED ? "Disable simulation debug" : "Enable simulation debug");
  }

  /**
   * Handle collection of LUA garbage on button click.
   */
  public onCollectMemoryButtonClick(): void {
    logger.info("Collect memory garbage");

    getManager(DebugManager).collectLuaGarbage();
    this.uiMemoryUsageCountLabel.TextControl().SetText(this.getUsedMemoryLabel());
  }

  /**
   * Toggle simulation debug with squad / smarts display on map with stats.
   */
  public onToggleSimulationDebugButtonClick(): void {
    forgeConfig.DEBUG.IS_SIMULATION_ENABLED = !forgeConfig.DEBUG.IS_SIMULATION_ENABLED;

    this.initializeState();
  }

  /**
   * Handle refreshing of used RAM in game UI display elements.
   */
  public onRefreshMemoryButtonClick(): void {
    logger.info("Refresh memory usage");

    this.uiMemoryUsageCountLabel.TextControl().SetText(this.getUsedMemoryLabel());
  }

  /**
   * @returns Label to display used RAM.
   */
  public getUsedMemoryLabel(): string {
    return string.format("RAM: %.03f MB", getManager(DebugManager).getLuaMemoryUsed() / 1_024);
  }
}
