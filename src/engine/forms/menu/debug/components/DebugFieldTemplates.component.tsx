import { Fragment, JSXNode, JSXXML } from "jsx-xml";

import { DEBUG_ROW_HEIGHT } from "@/engine/core/ui/debug/debug_layout";
import { DEBUG_LABEL_COLOR } from "@/engine/forms/menu/debug/components/debug_theme";
import { DebugText } from "@/engine/forms/menu/debug/components/DebugText.component";

/**
 * Templates of a labelled value row, as inspectors report them.
 *
 * @param props - Template sizes.
 * @param props.width - Width of a row.
 */
export function DebugFieldTemplates(props: { width: number }): JSXNode {
  const labelWidth: number = Math.min(130, Math.floor(props.width * 0.36));

  return (
    <Fragment>
      <field_row x={0} y={0} width={props.width} height={DEBUG_ROW_HEIGHT} />
      <DebugText tag={"field_label"} x={0} y={0} width={labelWidth} color={DEBUG_LABEL_COLOR} />
      <DebugText tag={"field_value"} x={labelWidth} y={0} width={props.width - labelWidth} />
    </Fragment>
  );
}
