import { JSXNode, JSXXML } from "jsx-xml";

import { fonts } from "@/engine/constants/fonts";
import { DebugStateTextures } from "@/engine/forms/menu/debug/components/DebugStateTextures.component";

/**
 * Clear clickable area turning amber under the cursor, laid over something that draws itself, as an icon cell.
 */
export function DebugHoverArea(props: { tag: string; width: number; height: number }): JSXNode {
  return JSXXML(props.tag, { x: 0, y: 0, width: props.width, height: props.height, stretch: 1 }, [
    <text font={fonts.letterica16}></text>,
    <DebugStateTextures />,
  ]);
}
