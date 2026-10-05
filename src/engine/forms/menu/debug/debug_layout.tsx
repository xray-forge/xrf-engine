import { Fragment, JSXNode, JSXXML } from "jsx-xml";
import { TLabel } from "xray16/lib";

import { IRgbColor, WHITE } from "@/engine/constants/colors";
import { fonts } from "@/engine/constants/fonts";
import { SCREEN_BASE_HEIGHT, SCREEN_BASE_WIDTH } from "@/engine/core/ui/screen_layout";
import { Xr3tButton, XrStatic, XrText } from "@/engine/forms/components/base";
import { XrScrollView } from "@/engine/forms/components/base/XrScrollView.component";
import { XrTexture } from "@/engine/forms/components/base/XrTexture.component";

export const DEBUG_MARGIN: number = 16;
export const DEBUG_HEADER_HEIGHT: number = 48;
export const DEBUG_TAB_LIST_WIDTH: number = 112;
export const DEBUG_MESSAGE_HEIGHT: number = 24;

/**
 * Area every tab is placed in, right of the tab list and between the header and the message line.
 */
export const DEBUG_TAB_AREA = {
  x: DEBUG_MARGIN * 2 + DEBUG_TAB_LIST_WIDTH,
  y: DEBUG_MARGIN + DEBUG_HEADER_HEIGHT + 8,
  width: SCREEN_BASE_WIDTH - DEBUG_MARGIN * 3 - DEBUG_TAB_LIST_WIDTH,
  height: SCREEN_BASE_HEIGHT - DEBUG_MARGIN * 2 - DEBUG_HEADER_HEIGHT - DEBUG_MESSAGE_HEIGHT - 16,
};

export const DEBUG_BUTTON_WIDTH: number = 150;
export const DEBUG_BUTTON_HEIGHT: number = 22;
export const DEBUG_ROW_HEIGHT: number = 20;

// Column of action buttons on the right of a tab.
export const DEBUG_ACTIONS_X: number = DEBUG_TAB_AREA.width - DEBUG_BUTTON_WIDTH * 2 - 24;

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
