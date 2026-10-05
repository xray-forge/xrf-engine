import { JSXNode, JSXXML } from "jsx-xml";

import { fonts } from "@/engine/constants/fonts";
import { DEBUG_LABEL_COLOR, DEBUG_TINT } from "@/engine/forms/menu/debug/components/debug_theme";
import { DebugBorder } from "@/engine/forms/menu/debug/components/DebugBorder.component";
import { DebugFill } from "@/engine/forms/menu/debug/components/DebugFill.component";
import { DebugStateTextures } from "@/engine/forms/menu/debug/components/DebugStateTextures.component";
import { DebugTextColors } from "@/engine/forms/menu/debug/components/DebugTextColors.component";
import { THorizontalTextAlign } from "@/engine/forms/types";

/**
 * Tab control with its buttons laid out in a grid, filled row by row: flat buttons, amber while selected. The window
 * finds it by its tag, and each button by its id.
 *
 * @param props - Tab control layout.
 * @param props.tag - Tag of the tab control.
 * @param props.x - Left edge.
 * @param props.y - Top edge.
 * @param props.ids - Button ids, also their labels unless `labels` names them.
 * @param props.labels - Labels of buttons whose id would read badly, or is a string table id the game translates.
 * @param props.columns - Buttons per row.
 * @param props.buttonWidth - Width of a button.
 * @param props.buttonHeight - Height of a button.
 * @param props.gap - Space between buttons.
 * @param props.isLarge - Whether labels use the larger font.
 * @param props.align - Label alignment.
 * @param props.isPlain - Whether buttons are bare text, as a list of tabs, rather than filled controls.
 */
export function DebugTabStrip(props: {
  tag: string;
  x: number;
  y: number;
  ids: Array<string>;
  labels?: Partial<Record<string, string>>;
  columns: number;
  buttonWidth: number;
  buttonHeight: number;
  gap?: number;
  isLarge?: boolean;
  align?: THorizontalTextAlign;
  isPlain?: boolean;
}): JSXNode {
  const { gap = 4, align = "c" } = props;
  const rows: number = Math.ceil(props.ids.length / props.columns);

  return JSXXML(
    props.tag,
    {
      x: props.x,
      y: props.y,
      width: props.columns * (props.buttonWidth + gap),
      height: rows * (props.buttonHeight + gap),
    },
    props.ids.map((it, index) => (
      <button
        id={it}
        x={(index % props.columns) * (props.buttonWidth + gap)}
        y={Math.floor(index / props.columns) * (props.buttonHeight + gap)}
        width={props.buttonWidth}
        height={props.buttonHeight}
        stretch={1}
      >
        {props.isPlain ? null : (
          <DebugFill x={0} y={0} width={props.buttonWidth} height={props.buttonHeight} tint={DEBUG_TINT.control} />
        )}
        {props.isPlain ? null : (
          <DebugBorder width={props.buttonWidth} height={props.buttonHeight} tint={DEBUG_TINT.controlBorder} />
        )}
        <text
          font={props.isLarge ? fonts.letterica18 : fonts.letterica16}
          align={align}
          vert_align={"c"}
          x={align === "l" ? 12 : 0}
        >
          {props.labels?.[it] ?? it}
        </text>
        <DebugStateTextures />
        <DebugTextColors enabled={DEBUG_LABEL_COLOR} />
      </button>
    ))
  );
}
