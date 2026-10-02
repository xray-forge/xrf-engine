import { clsid, level, patrol } from "xray16";
import { Patrol, ServerCreatureObject, ServerObject, Vector } from "xray16/alias";
import { abort, LuaArray, NIL, Nillable, TName, TNumberId, TSection } from "xray16/lib";
import { $filename, $isNil, $isNotNil } from "xray16/macros";

import { TLevel } from "@/engine/constants/levels";
import { SMART_TERRAIN_SECTION } from "@/engine/constants/sections";
import { registry, SYSTEM_INI } from "@/engine/core/database";
import {
  parseConditionsList,
  parseStringsList,
  pickSectionFromCondList,
  readIniString,
  readIniTwoNumbers,
} from "@/engine/core/ini";
import { updateSquadMapSpot } from "@/engine/core/managers/map/utils/map_spot_squad";
import { updateTerrainMapSpot } from "@/engine/core/managers/map/utils/map_spot_terrain";
import { simulationConfig } from "@/engine/core/managers/simulation/SimulationConfig";
import { ISmartTerrainDescriptor } from "@/engine/core/managers/simulation/types";
import { invalidateSimulationTerrainAssignedSquadsCount } from "@/engine/core/managers/simulation/utils/simulation_data";
import { SmartTerrain } from "@/engine/core/objects/smart_terrain";
import type { Squad } from "@/engine/core/objects/squad";
import { ESquadActionType } from "@/engine/core/objects/squad/squad_types";
import { setObjectTeamSquadGroup } from "@/engine/core/utils/community";
import { LuaLogger } from "@/engine/core/utils/logging";
import { setSquadRelationToActor } from "@/engine/core/utils/relation";
import { getSquadMembers } from "@/engine/core/utils/squad/squad_members";

const logger: LuaLogger = new LuaLogger($filename);
const simulationLogger: LuaLogger = new LuaLogger($filename, { file: "simulation" });

/**
 * Register squad in alife simulation.
 *
 * @param squad - Target squad to register.
 */
export function registerSimulationSquad(squad: Squad): void {
  simulationConfig.SQUADS.set(squad.id, squad);
}

/**
 * Unregister squad from simulation.
 *
 * @param squad - Target squad to unregister.
 */
export function unRegisterSimulationSquad(squad: Squad): void {
  simulationConfig.SQUADS.delete(squad.id);
  removeTemporarySimulationSquadAssignments(squad);
}

/**
 * Remove a squad from every deferred terrain assignment.
 *
 * A squad can be reassigned or released before its terrain registers, so deferred queues must not retain stale entries.
 *
 * @param squad - Squad whose deferred assignments should be removed.
 */
function removeTemporarySimulationSquadAssignments(squad: Squad): void {
  for (const [terrainId, assignedSquads] of simulationConfig.TEMPORARY_ASSIGNED_SQUADS) {
    const retainedSquads: LuaArray<Squad> = new LuaTable();

    for (const [, assignedSquad] of assignedSquads) {
      if (assignedSquad.id !== squad.id) {
        table.insert(retainedSquads, assignedSquad);
      }
    }

    if (retainedSquads.length() === 0) {
      simulationConfig.TEMPORARY_ASSIGNED_SQUADS.delete(terrainId);
    } else {
      simulationConfig.TEMPORARY_ASSIGNED_SQUADS.set(terrainId, retainedSquads);
    }
  }
}

/**
 * Create squad in smart terrain.
 *
 * @param terrain - Target terrain to create in.
 * @param section - Name of squad section to create.
 * @returns Newly created squad.
 */
export function createSimulationSquad(terrain: SmartTerrain, section: TSection): Squad {
  simulationLogger.info("Create squad: '%s' -> '%s'.", terrain.name(), section);

  const squad: Squad = registry.simulator.create<Squad>(
    section,
    terrain.position,
    terrain.m_level_vertex_id,
    terrain.m_game_vertex_id
  );

  createSimulationSquadMembers(squad, terrain);

  if (squad.relationship) {
    setSquadRelationToActor(squad, squad.relationship);
  }

  assignSimulationSquadToTerrain(squad, terrain.id);

  for (const squadMember of squad.squad_members()) {
    setupSimulationObjectSquadAndGroup(squadMember.object);
  }

  return squad;
}

/**
 * Spawn default squad members for provided squad / smart terrain.
 * Selects configuration based objects to spawn and assign to the squad.
 *
 * Contains strictly defined objects for the squad and random sections with random count to fill the squad.
 *
 * @param squad - Target squad to spawn members for.
 * @param spawnTerrain - Parent smart terrain assigned to squad.
 */
export function createSimulationSquadMembers(squad: Squad, spawnTerrain: SmartTerrain): void {
  const squadSection: TSection = squad.section_name();
  const spawnSections: LuaArray<TSection> = parseStringsList(
    readIniString(SYSTEM_INI, squadSection, "npc", false, null, "")
  );
  const spawnPointData: string =
    readIniString(SYSTEM_INI, squadSection, "spawn_point", false) ??
    readIniString(spawnTerrain.ini, SMART_TERRAIN_SECTION, "spawn_point", false) ??
    "self";
  const spawnPoint: Nillable<TName> = pickSectionFromCondList(
    registry.actor,
    squad,
    parseConditionsList(spawnPointData)
  );
  const spawnPointName: Nillable<TName> =
    spawnPoint && spawnPoint !== NIL ? spawnPoint : (spawnTerrain.spawnPointName as TName);
  const randomSpawnConfig: Nillable<string> = readIniString(SYSTEM_INI, squadSection, "npc_random", false);

  if (!randomSpawnConfig && spawnSections.length() === 0) {
    abort("Unexpected attempt to spawn an empty squad '%s'.", squadSection);
  }

  logger.info("Create squad members: %s %s %s %s", squad.name(), spawnTerrain.name(), spawnPointData, spawnPoint);

  let baseSpawnPosition: Vector;
  let baseLevelVertexId: TNumberId;
  let baseGameVertexId: TNumberId;

  if (spawnPointName && spawnPointName !== "self") {
    const destination: Patrol = new patrol(spawnPointName);

    baseSpawnPosition = destination.point(0);
    baseLevelVertexId = destination.level_vertex_id(0);
    baseGameVertexId = destination.game_vertex_id(0);
  } else {
    baseSpawnPosition = spawnTerrain.position;
    baseLevelVertexId = spawnTerrain.m_level_vertex_id;
    baseGameVertexId = spawnTerrain.m_game_vertex_id;
  }

  for (const [, squadMemberSection] of spawnSections) {
    squad.addMember(squadMemberSection, baseSpawnPosition, baseLevelVertexId, baseGameVertexId);
  }

  if (randomSpawnConfig) {
    const [countMin, countMax] = readIniTwoNumbers(SYSTEM_INI, squadSection, "npc_in_squad", 1, 2);
    const randomSpawn: LuaArray<string> = parseStringsList(randomSpawnConfig)!;

    if (countMin > countMax) {
      abort("When spawning squad min count can't be greater then max count in '%s'.", squadSection);
    }

    for (const _ of $range(1, math.random(countMin, countMax))) {
      squad.addMember(
        randomSpawn!.get(math.random(1, randomSpawn!.length())),
        baseSpawnPosition,
        baseLevelVertexId,
        baseGameVertexId
      );
    }
  }

  squad.assignedTerrainId = spawnTerrain.id;

  updateSquadMapSpot(squad);
}

/**
 * Release squad and squad members.
 * Un-assigns squad from smart terrain and then releases all squad members, the engine then releases the empty squad.
 *
 * @param squad - Target squad object to remove with members including.
 */
export function releaseSimulationSquad(squad: Squad): void {
  simulationLogger.info("Release squad: '%s'.", squad.name());

  assignSimulationSquadToTerrain(squad, null);

  for (const [, member] of getSquadMembers(squad)) {
    const object: Nillable<ServerObject> = registry.simulator.object(member.id);

    if (object) {
      squad.unregister_member(member.id);
      registry.simulator.release(object, true);
    }
  }

  squad.onReleased();
}

/**
 * Set up team, squad and group identifiers for the simulation object.
 * Group is the one of the current level, squad is the one of the terrain its squad heads to or stays in.
 *
 * @param object - Server creature object to set up squad and group for.
 */
export function setupSimulationObjectSquadAndGroup(object: ServerCreatureObject): void {
  const groupId: TNumberId = simulationConfig.GROUP_ID_BY_LEVEL_NAME.get(level.name() as TLevel) ?? 0;
  const squad: Nillable<Squad> = registry.simulator.object<Squad>(object.group_id);

  let terrain: Nillable<SmartTerrain> = null;

  if (squad?.currentAction?.type === ESquadActionType.REACH_TARGET) {
    terrain = registry.simulator.object<SmartTerrain>(squad.assignedTargetId!);
  } else if ($isNotNil(squad?.assignedTerrainId)) {
    terrain = registry.simulator.object<SmartTerrain>(squad.assignedTerrainId);
  }

  // A squad heading to another squad or the actor takes no terrain squad.
  const squadId: TNumberId = terrain?.clsid() === clsid.smart_terrain ? terrain.squadId : 0;

  // Set once, as an online object changes its team on the client and its server fields are not updated at once.
  setObjectTeamSquadGroup(object, object.team, squadId, groupId);
}

/**
 * Assign the squad to the smart terrain, queuing it as temporary when the terrain is not yet registered.
 *
 * @param squad - Squad to assign to the terrain.
 * @param terrainId - Identifier of the target terrain, or null to unassign the squad.
 */
export function assignSimulationSquadToTerrain(squad: Squad, terrainId: Nillable<TNumberId>): void {
  simulationLogger.info("Assign squad to smart terrain: '%s' -> '%s'.", squad.name(), terrainId);

  removeTemporarySimulationSquadAssignments(squad);

  if ($isNotNil(terrainId) && !simulationConfig.TERRAIN_DESCRIPTORS.has(terrainId)) {
    if (!simulationConfig.TEMPORARY_ASSIGNED_SQUADS.has(terrainId)) {
      simulationConfig.TEMPORARY_ASSIGNED_SQUADS.set(terrainId, new LuaTable());
    }

    table.insert(simulationConfig.TEMPORARY_ASSIGNED_SQUADS.get(terrainId), squad);

    return;
  }

  const oldTerrainId: Nillable<TNumberId> = squad.assignedTerrainId;
  const oldTerrainDescriptor: Nillable<ISmartTerrainDescriptor> = oldTerrainId
    ? simulationConfig.TERRAIN_DESCRIPTORS.get(oldTerrainId)
    : null;

  if (oldTerrainDescriptor) {
    const oldTerrain: SmartTerrain = oldTerrainDescriptor.terrain;

    oldTerrainDescriptor.assignedSquads.delete(squad.id);
    invalidateSimulationTerrainAssignedSquadsCount(oldTerrainId as TNumberId);

    updateTerrainMapSpot(oldTerrain);
  }

  if ($isNil(terrainId)) {
    squad.assignToTerrain(null);
  } else {
    const newTerrainDescriptor: ISmartTerrainDescriptor = simulationConfig.TERRAIN_DESCRIPTORS.get(terrainId);

    squad.assignToTerrain(newTerrainDescriptor.terrain);

    newTerrainDescriptor.assignedSquads.set(squad.id, squad);
    invalidateSimulationTerrainAssignedSquadsCount(terrainId);

    updateTerrainMapSpot(newTerrainDescriptor.terrain);
  }
}
