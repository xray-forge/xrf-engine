import { Fragment, JSXNode, JSXXML } from "jsx-xml";

import { XrScrollView } from "@/engine/forms/components/base/XrScrollView.component";
import { DebugPanel } from "@/engine/forms/menu/debug/components/DebugPanel.component";

/**
 * Scrolled list on a sunken panel.
 */
export function DebugList(props: { tag: string; x: number; y: number; width: number; height: number }): JSXNode {
  return (
    <Fragment>
      <DebugPanel tag={`${props.tag}_background`} x={props.x} y={props.y} width={props.width} height={props.height} />
      <XrScrollView
        tag={props.tag}
        x={props.x + 8}
        y={props.y + 6}
        width={props.width - 12}
        height={props.height - 12}
        rightIndent={0}
        leftIndent={0}
        topIndent={0}
        bottomIndent={0}
        vertInterval={1}
        alwaysShowScroll={false}
      />
    </Fragment>
  );
}
