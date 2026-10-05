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
  QUESTS = "quests",
  SYSTEM = "system",
  CONSOLE = "console",
}

/**
 * Lists the quests tab browses, in the order they are listed.
 */
export enum EDebugQuestView {
  TASKS = "tasks",
  INFO_PORTIONS = "info portions",
  FLOWS = "flows",
}

/**
 * Row of a quests tab list: a task, an info portion or a flow, by its id.
 */
export interface IDebugQuestEntry {
  key: TName;
  label: TLabel;
  // Label in lower case, matched by the search.
  search: string;
}

/**
 * Check flow the checks build lists in its manifest.
 */
export interface IDebugFlow {
  identity: TName;
  module: TName;
  source: TName;
  // Level the flow requires, `null` for one that travels wherever it needs.
  level: Nillable<TName>;
}

/**
 * What one run of a check flow answers, as far as the debugger shows it. Mirrors the checks framework's result, which
 * the debugger reaches only at run time, as flows are built apart from the engine.
 */
export interface IDebugFlowResult {
  outcome: TName;
  stepNames: LuaArray<TName>;
  position: TIndex;
  waiting: Nillable<{ position: TIndex; name: TName; handOff: Nillable<TLabel> }>;
  failures: LuaArray<{ assertion: TLabel; detail: TLabel }>;
  skipReason: Nillable<TLabel>;
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
 * Places on screen the overlay shows a panel in.
 */
export enum EDebugOverlaySlot {
  TOP_RIGHT = "top right",
  MIDDLE_LEFT = "middle left",
  MIDDLE_RIGHT = "middle right",
}

/**
 * What an overlay panel shows.
 */
export enum EDebugOverlayView {
  OFF = "off",
  TARGET = "target",
  FLOW = "flow",
  ACTOR = "actor",
  WORLD = "world",
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
  label: TLabel;
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
  // List the quests tab shows.
  questView: EDebugQuestView;
  // Lua the console ran, newest first.
  consoleHistory: LuaArray<string>;
  // Whether the overlay shows while the game runs.
  isOverlayEnabled: boolean;
  // View each overlay panel shows.
  overlayViews: Record<EDebugOverlaySlot, EDebugOverlayView>;
}

/**
 * What the overlay views read besides the game itself.
 */
export interface IDebugOverlayState {
  // Object the target view follows.
  targetId: Nillable<TNumberId>;
  // Flow the flow view follows, and its last run.
  flow: Nillable<IDebugFlow>;
  flowResult: Nillable<IDebugFlowResult>;
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
