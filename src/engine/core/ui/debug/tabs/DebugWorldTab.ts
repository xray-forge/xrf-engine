import { CUIScrollView, CUITabControl, LuabindClass } from "xray16";
import { LuaArray, Nillable, TIndex, TLabel, TName, TPath } from "xray16/lib";
import { $fromArray, $isNil } from "xray16/macros";

import { EDebugTab, EDebugWorldView, IDebugWorldEntry } from "@/engine/core/managers/debug/debug_types";
import { formatDebugPosition, inspectDebugTarget } from "@/engine/core/managers/debug/utils/debug_inspect";
import { buildDebugWorldEntries, getDebugWorldTreasureName } from "@/engine/core/managers/debug/utils/debug_world";
import {
  deleteDebugPosition,
  giveAllDebugTreasures,
  giveDebugTreasure,
  giveRandomDebugTreasure,
  saveDebugPosition,
  teleportActorToDebugWorldEntry,
} from "@/engine/core/managers/debug/utils/debug_world_actions";
import type { Debugger } from "@/engine/core/ui/debug/Debugger";
import { DebugBrowserTab } from "@/engine/core/ui/debug/tabs/DebugBrowserTab";
import { isGameStarted } from "@/engine/core/utils/game";
import { initializeStatics } from "@/engine/core/utils/ui";

const base: TPath = "menu\\debug\\DebugWorldTab.component";

/**
 * World tab: smart terrains, squads, objects, story objects, saved positions and treasures, searched and browsed a page
 * at a time, with what to do with the one selected.
 */
@LuabindClass()
export class DebugWorldTab extends DebugBrowserTab<IDebugWorldEntry> {
  public uiViews!: CUITabControl;
  public uiFields!: CUIScrollView;

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

    this.initializeBrowser();

    this.uiViews = this.initializeTabControl("views", () => this.onViewChanged());
    this.uiFields = this.xml.InitScrollView("fields", this);

    this.initializeButton("target_button", () => this.onTarget());
    this.initializeButton("teleport_button", () => this.onTeleport());
    this.initializeButton("save_position_button", () => this.onSavePosition());
    this.initializeButton("delete_position_button", () => this.onDeletePosition());
    this.initializeButton("give_treasure_button", () => this.onAction(() => this.giveSelectedTreasure()));
    this.initializeButton("give_random_treasure_button", () => this.onAction(giveRandomDebugTreasure));
    this.initializeButton("give_all_treasures_button", () => this.onAction(giveAllDebugTreasures));

    this.uiViews.SetActiveTab(this.owner.manager.preferences.worldView);
  }

  /**
   * Rebuild the rows, as the world changes while the debugger is closed.
   */
  public override refresh(): void {
    this.fillEntries();
    this.refreshBrowser();
    this.refreshSelection();
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

  protected override buildEntries(): LuaArray<IDebugWorldEntry> {
    return isGameStarted()
      ? buildDebugWorldEntries(this.owner.manager.preferences.worldView, this.owner.manager.preferences.savedPositions)
      : new LuaTable();
  }

  protected override isSameEntry(first: IDebugWorldEntry, second: IDebugWorldEntry): boolean {
    return first.id === second.id && first.savedIndex === second.savedIndex;
  }

  protected override refreshSelection(): void {
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
   * @returns Result message of giving the coordinates of the selected treasure.
   */
  private giveSelectedTreasure(): TLabel {
    const name: Nillable<TName> = $isNil(this.selected) ? null : getDebugWorldTreasureName(this.selected);

    return $isNil(name) ? "select a treasure" : giveDebugTreasure(name);
  }
}
