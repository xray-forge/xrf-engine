import { EDebugOverlaySlot } from "@/engine/core/managers/debug/debug_types";
import { SCREEN_BASE_HEIGHT, SCREEN_BASE_WIDTH } from "@/engine/core/ui/screen_layout";

/**
 * Debugger window: a frame inset from the screen edges, a header across its top, the tab list down its left, the
 * message line across its bottom, and the area tabs open in, all spaced by the same gap.
 */
export const DEBUG_MARGIN: number = 12;
export const DEBUG_GAP: number = 12;
export const DEBUG_HEADER_HEIGHT: number = 52;
export const DEBUG_TAB_LIST_WIDTH: number = 124;
export const DEBUG_MESSAGE_HEIGHT: number = 28;
// Recent targets the header's drop down list shows, newest first.
export const DEBUG_RECENT_TARGETS = { width: 240, rows: 8, rowHeight: 20 };

export const DEBUG_FRAME = {
  x: DEBUG_MARGIN,
  y: DEBUG_MARGIN,
  width: SCREEN_BASE_WIDTH - DEBUG_MARGIN * 2,
  height: SCREEN_BASE_HEIGHT - DEBUG_MARGIN * 2,
};

export const DEBUG_TAB_AREA = {
  x: DEBUG_MARGIN + DEBUG_TAB_LIST_WIDTH + DEBUG_GAP,
  y: DEBUG_MARGIN + DEBUG_HEADER_HEIGHT + DEBUG_GAP,
  width: SCREEN_BASE_WIDTH - DEBUG_MARGIN * 2 - DEBUG_TAB_LIST_WIDTH - DEBUG_GAP * 2,
  height: SCREEN_BASE_HEIGHT - DEBUG_MARGIN * 2 - DEBUG_HEADER_HEIGHT - DEBUG_MESSAGE_HEIGHT - DEBUG_GAP * 2,
};

export const DEBUG_BUTTON_WIDTH: number = 150;
export const DEBUG_BUTTON_HEIGHT: number = 24;
export const DEBUG_BUTTON_GAP: number = 6;
export const DEBUG_ROW_HEIGHT: number = 20;
// Width a character of the small font takes on average, to fit text into a width before it wraps.
export const DEBUG_CHARACTER_WIDTH: number = 6.4;

// Cards of controls: a title bar over rows of buttons, inside a padding, stacked a gap apart.
export const DEBUG_CARD = { padding: 10, titleHeight: 26, gap: 8 };

/**
 * Columns of a tab: the main one on the left, and the side one on the right holding what is selected and cards of
 * actions, two buttons a row.
 */
export const DEBUG_SIDE = {
  x: DEBUG_TAB_AREA.width - DEBUG_BUTTON_WIDTH * 2 - DEBUG_CARD.gap - DEBUG_CARD.padding * 2,
  width: DEBUG_BUTTON_WIDTH * 2 + DEBUG_CARD.gap + DEBUG_CARD.padding * 2,
};
export const DEBUG_MAIN_WIDTH: number = DEBUG_SIDE.x - DEBUG_GAP;

/**
 * @param rows - Rows of buttons.
 * @returns Height of a card with its title and that many rows of buttons.
 */
export function getDebugCardHeight(rows: number): number {
  return DEBUG_CARD.titleHeight + DEBUG_CARD.padding * 2 + rows * DEBUG_BUTTON_HEIGHT + (rows - 1) * DEBUG_BUTTON_GAP;
}

/**
 * Browser of the spawn, world and quests tabs: a strip of lists and the search above, and a page of rows or icon cells
 * in the main column.
 */
export const DEBUG_BROWSER = { x: 0, y: 64, width: DEBUG_MAIN_WIDTH, height: DEBUG_TAB_AREA.height - 64 };
export const DEBUG_BROWSER_ROW = { width: DEBUG_BROWSER.width - 12, height: 22, gap: 1 };
export const DEBUG_SPAWN_CELL = { width: 81, height: 92, gap: 2 };
export const DEBUG_SPAWN_RECENT_ROW = { height: 20, gap: 1, rows: 5 };
export const DEBUG_SPAWN_PREVIEW = { y: DEBUG_BROWSER.y, height: 120 };

/**
 * @param slot - Overlay slot.
 * @returns Name its card and view strip are tagged with in the overlay tab's form.
 */
export function getDebugOverlaySlotTag(slot: EDebugOverlaySlot): string {
  return slot.split(" ").join("_");
}

/**
 * Overlay panels: rows of a label and a value, and where each slot puts its panel.
 */
const OVERLAY_PANEL = { width: 300, rowHeight: 16, rows: 14, labelWidth: 96, padding: 6 };

export const DEBUG_OVERLAY_PANEL = {
  ...OVERLAY_PANEL,
  valueWidth: OVERLAY_PANEL.width - OVERLAY_PANEL.labelWidth - OVERLAY_PANEL.padding * 2,
};
export const DEBUG_OVERLAY_SLOT_POSITIONS: Record<EDebugOverlaySlot, { x: number; y: number }> = {
  [EDebugOverlaySlot.TOP_RIGHT]: { x: SCREEN_BASE_WIDTH - DEBUG_OVERLAY_PANEL.width - 12, y: 40 },
  [EDebugOverlaySlot.MIDDLE_LEFT]: { x: 12, y: 250 },
  [EDebugOverlaySlot.MIDDLE_RIGHT]: { x: SCREEN_BASE_WIDTH - DEBUG_OVERLAY_PANEL.width - 12, y: 320 },
};
