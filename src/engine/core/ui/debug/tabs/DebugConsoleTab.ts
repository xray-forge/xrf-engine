import { CUIEditBox, CUIScrollView, CUIStatic, DIK_keys, LuabindClass } from "xray16";
import { TKeyCode } from "xray16/alias";
import { LuaArray, TCount, TIndex, TLabel, TName, TPath } from "xray16/lib";

import { EDebugTab, IDebugConsoleResult } from "@/engine/core/managers/debug/debug_types";
import { debugConfig } from "@/engine/core/managers/debug/DebugConfig";
import { createDebugConsoleEnvironment, evaluateDebugLua } from "@/engine/core/managers/debug/utils/debug_console";
import type { Debugger } from "@/engine/core/ui/debug/Debugger";
import { DebuggerTab } from "@/engine/core/ui/debug/tabs/DebuggerTab";
import { initializeStatics } from "@/engine/core/utils/ui";

const base: TPath = "menu\\debug\\DebugConsoleTab.component";

// Characters an output row fits.
const LINE_LENGTH: TCount = 140;

/**
 * Console tab: Lua typed on the bottom line runs with `actor`, `target` and `registry` set, and what it returns shows
 * above. Up and down step through the lines run before.
 */
@LuabindClass()
export class DebugConsoleTab extends DebuggerTab {
  public uiOutput!: CUIScrollView;
  public uiInput!: CUIEditBox;
  // Output rows, oldest first from `firstRow`.
  public uiRows: LuaTable<TIndex, CUIStatic> = new LuaTable();
  public firstRow: TIndex = 1;
  public rowCount: TCount = 0;

  // Position in the history the input shows, zero for a new line.
  public historyIndex: TIndex = 0;

  public constructor(owner: Debugger) {
    super(owner, EDebugTab.CONSOLE, base);
  }

  public override initialize(): void {
    initializeStatics(this.xml, this, "output_background", "hint");

    this.uiOutput = this.xml.InitScrollView("output", this);
    this.uiInput = this.initializeEditBox("input", () => this.onRun());

    this.initializeButton("run_button", () => this.onRun());
  }

  /**
   * The output stays as it is between openings.
   */
  public override refresh(): void {}

  /**
   * Run the typed line and show what it returns.
   */
  public onRun(): void {
    const code: string = this.uiInput.GetText();

    if (code === "") {
      return;
    }

    const result: IDebugConsoleResult = evaluateDebugLua(
      code,
      createDebugConsoleEnvironment(this.owner.manager.target.id)
    );

    this.print(`> ${code}`, "output_command");
    this.print(result.text, result.isError ? "output_error" : "output_line");

    this.owner.manager.rememberConsoleLine(code);
    this.historyIndex = 0;
    this.uiInput.SetText("");
  }

  /**
   * Step through the history with up and down.
   */
  public override onKeyPressed(key: TKeyCode): boolean {
    if (key !== DIK_keys.DIK_UP && key !== DIK_keys.DIK_DOWN) {
      return false;
    }

    const history: LuaArray<string> = this.owner.manager.preferences.consoleHistory;

    this.historyIndex = math.max(0, math.min(history.length(), this.historyIndex + (key === DIK_keys.DIK_UP ? 1 : -1)));
    this.uiInput.SetText(this.historyIndex === 0 ? "" : history.get(this.historyIndex));

    return true;
  }

  /**
   * Add text to the output, a line per row, dropping the oldest rows past the limit.
   *
   * @param text - Text to add.
   * @param template - Row template, coloured for what the text is: a command, a result or an error.
   */
  private print(text: TLabel, template: TName): void {
    for (const [line] of string.gmatch(text, "[^\n]+")) {
      for (const offset of $range(1, string.len(line), LINE_LENGTH)) {
        this.printRow(string.sub(line, offset, offset + LINE_LENGTH - 1), template);
      }
    }

    this.uiOutput.ScrollToEnd();
  }

  /**
   * Add one row to the output.
   *
   * @param text - Row text, short enough for one row.
   * @param template - Row template.
   */
  private printRow(text: TLabel, template: TName): void {
    const row: CUIStatic = this.xml.InitStatic(template, null);

    row.TextControl().SetText(text);
    row.SetAutoDelete(true);

    this.uiOutput.AddWindow(row, true);
    this.uiRows.set(this.firstRow + this.rowCount, row);
    this.rowCount += 1;

    if (this.rowCount > debugConfig.CONSOLE_OUTPUT_LIMIT) {
      this.uiOutput.RemoveWindow(this.uiRows.get(this.firstRow));
      this.uiRows.delete(this.firstRow);
      this.firstRow += 1;
      this.rowCount -= 1;
    }
  }
}
