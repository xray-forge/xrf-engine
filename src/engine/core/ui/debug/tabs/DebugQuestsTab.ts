import { CUI3tButton, CUIScrollView, CUITabControl, LuabindClass } from "xray16";
import { LuaArray, Nillable, TLabel, TNumberId, TPath, TStringId } from "xray16/lib";
import { $fromArray, $isNil, $isNotNil } from "xray16/macros";

import {
  EDebugQuestView,
  EDebugTab,
  IDebugFlow,
  IDebugFlowResult,
  IDebugQuestEntry,
} from "@/engine/core/managers/debug/debug_types";
import type { DebugManager } from "@/engine/core/managers/debug/DebugManager";
import {
  buildDebugFlowEntries,
  inspectDebugFlowResult,
  readDebugFlows,
  runDebugFlow,
} from "@/engine/core/managers/debug/utils/debug_flows";
import {
  buildDebugInfoPortionEntries,
  buildDebugTaskEntries,
  finishDebugTask,
  getDebugTaskTargetId,
  giveDebugTask,
  inspectDebugTask,
  setDebugInfoPortion,
} from "@/engine/core/managers/debug/utils/debug_quests";
import { teleportActorToDebugTarget } from "@/engine/core/managers/debug/utils/debug_target_actions";
import type { Debugger } from "@/engine/core/ui/debug/Debugger";
import { DebugBrowserTab } from "@/engine/core/ui/debug/tabs/DebugBrowserTab";
import { isGameStarted } from "@/engine/core/utils/game";
import { hasInfoPortion } from "@/engine/core/utils/info_portion";
import { initializeStatics } from "@/engine/core/utils/ui";

const base: TPath = "menu\\debug\\DebugQuestsTab.component";

/**
 * Quests tab: tasks, info portions and the check flows built for the level, searched and browsed a page at a time,
 * with what to do with the one selected.
 */
@LuabindClass()
export class DebugQuestsTab extends DebugBrowserTab<IDebugQuestEntry> {
  public uiViews!: CUITabControl;
  public uiFields!: CUIScrollView;
  // Action buttons of each list, shown with it.
  public uiActions: LuaTable<EDebugQuestView, LuaArray<CUI3tButton>> = new LuaTable();

  // Last run of the selected flow, shown until another flow is selected.
  public flowResult: Nillable<IDebugFlowResult> = null;

  public constructor(owner: Debugger) {
    super(owner, EDebugTab.QUESTS, base);
  }

  public override initialize(): void {
    initializeStatics(this.xml, this, "browser_background", "fields_background", "heading_actions");

    this.initializeBrowser();

    this.uiViews = this.initializeTabControl("views", () => this.onViewChanged());
    this.uiFields = this.xml.InitScrollView("fields", this);

    this.uiActions.set(
      EDebugQuestView.TASKS,
      $fromArray([
        this.initializeButton("task_give_button", () => this.onTaskAction((id) => giveDebugTask(id))),
        this.initializeButton("task_complete_button", () => this.onTaskAction((id) => finishDebugTask(id, true))),
        this.initializeButton("task_fail_button", () => this.onTaskAction((id) => finishDebugTask(id, false))),
        this.initializeButton("task_target_button", () => this.onGoToTaskTarget()),
      ])
    );
    this.uiActions.set(
      EDebugQuestView.INFO_PORTIONS,
      $fromArray([
        this.initializeButton("portion_give_button", () => this.onInfoPortionChange(true)),
        this.initializeButton("portion_take_button", () => this.onInfoPortionChange(false)),
      ])
    );
    this.uiActions.set(
      EDebugQuestView.FLOWS,
      $fromArray([
        this.initializeButton("flow_run_button", () => this.onRunFlow(true)),
        this.initializeButton("flow_run_in_place_button", () => this.onRunFlow(false)),
        this.initializeButton("flow_pin_button", () => this.onPinFlow()),
      ])
    );

    this.uiViews.SetActiveTab(this.owner.manager.preferences.questView);
  }

  /**
   * Rebuild the rows, as tasks and portions change while the debugger is closed.
   */
  public override refresh(): void {
    for (const [view, buttons] of this.uiActions) {
      for (const index of $range(1, buttons.length())) {
        buttons.get(index).Show(view === this.owner.manager.preferences.questView);
      }
    }

    this.fillEntries();
    this.refreshBrowser();
    this.refreshSelection();

    this.uiActions
      .get(EDebugQuestView.FLOWS)
      .get(3)
      .TextControl()
      .SetText(
        $isNotNil(this.selected) && this.owner.manager.pinnedFlow?.identity === this.selected.key
          ? "unpin from the overlay"
          : "pin to the overlay"
      );
  }

  /**
   * Show the list picked in the views strip.
   */
  public onViewChanged(): void {
    const view: EDebugQuestView = this.uiViews.GetActiveId() as EDebugQuestView;

    if (view !== this.owner.manager.preferences.questView) {
      this.owner.manager.preferences.questView = view;
      this.owner.manager.savePreferences();
    }

    this.pager.page = 1;
    this.selected = null;
    this.refresh();
  }

  public override onEntryClicked(index: number): void {
    this.flowResult = null;
    super.onEntryClicked(index);
  }

  /**
   * Run an action on the selected task.
   *
   * @param action - Action taking the task id and returning its result message.
   */
  public onTaskAction(action: (id: TStringId) => TLabel): void {
    if (!isGameStarted() || $isNil(this.selected)) {
      return this.owner.report("select a task in a running game");
    }

    this.owner.onAction(action(this.selected.key));
  }

  /**
   * Teleport to what the selected task points to, closing the debugger.
   */
  public onGoToTaskTarget(): void {
    const targetId: Nillable<TNumberId> = $isNil(this.selected) ? null : getDebugTaskTargetId(this.selected.key);

    if ($isNil(targetId)) {
      return this.owner.report("the selected task points nowhere");
    }

    this.owner.report(teleportActorToDebugTarget(targetId));
    this.owner.resume();
  }

  /**
   * Give or take the selected info portion.
   *
   * @param isGiven - Whether to give it rather than take it.
   */
  public onInfoPortionChange(isGiven: boolean): void {
    if (!isGameStarted() || $isNil(this.selected)) {
      return this.owner.report("select an info portion in a running game");
    } else if (hasInfoPortion(this.selected.key) === isGiven) {
      return this.owner.report(`${this.selected.key} is already ${isGiven ? "given" : "taken"}`);
    }

    this.owner.onAction(setDebugInfoPortion(this.selected.key, isGiven));
  }

  /**
   * Run the selected flow once, showing each of its steps.
   *
   * @param isTravelAllowed - Whether its steps may move the actor.
   */
  public onRunFlow(isTravelAllowed: boolean): void {
    const flow: Nillable<IDebugFlow> = $isNil(this.selected) ? null : this.findFlow(this.selected.key);

    if (!isGameStarted() || $isNil(flow)) {
      return this.owner.report("select a flow in a running game");
    }

    this.flowResult = runDebugFlow(flow, isTravelAllowed);
    this.owner.onAction(`${flow.identity}: ${this.flowResult.outcome}`);
  }

  /**
   * Make the selected flow the one the overlay follows, or stop following it.
   */
  public onPinFlow(): void {
    const manager: DebugManager = this.owner.manager;
    const flow: Nillable<IDebugFlow> = $isNil(this.selected) ? null : this.findFlow(this.selected.key);
    const replaced: Nillable<IDebugFlow> = manager.pinnedFlow;

    if (!isGameStarted() || $isNil(flow)) {
      return this.owner.report("select a flow in a running game");
    } else if (replaced?.identity === flow.identity) {
      manager.pinFlow(null);

      return this.owner.onAction(`${flow.identity} unpinned from the overlay`);
    }

    manager.pinFlow(flow);

    const replacing: TLabel = $isNil(replaced) ? "" : `, replacing ${replaced.identity}`;
    const hint: TLabel = manager.preferences.isOverlayEnabled ? "" : " - turn the overlay on in the system tab";

    this.owner.onAction(`${flow.identity} pinned to the overlay${replacing}${hint}`);
  }

  protected override buildEntries(): LuaArray<IDebugQuestEntry> {
    if (!isGameStarted()) {
      return new LuaTable();
    }

    switch (this.owner.manager.preferences.questView) {
      case EDebugQuestView.TASKS:
        return buildDebugTaskEntries();

      case EDebugQuestView.INFO_PORTIONS:
        return buildDebugInfoPortionEntries(this.owner.manager.recentInfoPortions);

      case EDebugQuestView.FLOWS: {
        const flows: Nillable<LuaArray<IDebugFlow>> = readDebugFlows();

        return $isNil(flows) ? new LuaTable() : buildDebugFlowEntries(flows);
      }
    }
  }

  protected override isSameEntry(first: IDebugQuestEntry, second: IDebugQuestEntry): boolean {
    return first.key === second.key;
  }

  protected override refreshSelection(): void {
    const view: EDebugQuestView = this.owner.manager.preferences.questView;

    if (view === EDebugQuestView.FLOWS && $isNil(readDebugFlows())) {
      return this.fillFieldList(
        this.uiFields,
        $fromArray([{ label: "flows", value: "not built - run 'npm run cli checks build'" }])
      );
    } else if ($isNil(this.selected)) {
      return this.fillFieldList(this.uiFields, $fromArray([{ label: "selected", value: "nothing" }]));
    }

    switch (view) {
      case EDebugQuestView.TASKS:
        return this.fillFieldList(this.uiFields, inspectDebugTask(this.selected.key));

      case EDebugQuestView.INFO_PORTIONS:
        return this.fillFieldList(
          this.uiFields,
          $fromArray([
            { label: "info portion", value: this.selected.key },
            { label: "actor has it", value: hasInfoPortion(this.selected.key) ? "yes" : "no" },
          ])
        );

      case EDebugQuestView.FLOWS:
        return this.fillFieldList(
          this.uiFields,
          $isNil(this.flowResult)
            ? $fromArray([{ label: "flow", value: `${this.selected.key} - run it to see its steps` }])
            : inspectDebugFlowResult(this.flowResult)
        );
    }
  }

  /**
   * @param identity - Flow identity.
   * @returns The built flow of that identity, `null` when there is none.
   */
  private findFlow(identity: TLabel): Nillable<IDebugFlow> {
    const flows: Nillable<LuaArray<IDebugFlow>> = readDebugFlows();

    if ($isNil(flows)) {
      return null;
    }

    for (const index of $range(1, flows.length())) {
      if (flows.get(index).identity === identity) {
        return flows.get(index);
      }
    }

    return null;
  }
}
