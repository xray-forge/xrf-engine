import { Fragment, JSXNode, JSXXML } from "jsx-xml";

import { DEBUG_BROWSER, DEBUG_BROWSER_ROW } from "@/engine/core/ui/debug/debug_layout";
import { DEBUG_LABEL_COLOR } from "@/engine/forms/menu/debug/components/debug_theme";
import { DebugButton } from "@/engine/forms/menu/debug/components/DebugButton.component";
import { DebugEditBox } from "@/engine/forms/menu/debug/components/DebugEditBox.component";
import { DebugPanel } from "@/engine/forms/menu/debug/components/DebugPanel.component";
import { DebugRow } from "@/engine/forms/menu/debug/components/DebugRow.component";
import { DebugSelection } from "@/engine/forms/menu/debug/components/DebugSelection.component";
import { DebugText } from "@/engine/forms/menu/debug/components/DebugText.component";

/**
 * Search box, page controls, and the panel, row template and selection marker of a paged browser, as the spawn, world
 * and quests tabs use.
 */
export function DebugBrowser(): JSXNode {
  const pagerX: number = DEBUG_BROWSER.width - 170;

  return (
    <Fragment>
      <DebugEditBox tag={"search_input"} x={0} y={32} width={pagerX - 96} />
      <DebugButton tag={"search_button"} label={"search"} x={pagerX - 88} y={32} width={80} />
      <DebugButton tag={"previous_page_button"} label={"<"} x={pagerX} y={32} width={32} />
      <DebugText tag={"page"} x={pagerX + 36} y={34} width={98} align={"c"} color={DEBUG_LABEL_COLOR} />
      <DebugButton tag={"next_page_button"} label={">"} x={DEBUG_BROWSER.width - 32} y={32} width={32} />

      <DebugPanel
        tag={"browser_background"}
        x={DEBUG_BROWSER.x}
        y={DEBUG_BROWSER.y}
        width={DEBUG_BROWSER.width}
        height={DEBUG_BROWSER.height}
      />
      <DebugSelection tag={"row_selection"} width={DEBUG_BROWSER_ROW.width} height={DEBUG_BROWSER_ROW.height} />
      <DebugRow
        tag={"row"}
        x={DEBUG_BROWSER.x + 6}
        y={DEBUG_BROWSER.y + 6}
        width={DEBUG_BROWSER_ROW.width}
        height={DEBUG_BROWSER_ROW.height}
      />
    </Fragment>
  );
}
