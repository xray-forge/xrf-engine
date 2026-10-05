import { Vector } from "xray16/alias";
import { LuaArray, Nillable, TIndex, TLabel, TName, TNumberId, TSection } from "xray16/lib";

import { TConsoleCommand } from "@/engine/constants/console_commands";

/**
 * Tabs of the debugger window, in the order they are listed.
 */
export enum EDebugTab {
  TARGET = "target",
  PLAYER = "player",
  SPAWN = "spawn",
  WORLD = "world",
  SYSTEM = "system",
}

/**
 * Lists the world tab browses, in the order they are listed.
 */
export enum EDebugWorldView {
  SMART_TERRAINS = "smart terrains",
  SQUADS = "squads",
  OBJECTS = "objects",
  STORY_OBJECTS = "story objects",
  POSITIONS = "saved positions",
  TREASURES = "treasures",
}

/**
 * Place in the world the actor can be teleported to.
 */
export interface IDebugPlace {
  position: Vector;
  levelVertexId: TNumberId;
  gameVertexId: TNumberId;
}

/**
 * Position saved in the world tab, in plain numbers as the preferences file keeps it.
 */
export interface IDebugSavedPosition {
  name: TLabel;
  level: TName;
  x: number;
  y: number;
  z: number;
  levelVertexId: TNumberId;
  gameVertexId: TNumberId;
}

/**
 * Row of a world tab list: an object, or a saved position.
 */
export interface IDebugWorldEntry extends IDebugPlace {
  // Object of the row, `null` for a saved position.
  id: Nillable<TNumberId>;
  // Position of a saved position among the saved ones.
  savedIndex: Nillable<TIndex>;
  label: TLabel;
  // Label in lower case, matched by the search.
  search: string;
}

/**
 * Kinds the spawn tab groups spawnable sections into, in the order they are listed.
 */
export enum EDebugSpawnKind {
  WEAPONS = "weapons",
  AMMO = "ammo",
  OUTFITS = "outfits",
  ARTEFACTS = "artefacts",
  CONSUMABLES = "consumables",
  DEVICES = "devices",
  OTHER = "other",
  MONSTERS = "monsters",
  STALKERS = "stalkers",
  SQUADS = "squads",
}

/**
 * Where the spawn tab puts what it spawns.
 */
export enum EDebugSpawnDestination {
  INVENTORY = "inventory",
  CROSSHAIR = "crosshair",
  ACTOR = "near actor",
  TARGET = "near target",
  SMART_TERRAIN = "smart terrain",
}

/**
 * Spawnable section in the spawn tab's catalogue.
 */
export interface IDebugSpawnEntry {
  section: TSection;
  kind: EDebugSpawnKind;
  // Translated inventory name for items, the section for creatures and squads.
  name: TLabel;
  // Section and name in lower case, matched by the search.
  search: string;
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
  // Kind the spawn tab shows.
  spawnKind: EDebugSpawnKind;
  // Where the spawn tab puts what it spawns.
  spawnDestination: EDebugSpawnDestination;
  // Recently spawned sections, newest first.
  recentSpawns: LuaArray<TSection>;
  // List the world tab shows.
  worldView: EDebugWorldView;
  // Positions saved in the world tab.
  savedPositions: LuaArray<IDebugSavedPosition>;
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
