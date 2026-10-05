import { SCREEN_BASE_HEIGHT, SCREEN_BASE_WIDTH } from "@/engine/core/ui/screen_layout";

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

/**
 * Spawn tab: the catalogue browser on the left, its icon cells and list rows, and the recent spawns on the right.
 */
export const DEBUG_BROWSER = { x: 0, y: 60, width: 552, height: DEBUG_TAB_AREA.height - 60 };
export const DEBUG_SPAWN_CELL = { width: 90, height: 95, gap: 2 };
export const DEBUG_BROWSER_ROW = { width: DEBUG_BROWSER.width - 12, height: 22, gap: 2 };
export const DEBUG_SPAWN_RECENT_ROW = { y: 536, height: 20, gap: 2 };
