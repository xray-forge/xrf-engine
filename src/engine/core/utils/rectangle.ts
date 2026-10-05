import { Frect } from "xray16";

import { SCREEN_BASE_HEIGHT, SCREEN_BASE_WIDTH } from "@/engine/core/ui/screen_layout";

/**
 * Create rectangle based on screen base layout expectations.
 *
 * @inline
 *
 * @returns New rectangle describing screen layout.
 */
export function createScreenRectangle(): Frect {
  return new Frect().set(0, 0, SCREEN_BASE_WIDTH, SCREEN_BASE_HEIGHT);
}
