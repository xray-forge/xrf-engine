import { CUI3tButton, CUIScrollView, CUIStatic, CUITabControl, LuabindClass } from "xray16";
import {
  create2dVector,
  isWideScreen,
  LuaArray,
  Nillable,
  TCount,
  TIndex,
  TLabel,
  TPath,
  TRate,
  TSection,
} from "xray16/lib";
import { $fromArray, $isNil, $isNotNil } from "xray16/macros";

import { SYSTEM_INI } from "@/engine/core/database";
import { readIniNumber, readIniString } from "@/engine/core/ini";
import {
  EDebugSpawnDestination,
  EDebugSpawnKind,
  EDebugTab,
  IDebugField,
  IDebugSpawnEntry,
} from "@/engine/core/managers/debug/debug_types";
import { debugConfig } from "@/engine/core/managers/debug/DebugConfig";
import { isDebugItemKind } from "@/engine/core/managers/debug/utils/debug_catalogue";
import { spawnDebugEntry } from "@/engine/core/managers/debug/utils/debug_spawn_actions";
import {
  DEBUG_BROWSER,
  DEBUG_SIDE,
  DEBUG_SPAWN_CELL,
  DEBUG_SPAWN_PREVIEW,
  DEBUG_SPAWN_RECENT_ROW,
} from "@/engine/core/ui/debug/debug_layout";
import type { Debugger } from "@/engine/core/ui/debug/Debugger";
import { DebugBrowserTab } from "@/engine/core/ui/debug/tabs/DebugBrowserTab";
import { SCREEN_WIDE_COEFFICIENT } from "@/engine/core/ui/screen_layout";
import { isGameStarted } from "@/engine/core/utils/game";
import { createRectangle } from "@/engine/core/utils/rectangle";
import { initializeStatics } from "@/engine/core/utils/ui";

const base: TPath = "menu\\debug\\DebugSpawnTab.component";

/**
 * Icon cell of the item grid.
 */
interface IDebugSpawnCell {
  background: CUIStatic;
  selection: CUIStatic;
  icon: CUIStatic;
  button: CUI3tButton;
}

/**
 * Spawn tab: a catalogue of spawnable sections by kind, searched and browsed a page at a time, items as a grid of icons
 * and creatures and squads as rows, spawned in a count and a place of choice.
 */
@LuabindClass()
export class DebugSpawnTab extends DebugBrowserTab<IDebugSpawnEntry> {
  public uiKinds!: CUITabControl;
  public uiDestinations!: CUITabControl;
  public uiCount!: CUIStatic;
  public uiPreviewIcon!: CUIStatic;
  public uiFields!: CUIScrollView;
  public uiCells: LuaArray<IDebugSpawnCell> = new LuaTable();
  public uiRecentRows: LuaArray<CUI3tButton> = new LuaTable();

  public count: TCount = 1;

  public constructor(owner: Debugger) {
    super(owner, EDebugTab.SPAWN, base);
  }

  public override initialize(): void {
    initializeStatics(
      this.xml,
      this,
      "browser_background",
      "preview_background",
      "fields_background",
      "heading_spawn",
      "heading_recent"
    );

    this.initializeBrowser();
    this.initializeCells();

    this.uiKinds = this.initializeTabControl("kinds", () => this.onKindChanged());
    this.uiDestinations = this.initializeTabControl("destinations", () => this.onDestinationChanged());
    this.uiCount = this.xml.InitStatic("count", this);
    this.uiPreviewIcon = this.xml.InitStatic("preview_icon", this.xml.InitStatic("preview_box", this));
    this.uiFields = this.xml.InitScrollView("fields", this);

    this.uiPreviewIcon.InitTexture(debugConfig.ICON_TEXTURE);
    this.uiPreviewIcon.SetStretchTexture(true);

    this.initializeButton("count_less_button", () => this.onCountChanged(-1));
    this.initializeButton("count_more_button", () => this.onCountChanged(1));
    this.initializeButton("spawn_button", () => this.onSpawn());

    this.uiRecentRows = this.initializeButtonColumn(
      "recent_row",
      DEBUG_SPAWN_RECENT_ROW.rows,
      DEBUG_SPAWN_RECENT_ROW.height + DEBUG_SPAWN_RECENT_ROW.gap,
      (index) => this.onRecentClicked(index)
    );

    this.uiKinds.SetActiveTab(this.owner.manager.preferences.spawnKind);
    this.uiDestinations.SetActiveTab(this.owner.manager.preferences.spawnDestination);

    this.showKind();
  }

  public override refresh(): void {
    this.uiCount.TextControl().SetText(tostring(this.count));

    this.refreshBrowser();
    this.refreshSelection();
    this.refreshRecent();
  }

  /**
   * Show the page of entries: icons for items, rows of sections for creatures and squads.
   */
  public override refreshBrowser(): void {
    const isItems: boolean = isDebugItemKind(this.owner.manager.preferences.spawnKind);

    super.refreshBrowser();

    for (const index of $range(1, this.uiRows.length())) {
      this.uiRows.get(index).Show(!isItems && this.uiRows.get(index).IsShown());
    }

    this.uiRowSelection.Show(!isItems && this.uiRowSelection.IsShown());

    for (const index of $range(1, this.uiCells.length())) {
      const cell: IDebugSpawnCell = this.uiCells.get(index);
      const entry: Nillable<IDebugSpawnEntry> = isItems ? this.entries.get(this.pager.getListIndex(index)) : null;

      cell.background.Show(isItems);
      cell.button.Show($isNotNil(entry));
      cell.icon.Show($isNotNil(entry));
      cell.selection.Show($isNotNil(entry) && entry === this.selected);

      if ($isNotNil(entry)) {
        this.showIcon(cell.icon, entry.section, DEBUG_SPAWN_CELL.width - 8, DEBUG_SPAWN_CELL.height - 8);
      }
    }
  }

  /**
   * Show the kind picked in the kinds strip.
   */
  public onKindChanged(): void {
    const kind: EDebugSpawnKind = this.uiKinds.GetActiveId() as EDebugSpawnKind;

    if (kind !== this.owner.manager.preferences.spawnKind) {
      this.owner.manager.preferences.spawnKind = kind;
      this.owner.manager.savePreferences();
    }

    this.showKind();
    this.refresh();
  }

  /**
   * Remember the destination picked.
   */
  public onDestinationChanged(): void {
    this.owner.manager.preferences.spawnDestination = this.uiDestinations.GetActiveId() as EDebugSpawnDestination;
    this.owner.manager.savePreferences();
  }

  /**
   * Change how many to spawn.
   *
   * @param step - Change of the count.
   */
  public onCountChanged(step: number): void {
    this.count = math.max(1, math.min(100, this.count + step));
    this.uiCount.TextControl().SetText(tostring(this.count));
  }

  /**
   * Select a recently spawned section, switching to its kind.
   *
   * @param index - Position in the recent spawns, from one.
   */
  public onRecentClicked(index: TIndex): void {
    const entry: Nillable<IDebugSpawnEntry> = this.findEntry(this.owner.manager.preferences.recentSpawns.get(index));

    if ($isNil(entry)) {
      return;
    }

    this.uiSearch.SetText("");
    this.uiKinds.SetActiveTab(entry.kind);
    this.onKindChanged();
    this.selected = entry;
    this.refresh();
  }

  /**
   * Spawn the selected entry. Spawns into the world close the debugger, so they can be seen.
   */
  public onSpawn(): void {
    if (!isGameStarted()) {
      return this.owner.report("no game running");
    } else if ($isNil(this.selected)) {
      return this.owner.report("select something to spawn");
    }

    const destination: EDebugSpawnDestination = this.owner.manager.preferences.spawnDestination;
    const message: TLabel = spawnDebugEntry(this.selected, this.count, destination, this.owner.manager.target.id);

    this.owner.manager.rememberSpawn(this.selected.section);

    if (destination === EDebugSpawnDestination.INVENTORY && isDebugItemKind(this.selected.kind)) {
      this.owner.onAction(message);
    } else {
      this.owner.report(message);
      this.owner.resume();
    }
  }

  protected override buildEntries(): LuaArray<IDebugSpawnEntry> {
    return this.owner.manager.getCatalogue().get(this.owner.manager.preferences.spawnKind);
  }

  protected override isSameEntry(first: IDebugSpawnEntry, second: IDebugSpawnEntry): boolean {
    return first.section === second.section;
  }

  /**
   * Show the selected entry: its icon and what it is.
   */
  protected override refreshSelection(): void {
    const entry: Nillable<IDebugSpawnEntry> = this.selected;

    this.uiPreviewIcon.Show($isNotNil(entry) && isDebugItemKind(entry.kind));

    if ($isNil(entry)) {
      return this.fillFieldList(this.uiFields, $fromArray([{ label: "selected", value: "nothing" }]));
    }

    const fields: LuaArray<IDebugField> = $fromArray<IDebugField>([
      { label: "name", value: entry.label },
      { label: "section", value: entry.section },
      { label: "kind", value: entry.kind },
    ]);

    if (isDebugItemKind(entry.kind)) {
      this.showIcon(this.uiPreviewIcon, entry.section, DEBUG_SIDE.width - 8, DEBUG_SPAWN_PREVIEW.height - 8);

      fields.set(fields.length() + 1, {
        label: "cost",
        value: tostring(readIniNumber(SYSTEM_INI, entry.section, "cost", false, 0)),
      });
      fields.set(fields.length() + 1, {
        label: "weight",
        value: string.format("%.2f kg", readIniNumber(SYSTEM_INI, entry.section, "inv_weight", false, 0)),
      });
    } else if (entry.kind === EDebugSpawnKind.SQUADS) {
      fields.set(fields.length() + 1, {
        label: "members",
        value: readIniString(SYSTEM_INI, entry.section, "npc", false, null, ""),
      });
    }

    this.fillFieldList(this.uiFields, fields);
  }

  /**
   * Show the entries of the kind in the kind's page size, from the first page with nothing selected.
   */
  private showKind(): void {
    this.pager.page = 1;
    this.pager.size = isDebugItemKind(this.owner.manager.preferences.spawnKind)
      ? debugConfig.SPAWN_GRID_COLUMNS * debugConfig.SPAWN_GRID_ROWS
      : debugConfig.BROWSER_ROWS;
    this.selected = null;
    this.fillEntries();
  }

  /**
   * Create the icon cells of the item grid.
   */
  private initializeCells(): void {
    const columns: TCount = debugConfig.SPAWN_GRID_COLUMNS;

    for (const index of $range(1, columns * debugConfig.SPAWN_GRID_ROWS)) {
      const column: TIndex = (index - 1) % columns;
      const row: TIndex = math.floor((index - 1) / columns);
      const cell: CUIStatic = this.xml.InitStatic("cell", this);

      cell.SetWndPos(
        create2dVector(
          DEBUG_BROWSER.x + 6 + column * (DEBUG_SPAWN_CELL.width + DEBUG_SPAWN_CELL.gap),
          DEBUG_BROWSER.y + 6 + row * (DEBUG_SPAWN_CELL.height + DEBUG_SPAWN_CELL.gap)
        )
      );

      // The button frames the cell, the selection tint and the icon lie over it, disabled so clicks reach it.
      const entry: IDebugSpawnCell = {
        background: cell,
        button: this.initializeButton("cell_button", () => this.onEntryClicked(index), cell, `cell_${index}`),
        selection: this.xml.InitStatic("cell_selection", cell),
        icon: this.xml.InitStatic("cell_icon", cell),
      };

      entry.selection.Enable(false);
      entry.icon.Enable(false);
      entry.icon.InitTexture(debugConfig.ICON_TEXTURE);
      entry.icon.SetStretchTexture(true);

      this.uiCells.set(index, entry);
    }
  }

  /**
   * Show the recent spawns.
   */
  private refreshRecent(): void {
    const recentSpawns: LuaArray<TSection> = this.owner.manager.preferences.recentSpawns;

    for (const index of $range(1, this.uiRecentRows.length())) {
      const row: CUI3tButton = this.uiRecentRows.get(index);
      const section: Nillable<TSection> = recentSpawns.get(index);

      row.Show($isNotNil(section));

      if ($isNotNil(section)) {
        row.TextControl().SetText(section);
      }
    }
  }

  /**
   * Cut a section's inventory icon from the equipment texture and fit it, centred, into a box its parent spans.
   *
   * @param icon - Static showing the icon.
   * @param section - Item section.
   * @param width - Width of the box.
   * @param height - Height of the box.
   */
  private showIcon(icon: CUIStatic, section: TSection, width: number, height: number): void {
    const size: number = debugConfig.ICON_GRID_SIZE;
    const x: number = readIniNumber(SYSTEM_INI, section, "inv_grid_x", false, 0) * size;
    const y: number = readIniNumber(SYSTEM_INI, section, "inv_grid_y", false, 0) * size;
    const iconWidth: number = readIniNumber(SYSTEM_INI, section, "inv_grid_width", false, 1) * size;
    const iconHeight: number = readIniNumber(SYSTEM_INI, section, "inv_grid_height", false, 1) * size;
    // Wide screens stretch the 4:3 layout sideways, which the icon width makes up for.
    const aspect: TRate = isWideScreen() ? SCREEN_WIDE_COEFFICIENT : 1;
    const scale: TRate = math.min(width / (iconWidth * aspect), height / iconHeight, 1);
    const shownWidth: number = iconWidth * scale * aspect;
    const shownHeight: number = iconHeight * scale;

    icon.SetTextureRect(createRectangle(x, y, x + iconWidth, y + iconHeight));
    icon.SetWndSize(create2dVector(shownWidth, shownHeight));
    icon.SetWndPos(create2dVector((width - shownWidth) / 2 + 4, (height - shownHeight) / 2 + 4));
  }

  /**
   * @param section - Section to look for.
   * @returns Catalogue entry of the section, `null` when the debugger does not spawn it.
   */
  private findEntry(section: Nillable<TSection>): Nillable<IDebugSpawnEntry> {
    for (const [, entries] of this.owner.manager.getCatalogue()) {
      for (const index of $range(1, entries.length())) {
        if (entries.get(index).section === section) {
          return entries.get(index);
        }
      }
    }

    return null;
  }
}
