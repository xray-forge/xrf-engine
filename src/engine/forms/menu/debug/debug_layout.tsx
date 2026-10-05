import { Fragment, JSXNode, JSXXML } from "jsx-xml";
import { TLabel } from "xray16/lib";

import { IRgbColor, WHITE } from "@/engine/constants/colors";
import { fonts } from "@/engine/constants/fonts";
import {
  DEBUG_BROWSER,
  DEBUG_BROWSER_ROW,
  DEBUG_BUTTON_HEIGHT,
  DEBUG_BUTTON_WIDTH,
  DEBUG_ROW_HEIGHT,
} from "@/engine/core/ui/debug/debug_layout";
import { Xr3tButton, XrEditBox, XrStatic, XrText } from "@/engine/forms/components/base";
import { XrScrollView } from "@/engine/forms/components/base/XrScrollView.component";
import { XrTabButton } from "@/engine/forms/components/base/XrTabButton.component";
import { XrTexture } from "@/engine/forms/components/base/XrTexture.component";

export const DEBUG_LABEL_COLOR: IRgbColor = { r: 170, g: 170, b: 170 };
export const DEBUG_HEADING_COLOR: IRgbColor = { r: 216, g: 186, b: 140 };

/**
 * Dark translucent panel behind a group of controls.
 */
export function DebugPanel(props: { tag: string; x: number; y: number; width: number; height: number }): JSXNode {
  return (
    <XrStatic tag={props.tag} x={props.x} y={props.y} width={props.width} height={props.height}>
      <XrTexture id={"ui_icons_PDA_tooltips_back"} r={40} g={40} b={40} a={230} />
    </XrStatic>
  );
}

/**
 * Button of the debugger's standard look.
 */
export function DebugButton(props: {
  tag: string;
  label: TLabel;
  x: number;
  y: number;
  width?: number;
  height?: number;
}): JSXNode {
  return (
    <Xr3tButton
      tag={props.tag}
      label={props.label}
      x={props.x}
      y={props.y}
      width={props.width ?? DEBUG_BUTTON_WIDTH}
      height={props.height ?? DEBUG_BUTTON_HEIGHT}
      font={fonts.letterica16}
      textColor={WHITE}
      texture={"ui_inGame2_Mp_bigbuttone"}
    />
  );
}

/**
 * Static showing one line of text.
 */
export function DebugText(props: {
  tag: string;
  x: number;
  y: number;
  width: number;
  height?: number;
  label?: TLabel;
  color?: IRgbColor;
  isLarge?: boolean;
}): JSXNode {
  return (
    <XrStatic tag={props.tag} x={props.x} y={props.y} width={props.width} height={props.height ?? DEBUG_ROW_HEIGHT}>
      <XrText
        label={props.label ?? ""}
        font={props.isLarge ? fonts.letterica18 : fonts.letterica16}
        color={props.color ?? WHITE}
        vertAlign={"c"}
      />
    </XrStatic>
  );
}

/**
 * Scrolled list on a panel.
 */
export function DebugList(props: { tag: string; x: number; y: number; width: number; height: number }): JSXNode {
  return (
    <Fragment>
      <DebugPanel tag={`${props.tag}_background`} x={props.x} y={props.y} width={props.width} height={props.height} />
      <XrScrollView
        tag={props.tag}
        x={props.x + 6}
        y={props.y + 6}
        width={props.width - 12}
        height={props.height - 12}
        rightIndent={0}
        leftIndent={0}
        topIndent={0}
        bottomIndent={0}
        vertInterval={2}
        alwaysShowScroll={false}
      />
    </Fragment>
  );
}

/**
 * Templates of a labelled value row, as inspectors report them.
 *
 * @param props - Template sizes.
 * @param props.width - Width of a row.
 */
export function DebugFieldTemplates(props: { width: number }): JSXNode {
  const labelWidth: number = 130;

  return (
    <Fragment>
      <XrStatic tag={"field_row"} width={props.width} height={DEBUG_ROW_HEIGHT} />
      <DebugText tag={"field_label"} x={0} y={0} width={labelWidth} color={DEBUG_LABEL_COLOR} />
      <DebugText tag={"field_value"} x={labelWidth} y={0} width={props.width - labelWidth} />
    </Fragment>
  );
}

/**
 * Tab control with its buttons laid out in a grid, filled row by row. The window finds it by its tag, and each button by
 * its id.
 *
 * @param props - Tab control layout.
 * @param props.tag - Tag of the tab control.
 * @param props.x - Left edge.
 * @param props.y - Top edge.
 * @param props.ids - Button ids, also their labels.
 * @param props.columns - Buttons per row.
 * @param props.buttonWidth - Width of a button.
 * @param props.buttonHeight - Height of a button.
 * @param props.isLarge - Whether labels use the larger font.
 */
export function DebugTabStrip(props: {
  tag: string;
  x: number;
  y: number;
  ids: Array<string>;
  columns: number;
  buttonWidth: number;
  buttonHeight: number;
  isLarge?: boolean;
}): JSXNode {
  const gap: number = 4;
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
      <XrTabButton
        id={it}
        x={(index % props.columns) * (props.buttonWidth + gap)}
        y={Math.floor(index / props.columns) * (props.buttonHeight + gap)}
        width={props.buttonWidth}
        height={props.buttonHeight}
        texture={"ui_inGame2_Mp_bigbuttone"}
        stretch
      >
        <XrText label={it} font={props.isLarge ? fonts.letterica18 : fonts.letterica16} align={"c"} vertAlign={"c"} />
        <text_color>
          <e r={220} g={220} b={220} />
          <t r={DEBUG_HEADING_COLOR.r} g={DEBUG_HEADING_COLOR.g} b={DEBUG_HEADING_COLOR.b} />
          <h r={WHITE.r} g={WHITE.g} b={WHITE.b} />
        </text_color>
      </XrTabButton>
    ))
  );
}

/**
 * Search box, page controls, and the panel and row template of a paged browser, as the spawn and world tabs use.
 */
export function DebugBrowser(): JSXNode {
  return (
    <Fragment>
      <XrEditBox
        tag={"search_input"}
        x={0}
        y={30}
        width={260}
        height={DEBUG_BUTTON_HEIGHT}
        texture={"ui_inGame2_edit_box_2"}
        font={fonts.letterica16}
        color={WHITE}
      />
      <DebugButton tag={"search_button"} label={"search"} x={266} y={30} width={80} />
      <DebugButton tag={"previous_page_button"} label={"<"} x={360} y={30} width={36} />
      <DebugText tag={"page"} x={402} y={31} width={104} />
      <DebugButton tag={"next_page_button"} label={">"} x={510} y={30} width={36} />

      <DebugPanel
        tag={"browser_background"}
        x={DEBUG_BROWSER.x}
        y={DEBUG_BROWSER.y}
        width={DEBUG_BROWSER.width}
        height={DEBUG_BROWSER.height}
      />
      <Xr3tButton
        tag={"row"}
        label={""}
        x={DEBUG_BROWSER.x + 6}
        width={DEBUG_BROWSER_ROW.width}
        height={DEBUG_BROWSER_ROW.height}
        font={fonts.letterica16}
        textColor={WHITE}
        texture={"ui_inGame2_Mp_bigbuttone"}
        align={"l"}
      />
    </Fragment>
  );
}
