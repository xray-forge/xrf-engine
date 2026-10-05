import { CUICheckButton, CUIScrollView, CUIStatic, level, LuabindClass, ui_events } from "xray16";
import { isConsoleCommandAvailable, LuaArray, TLabel, TName, TPath } from "xray16/lib";
import { $fromArray } from "xray16/macros";

import { registry } from "@/engine/core/database";
import { EDebugTab, IDebugConsoleToggle, IDebugField } from "@/engine/core/managers/debug/debug_types";
import { debugConfig } from "@/engine/core/managers/debug/DebugConfig";
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
import { surgeConfig } from "@/engine/core/managers/surge/SurgeConfig";
import type { Debugger } from "@/engine/core/ui/debug/Debugger";
import { DebuggerTab } from "@/engine/core/ui/debug/tabs/DebuggerTab";
import { isGameStarted } from "@/engine/core/utils/game";
import { initializeStatics } from "@/engine/core/utils/ui";

const base: TPath = "menu\\debug\\DebugPlayerTab.component";

/**
 * Player tab: console toggles, the actor's state, and actions on the actor and the world.
 */
@LuabindClass()
export class DebugPlayerTab extends DebuggerTab {
  public uiToggles!: CUIScrollView;
  public uiFields!: CUIScrollView;
  public uiToggleChecks: LuaTable<IDebugConsoleToggle, CUICheckButton> = new LuaTable();

  public constructor(owner: Debugger) {
    super(owner, EDebugTab.PLAYER, base);
  }

  public override initialize(): void {
    initializeStatics(
      this.xml,
      this,
      "toggles_background",
      "fields_background",
      "heading_money",
      "heading_actor",
      "heading_world"
    );

    this.uiToggles = this.xml.InitScrollView("toggles", this);
    this.uiFields = this.xml.InitScrollView("fields", this);

    // Toggles the running engine has come first, the ones it lacks after them.
    for (const isAvailable of [true, false]) {
      for (const index of $range(1, debugConfig.CONSOLE_TOGGLES.length())) {
        const toggle: IDebugConsoleToggle = debugConfig.CONSOLE_TOGGLES.get(index);

        if (isConsoleCommandAvailable(toggle.command) === isAvailable) {
          this.initializeToggle(toggle);
        }
      }
    }

    this.initializeButton("money_small_button", () => this.onAction(() => giveDebugMoney(1_000)));
    this.initializeButton("money_large_button", () => this.onAction(() => giveDebugMoney(50_000)));
    this.initializeButton("money_take_button", () => this.onAction(() => giveDebugMoney(-1_000)));
    this.initializeButton("heal_button", () => this.onAction(healDebugActor));
    this.initializeButton("log_location_button", () => this.onAction(logDebugActorLocation));
    this.initializeButton("time_hour_button", () => this.onAction(() => forwardDebugTime(1)));
    this.initializeButton("time_day_button", () => this.onAction(() => forwardDebugTime(6)));
    this.initializeButton("weather_button", () => this.onAction(changeDebugWeather));
    this.initializeButton("surge_button", () => this.onAction(toggleDebugSurge));
  }

  public override refresh(): void {
    for (const [toggle, check] of this.uiToggleChecks) {
      check.SetCheck(check.IsEnabled() && isDebugToggleEnabled(toggle));
    }

    if (!isGameStarted()) {
      return this.fillFieldList(this.uiFields, $fromArray([{ label: "actor", value: "no game running" }]));
    }

    const fields: LuaArray<IDebugField> = $fromArray<IDebugField>([
      { label: "money", value: tostring(registry.actor.money()) },
      { label: "time", value: string.format("%02d:%02d", level.get_time_hours(), level.get_time_minutes()) },
      { label: "weather", value: level.get_weather() },
      { label: "surge", value: surgeConfig.IS_STARTED ? "running" : "none" },
    ]);

    this.fillFieldList(this.uiFields, fields);
  }

  /**
   * Run an action on the actor or the world.
   *
   * @param action - Action returning its result message.
   */
  public onAction(action: () => TLabel): void {
    if (isGameStarted()) {
      this.owner.onAction(action());
    } else {
      this.owner.report("no game running");
    }
  }

  /**
   * Add a check box for a console toggle, or a line of text when the running engine lacks the command.
   *
   * @param toggle - Console toggle.
   */
  private initializeToggle(toggle: IDebugConsoleToggle): void {
    const row: CUIStatic = this.xml.InitStatic("toggle_row", null);
    const name: TName = `${this.tab}_toggle_${toggle.command}`;

    row.SetAutoDelete(true);
    this.uiToggles.AddWindow(row, true);

    // A command the engine lacks is listed as text, as a disabled box would look checked.
    if (!isConsoleCommandAvailable(toggle.command)) {
      this.xml
        .InitStatic("toggle_unavailable", row)
        .TextControl()
        .SetText(`${toggle.command} - not in this engine build`);

      return;
    }

    const check: CUICheckButton = this.xml.InitCheck("toggle_check", row);

    check.TextControl().SetText(toggle.command);

    this.owner.Register(check, name);
    this.owner.AddCallback(name, ui_events.CHECK_BUTTON_SET, () => this.onToggle(toggle, true), this);
    this.owner.AddCallback(name, ui_events.CHECK_BUTTON_RESET, () => this.onToggle(toggle, false), this);

    this.uiToggleChecks.set(toggle, check);
  }

  /**
   * Turn a console toggle on or off.
   *
   * @param toggle - Console toggle.
   * @param isEnabled - Whether to turn it on.
   */
  private onToggle(toggle: IDebugConsoleToggle, isEnabled: boolean): void {
    this.owner.report(setDebugToggle(toggle, isEnabled));
  }
}
