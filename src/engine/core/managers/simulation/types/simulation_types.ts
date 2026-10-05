import type { ALifeSmartTerrainTask } from "xray16/alias";
import type { Nillable, PartialRecord, TName, TNumberId, TRate } from "xray16/lib";

import type { TCommunity } from "@/engine/constants/communities";
import type { Actor } from "@/engine/core/objects/creature/Actor";
import type { SmartTerrain } from "@/engine/core/objects/smart_terrain";
import type { Squad } from "@/engine/core/objects/squad";

/**
 * Type of smart terrain simulation role.
 */
export const enum ESimulationRole {
  ACTOR = "actor",
  SQUAD = "squad",
  SMART_TERRAIN = "smart",
}

/**
 * Type of smart terrain simulation role.
 *
 * @inline
 */
export enum ESimulationTerrainRole {
  DEFAULT = "default",
  BASE = "base",
  SURGE = "surge",
  RESOURCE = "resource",
  TERRITORY = "territory",
  LAIR = "lair",
}

/**
 * Simulation interaction object generic.
 */
export type TSimulationObject = Squad | SmartTerrain | Actor;

/**
 * Why a smart terrain is not a valid target for a squad.
 *
 * @inline
 */
export enum ESimulationTargetRejection {
  RESPAWN_ONLY = "respawn only",
  FULL = "full",
  NO_FACTION_RULE = "no rule for the faction",
  NO_ROLE_ALLOWED = "no role the faction may take",
}

/**
 * Smart terrain details descriptor for alife participation.
 */
export interface ISmartTerrainDescriptor {
  terrain: SmartTerrain;
  assignedSquads: LuaTable<TNumberId, Squad>;
}

/**
 * Generic simulation target.
 * Used for building game logic with custom alife priorities and decisions.
 */
export interface ISimulationTarget {
  // Simulation properties of separate object entity.
  simulationProperties: LuaTable<TName, TRate>;

  /**
   * @returns Whether object is participating in simulation.
   */
  isSimulationAvailable(): boolean;
  /**
   * @returns Whether object can be selected as simulation target by squad.
   */
  isValidSimulationTarget(squad: Squad): boolean;
  /**
   * @returns Whether object reached by squad.
   */
  isReachedBySimulationObject(squad: Squad): boolean;
  /**
   * Get CObject for smart terrain task.
   */
  getSimulationTask(): ALifeSmartTerrainTask;
  /**
   * On target selected by simulation squad.
   * Means that some squad started reaching the object.
   */
  onSimulationTargetSelected(squad: Squad): void;
  /**
   * On deselection by simulation squad.
   * Means that current instance is not reached anymore.
   */
  onSimulationTargetDeselected(squad: Squad): void;
}

/**
 * Whether squad can select target.
 */
export type TSimulationActivityPrecondition = (this: void, squad: Squad, target: ISimulationTarget) => boolean;

/**
 * Generic faction activity description in terms of target selection.
 */
export interface ISimulationActivityDescriptor {
  squad: Nillable<PartialRecord<TCommunity, Nillable<TSimulationActivityPrecondition>>>;
  smart: Nillable<PartialRecord<ESimulationTerrainRole, Nillable<TSimulationActivityPrecondition>>>;
  actor: Nillable<TSimulationActivityPrecondition>;
}

/**
 * Descriptor of possible simulation target to pick.
 */
export interface IAvailableSimulationTargetDescriptor {
  priority: TRate;
  target: TSimulationObject;
}
