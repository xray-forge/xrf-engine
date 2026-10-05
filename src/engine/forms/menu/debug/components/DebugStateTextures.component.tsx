import { Fragment, JSXNode, JSXXML } from "jsx-xml";

import { DEBUG_EMPTY_TEXTURE, DEBUG_HOVER_TEXTURE } from "@/engine/forms/menu/debug/components/debug_theme";

/**
 * Textures of a flat control in each state: clear, so the fill under it shows, and amber under the cursor or selected.
 */
export function DebugStateTextures(): JSXNode {
  return (
    <Fragment>
      <texture_e>{DEBUG_EMPTY_TEXTURE}</texture_e>
      <texture_h>{DEBUG_HOVER_TEXTURE}</texture_h>
      <texture_t>{DEBUG_HOVER_TEXTURE}</texture_t>
      <texture_d>{DEBUG_EMPTY_TEXTURE}</texture_d>
    </Fragment>
  );
}
