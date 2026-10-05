import { CUI3tButton, CUIEditBox, CUIScrollView, CUIStatic, CUITabControl, LuabindClass } from "xray16";
import { LuaArray, Nillable, TIndex, TLabel, TName, TPath } from "xray16/lib";
import { $fromArray, $isNil, $isNotNil } from "xray16/macros";

import { EDebugTab, EDebugWorldView, IDebugWorldEntry } from "@/engine/core/managers/debug/debug_types";
import { debugConfig } from "@/engine/core/managers/debug/DebugConfig";
import { formatDebugPosition, inspectDebugTarget } from "@/engine/core/managers/debug/utils/debug_inspect";
import { filterDebugEntries } from "@/engine/core/managers/debug/utils/debug_search";
import { buildDebugWorldEntries, getDebugWorldTreasureName } from "@/engine/core/managers/debug/utils/debug_world";
import {
  deleteDebugPosition,
  giveAllDebugTreasures,
  giveDebugTreasure,
  giveRandomDebugTreasure,
  saveDebugPosition,
  teleportActorToDebugWorldEntry,
} from "@/engine/core/managers/debug/utils/debug_world_actions";
import { DEBUG_BROWSER, DEBUG_BROWSER_ROW } from "@/engine/core/ui/debug/debug_layout";
import type { Debugger } from "@/engine/core/ui/debug/Debugger";
import { DebuggerTab } from "@/engine/core/ui/debug/tabs/DebuggerTab";
import { DebugPager } from "@/engine/core/ui/debug/tabs/DebugPager";
import { isGameStarted } from "@/engine/core/utils/game";
import { initializeStatics } from "@/engine/core/utils/ui";

const base: TPath = "menu\\debug\\DebugWorldTab.component";

/**
 * World tab: smart terrains, squads, objects, story objects, saved positions and treasures, searched and browsed a page
 * at a time, with what to do with the one selected.
 */
@LuabindClass()
export class DebugWorldTab extends DebuggerTab {
  public uiViews!: CUITabControl;
  public uiSearch!: CUIEditBox;
  public uiPage!: CUIStatic;
  public uiFields!: CUIScrollView;
  public uiRows: LuaArray<CUI3tButton> = new LuaTable();

  // Rows of the view that match the search, the page of them shown, and the one selected.
  public entries: LuaArray<IDebugWorldEntry> = new LuaTable();
  public pager: DebugPager = new DebugPager(debugConfig.BROWSER_ROWS);
  public selected: Nillable<IDebugWorldEntry> = null;

  public constructor(owner: Debugger) {
    super(owner, EDebugTab.WORLD, base);
  }

  public override initialize(): void {
    initializeStatics(
      this.xml,
      this,
      "browser_background",
      "fields_background",
      "heading_go",
      "heading_positions",
      "positions_hint",
      "heading_treasures"
    );

    this.uiViews = this.initializeTabControl("views", () => this.onViewChanged());
    this.uiSearch = this.initializeEditBox("search_input", () => this.onSearch());

    this.uiPage = this.xml.InitStatic("page", this);
    this.uiFields = this.xml.InitScrollView("fields", this);

    this.initializeButton("search_button", () => this.onSearch());
    this.initializeButton("previous_page_button", () => this.onPageChanged(-1));
    this.initializeButton("next_page_button", () => this.onPageChanged(1));
    this.initializeButton("target_button", () => this.onTarget());
    this.initializeButton("teleport_button", () => this.onTeleport());
    this.initializeButton("save_position_button", () => this.onSavePosition());
    this.initializeButton("delete_position_button", () => this.onDeletePosition());
    this.initializeButton("give_treasure_button", () => this.onAction(() => this.giveSelectedTreasure()));
    this.initializeButton("give_random_treasure_button", () => this.onAction(giveRandomDebugTreasure));
    this.initializeButton("give_all_treasures_button", () => this.onAction(giveAllDebugTreasures));

    this.uiRows = this.initializeButtonColumn(
      "row",
      debugConfig.BROWSER_ROWS,
      DEBUG_BROWSER.y + 6,
      DEBUG_BROWSER_ROW.height + DEBUG_BROWSER_ROW.gap,
      (index) => this.onEntryClicked(index)
    );

    this.uiViews.SetActiveTab(this.owner.manager.preferences.worldView);
  }

  /**
   * Rebuild the rows, as the world changes while the debugger is closed.
   */
  public override refresh(): void {
    this.fillEntries();
    this.refreshPage();
  }

  /**
   * Show the view picked in the views strip.
   */
  public onViewChanged(): void {
    const view: EDebugWorldView = this.uiViews.GetActiveId() as EDebugWorldView;

    if (view !== this.owner.manager.preferences.worldView) {
      this.owner.manager.preferences.worldView = view;
      this.owner.manager.savePreferences();
    }

    this.pager.page = 1;
    this.selected = null;
    this.refresh();
  }

  /**
   * Filter the view by the search box, from the first page.
   */
  public onSearch(): void {
    this.pager.page = 1;
    this.refresh();
  }

  /**
   * Turn the page.
   *
   * @param step - Pages to turn, back when negative.
   */
  public onPageChanged(step: number): void {
    this.pager.turn(step, this.entries.length());
    this.refreshPage();
  }

  /**
   * Select a row of the shown page.
   *
   * @param index - Position of the row on the page, from one.
   */
  public onEntryClicked(index: TIndex): void {
    const entry: Nillable<IDebugWorldEntry> = this.entries.get(this.pager.getListIndex(index));

    if ($isNotNil(entry)) {
      this.selected = entry;
      this.refreshPage();
    }
  }

  /**
   * Make the selected object the debugger target.
   */
  public onTarget(): void {
    if ($isNil(this.selected?.id)) {
      return this.owner.report("select an object to target");
    }

    this.owner.setTarget(this.selected.id);
    this.owner.report(`targeted ${this.selected.label}`);
  }

  /**
   * Teleport to the selected row, closing the debugger.
   */
  public onTeleport(): void {
    if (!isGameStarted()) {
      return this.owner.report("no game running");
    } else if ($isNil(this.selected)) {
      return this.owner.report("select a place to teleport to");
    }

    this.owner.report(teleportActorToDebugWorldEntry(this.selected));
    this.owner.resume();
  }

  /**
   * Save where the actor stands, named by the search text.
   */
  public onSavePosition(): void {
    this.onAction(() => {
      const name: TName = saveDebugPosition(
        this.owner.manager.preferences.savedPositions,
        this.uiSearch.GetText()
      ).name;

      this.owner.manager.savePreferences();

      return `saved position ${name}`;
    });
  }

  /**
   * Forget the selected saved position.
   */
  public onDeletePosition(): void {
    const index: Nillable<TIndex> = this.selected?.savedIndex;

    if ($isNil(index)) {
      return this.owner.report("select a saved position to delete");
    }

    const name: TName = deleteDebugPosition(this.owner.manager.preferences.savedPositions, index);

    this.owner.manager.savePreferences();
    this.selected = null;
    this.owner.onAction(`deleted position ${name}`);
  }

  /**
   * Run an action that needs a game.
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
   * @returns Result message of giving the coordinates of the selected treasure.
   */
  private giveSelectedTreasure(): TLabel {
    const name: Nillable<TName> = $isNil(this.selected) ? null : getDebugWorldTreasureName(this.selected);

    return $isNil(name) ? "select a treasure" : giveDebugTreasure(name);
  }

  /**
   * Fill the rows of the view that match the search.
   */
  private fillEntries(): void {
    this.entries = isGameStarted()
      ? filterDebugEntries(
          buildDebugWorldEntries(
            this.owner.manager.preferences.worldView,
            this.owner.manager.preferences.savedPositions
          ),
          this.uiSearch.GetText()
        )
      : new LuaTable();

    // The selection is kept across rebuilds by what it stands for, as rebuilt rows are new tables.
    this.selected = this.findEntry(this.selected);
    this.pager.turn(0, this.entries.length());
  }

  /**
   * Show the page of rows and the selected row.
   */
  private refreshPage(): void {
    this.uiPage.TextControl().SetText(this.pager.describe(this.entries.length()));

    for (const index of $range(1, this.uiRows.length())) {
      const row: CUI3tButton = this.uiRows.get(index);
      const entry: Nillable<IDebugWorldEntry> = this.entries.get(this.pager.getListIndex(index));

      row.Show($isNotNil(entry));

      if ($isNotNil(entry)) {
        row.TextControl().SetText(entry === this.selected ? `> ${entry.label}` : entry.label);
      }
    }

    if ($isNil(this.selected)) {
      this.fillFieldList(this.uiFields, $fromArray([{ label: "selected", value: "nothing" }]));
    } else if ($isNil(this.selected.id)) {
      this.fillFieldList(
        this.uiFields,
        $fromArray([
          { label: "position", value: this.selected.label },
          { label: "coordinates", value: formatDebugPosition(this.selected.position) },
        ])
      );
    } else {
      this.fillFieldList(this.uiFields, inspectDebugTarget(this.selected.id));
    }
  }

  /**
   * @param entry - Row of an earlier build.
   * @returns Row of the current build standing for the same object or saved position.
   */
  private findEntry(entry: Nillable<IDebugWorldEntry>): Nillable<IDebugWorldEntry> {
    if ($isNil(entry)) {
      return null;
    }

    for (const index of $range(1, this.entries.length())) {
      const it: IDebugWorldEntry = this.entries.get(index);

      if (it.id === entry.id && it.savedIndex === entry.savedIndex) {
        return it;
      }
    }

    return null;
  }
}
