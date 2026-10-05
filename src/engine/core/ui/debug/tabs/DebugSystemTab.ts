import { CUIScrollView, LuabindClass } from "xray16";
import { TLabel, TPath } from "xray16/lib";

import { EDebugTab } from "@/engine/core/managers/debug/debug_types";
import {
  collectDebugGarbage,
  dumpDebugLuaData,
  dumpDebugSystemIni,
  inspectDebugSystem,
  toggleDebugSimulationView,
} from "@/engine/core/managers/debug/utils/debug_system";
import type { Debugger } from "@/engine/core/ui/debug/Debugger";
import { DebuggerTab } from "@/engine/core/ui/debug/tabs/DebuggerTab";
import { initializeStatics } from "@/engine/core/utils/ui";

const base: TPath = "menu\\debug\\DebugSystemTab.component";

/**
 * System tab: Lua runtime facts, memory, dumps and debug views.
 */
@LuabindClass()
export class DebugSystemTab extends DebuggerTab {
  public uiFields!: CUIScrollView;

  public constructor(owner: Debugger) {
    super(owner, EDebugTab.SYSTEM, base);
  }

  public override initialize(): void {
    initializeStatics(this.xml, this, "fields_background", "heading_lua", "heading_dumps", "heading_views");

    this.uiFields = this.xml.InitScrollView("fields", this);

    this.initializeButton("collect_garbage_button", () => this.onAction(collectDebugGarbage));
    this.initializeButton("refresh_button", () => this.onAction(() => ""));
    this.initializeButton("dump_lua_data_button", () => this.onAction(dumpDebugLuaData));
    this.initializeButton("dump_system_ini_button", () => this.onAction(dumpDebugSystemIni));
    this.initializeButton("simulation_view_button", () => this.onAction(toggleDebugSimulationView));
  }

  public override refresh(): void {
    this.fillFieldList(this.uiFields, inspectDebugSystem());
  }

  /**
   * Run a system action.
   *
   * @param action - Action returning its result message.
   */
  public onAction(action: () => TLabel): void {
    this.owner.onAction(action());
  }
}
