import { LuaArray, Nillable, TLabel, TNumberId } from "xray16/lib";

import { TConsoleCommand } from "@/engine/constants/console_commands";

/**
 * Tabs of the debugger window, in the order they are listed.
 */
export enum EDebugTab {
  TARGET = "target",
  PLAYER = "player",
  SYSTEM = "system",
}

/**
 * Object the debugger inspects and acts on, kept for the session only: ids do not carry across saves.
 */
export interface IDebugTarget {
  // Id of the targeted object, online or offline.
  id: Nillable<TNumberId>;
  // A pinned target survives the debugger opening on another object under the crosshair.
  isPinned: boolean;
  // Recently targeted object ids, newest first.
  recentIds: LuaArray<TNumberId>;
}

/**
 * Debugger preferences, kept in a file per install.
 */
export interface IDebugPreferences {
  // Tab the debugger reopens on.
  tab: EDebugTab;
}

/**
 * Value style of a console command the debugger toggles.
 */
export enum EDebugToggleType {
  // Takes `on` and `off`.
  ON_OFF,
  // Takes `1` and `0`.
  ZERO_ONE,
}

/**
 * Console command the debugger shows as a toggle.
 */
export interface IDebugConsoleToggle {
  command: TConsoleCommand;
  type: EDebugToggleType;
}

/**
 * One labelled value an inspector reports.
 */
export interface IDebugField {
  label: TLabel;
  value: TLabel;
}
