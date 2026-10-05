import { IRgbColor } from "@/engine/constants/colors";

/**
 * Colour with opacity, as a tinted texture takes it.
 */
export interface IDebugTint extends IRgbColor {
  a: number;
}

/**
 * Tints of the debugger's flat surfaces, darkest to lightest, and of its lines and selection.
 */
export const DEBUG_TINT = {
  backdrop: { r: 4, g: 6, b: 8, a: 215 },
  sunken: { r: 9, g: 11, b: 14, a: 255 },
  surface: { r: 15, g: 18, b: 22, a: 250 },
  raised: { r: 23, g: 28, b: 33, a: 255 },
  control: { r: 35, g: 42, b: 49, a: 255 },
  border: { r: 46, g: 55, b: 64, a: 255 },
  controlBorder: { r: 64, g: 76, b: 88, a: 255 },
  separator: { r: 28, g: 34, b: 40, a: 255 },
  selection: { r: 137, g: 84, b: 30, a: 120 },
  accent: { r: 214, g: 160, b: 80, a: 255 },
} satisfies Record<string, IDebugTint>;

export const DEBUG_TEXT_COLOR: IRgbColor = { r: 222, g: 226, b: 230 };
export const DEBUG_LABEL_COLOR: IRgbColor = { r: 136, g: 148, b: 158 };
export const DEBUG_HEADING_COLOR: IRgbColor = { r: 214, g: 178, b: 120 };
export const DEBUG_MUTED_COLOR: IRgbColor = { r: 92, g: 100, b: 108 };
export const DEBUG_ERROR_COLOR: IRgbColor = { r: 224, g: 96, b: 84 };

// White texture tinted into every flat surface, as Anomaly's own interfaces do.
export const DEBUG_FILL_TEXTURE: string = "ui\\ui_console";
export const DEBUG_EMPTY_TEXTURE: string = "ui\\ui_empty";
// Translucent amber laid over a control the cursor is on, or a tab that is selected.
export const DEBUG_HOVER_TEXTURE: string = "ui\\ui_pop_up_active_back";
