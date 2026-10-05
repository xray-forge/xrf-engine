import { CUI3tButton, CUIEditBox, CUIStatic, LuabindClass } from "xray16";
import { LuaArray, Nillable, TIndex, TLabel } from "xray16/lib";
import { $isNil, $isNotNil } from "xray16/macros";

import { debugConfig } from "@/engine/core/managers/debug/DebugConfig";
import { filterDebugEntries } from "@/engine/core/managers/debug/utils/debug_search";
import { DEBUG_BROWSER, DEBUG_BROWSER_ROW } from "@/engine/core/ui/debug/debug_layout";
import { DebuggerTab } from "@/engine/core/ui/debug/tabs/DebuggerTab";
import { DebugPager } from "@/engine/core/ui/debug/tabs/DebugPager";

/**
 * Row a browser lists: what it shows, and the text the search matches.
 */
export interface IDebugBrowserEntry {
  label: TLabel;
  // Lower case text the search matches.
  search: string;
}

/**
 * Tab browsing a list a page at a time on the left, searched, with one row selected and shown on the right. Built on
 * the `DebugBrowser` form markup: the search box, the page controls and a column of rows.
 */
@LuabindClass()
export abstract class DebugBrowserTab<T extends IDebugBrowserEntry> extends DebuggerTab {
  public uiSearch!: CUIEditBox;
  public uiPage!: CUIStatic;
  public uiRows: LuaArray<CUI3tButton> = new LuaTable();

  // Rows that match the search, the page of them shown, and the one selected.
  public entries: LuaArray<T> = new LuaTable();
  public pager: DebugPager = new DebugPager(debugConfig.BROWSER_ROWS);
  public selected: Nillable<T> = null;

  /**
   * @returns Every row of the list shown now, before the search.
   */
  protected abstract buildEntries(): LuaArray<T>;

  /**
   * @param first - Row of one build.
   * @param second - Row of another build.
   * @returns Whether both rows stand for the same thing, as rebuilt rows are new tables.
   */
  protected abstract isSameEntry(first: T, second: T): boolean;

  /**
   * Show the selected row on the right.
   */
  protected abstract refreshSelection(): void;

  /**
   * Fill the rows that match the search, keeping the selection and the page where they still exist.
   */
  public fillEntries(): void {
    const selected: Nillable<T> = this.selected;

    this.entries = filterDebugEntries(this.buildEntries(), this.uiSearch.GetText());
    this.selected = null;

    if ($isNotNil(selected)) {
      for (const index of $range(1, this.entries.length())) {
        if (this.isSameEntry(this.entries.get(index), selected)) {
          this.selected = this.entries.get(index);
        }
      }
    }

    this.pager.turn(0, this.entries.length());
  }

  /**
   * Show the page of rows, marking the selected one.
   */
  public refreshBrowser(): void {
    this.uiPage.TextControl().SetText(this.pager.describe(this.entries.length()));

    for (const index of $range(1, this.uiRows.length())) {
      const row: CUI3tButton = this.uiRows.get(index);
      const entry: Nillable<T> = index <= this.pager.size ? this.entries.get(this.pager.getListIndex(index)) : null;

      row.Show($isNotNil(entry));

      if ($isNotNil(entry)) {
        row.TextControl().SetText(entry === this.selected ? `> ${entry.label}` : entry.label);
      }
    }
  }

  /**
   * Filter the list by the search box, from the first page.
   */
  public onSearch(): void {
    this.pager.page = 1;
    this.fillEntries();
    this.refresh();
  }

  /**
   * Turn the page.
   *
   * @param step - Pages to turn, back when negative.
   */
  public onPageChanged(step: number): void {
    this.pager.turn(step, this.entries.length());
    this.refresh();
  }

  /**
   * Select a row of the shown page.
   *
   * @param index - Position of the row on the page, from one.
   */
  public onEntryClicked(index: TIndex): void {
    const entry: Nillable<T> = this.entries.get(this.pager.getListIndex(index));

    if ($isNil(entry)) {
      return;
    }

    this.selected = entry;
    this.refresh();
  }

  /**
   * Create the search box, the page controls and the rows of the browser.
   */
  protected initializeBrowser(): void {
    this.uiSearch = this.initializeEditBox("search_input", () => this.onSearch());
    this.uiPage = this.xml.InitStatic("page", this);

    this.initializeButton("search_button", () => this.onSearch());
    this.initializeButton("previous_page_button", () => this.onPageChanged(-1));
    this.initializeButton("next_page_button", () => this.onPageChanged(1));

    this.uiRows = this.initializeButtonColumn(
      "row",
      debugConfig.BROWSER_ROWS,
      DEBUG_BROWSER.y + 6,
      DEBUG_BROWSER_ROW.height + DEBUG_BROWSER_ROW.gap,
      (index) => this.onEntryClicked(index)
    );
  }
}
