import { device, level } from "xray16";
import { GameObject, ServerObject, Vector } from "xray16/alias";
import { copyVector, MAX_LEVEL_VERTEX_ID, Nillable, TCount, TDistance, TLabel, TNumberId } from "xray16/lib";
import { $isNil } from "xray16/macros";

import { getGameObjectById, registry } from "@/engine/core/database";
import { EDebugSpawnDestination, EDebugSpawnKind, IDebugSpawnEntry } from "@/engine/core/managers/debug/debug_types";
import { debugConfig } from "@/engine/core/managers/debug/DebugConfig";
import { isDebugItemKind } from "@/engine/core/managers/debug/utils/debug_catalogue";
import { spawnItemsAtPosition, spawnItemsForObject, spawnSquadInSmart } from "@/engine/core/utils/spawn";

/**
 * Where in the world a spawn lands.
 */
interface IDebugSpawnPlacement {
  position: Vector;
  levelVertexId: TNumberId;
  gameVertexId: TNumberId;
}

/**
 * @param position - World position.
 * @param fallbackVertexId - Level vertex to use when the position is off the AI graph.
 * @returns Placement on the level the actor is on.
 */
function placeOnLevel(position: Vector, fallbackVertexId: TNumberId): IDebugSpawnPlacement {
  const vertexId: TNumberId = level.vertex_id(position);

  return {
    position,
    levelVertexId: vertexId < MAX_LEVEL_VERTEX_ID ? vertexId : fallbackVertexId,
    gameVertexId: registry.actor.game_vertex_id(),
  };
}

/**
 * @param serverObject - Object to place next to.
 * @returns Placement where the object stands.
 */
function placeAtServerObject(serverObject: ServerObject): IDebugSpawnPlacement {
  return {
    position: serverObject.position,
    levelVertexId: serverObject.m_level_vertex_id,
    gameVertexId: serverObject.m_game_vertex_id,
  };
}

/**
 * Work out where a destination puts a spawn.
 *
 * @param destination - Spawn destination, anything but the inventory.
 * @param targetId - Current debugger target.
 * @returns Placement, or why there is none.
 */
function getSpawnPlacement(
  destination: EDebugSpawnDestination,
  targetId: Nillable<TNumberId>
): IDebugSpawnPlacement | TLabel {
  const actor: GameObject = registry.actor;

  switch (destination) {
    case EDebugSpawnDestination.CROSSHAIR: {
      const distance: TDistance = level.get_target_dist();

      if (distance <= 0 || distance > debugConfig.CROSSHAIR_DISTANCE_LIMIT) {
        return `nothing under the crosshair within ${debugConfig.CROSSHAIR_DISTANCE_LIMIT} m`;
      }

      // Stop short of the surface hit, so the spawn lands in front of it rather than inside.
      const position: Vector = copyVector(device().cam_pos).add(copyVector(device().cam_dir).mul(distance - 0.5));

      return placeOnLevel(position, actor.level_vertex_id());
    }

    case EDebugSpawnDestination.ACTOR:
      return placeOnLevel(
        copyVector(actor.position()).add(copyVector(actor.direction()).mul(3)),
        actor.level_vertex_id()
      );

    case EDebugSpawnDestination.TARGET: {
      const object: Nillable<GameObject> = getGameObjectById(targetId);
      const serverObject: Nillable<ServerObject> = $isNil(targetId) ? null : registry.simulator.object(targetId);

      if ($isNil(object)) {
        return $isNil(serverObject) ? "no target" : placeAtServerObject(serverObject);
      }

      return {
        position: object.position(),
        levelVertexId: object.level_vertex_id(),
        gameVertexId: object.game_vertex_id(),
      };
    }

    case EDebugSpawnDestination.SMART_TERRAIN: {
      const terrainId: Nillable<TNumberId> = registry.smartTerrainNearest.id;

      return $isNil(terrainId)
        ? "no smart terrain near the actor"
        : placeAtServerObject(registry.simulator.object(terrainId)!);
    }

    default:
      return `cannot place a spawn at '${destination}'`;
  }
}

/**
 * Spawn a catalogue entry. Squads always join the smart terrain nearest the actor, as the simulation needs one.
 *
 * @param entry - Catalogue entry to spawn.
 * @param count - How many to spawn.
 * @param destination - Where to put them.
 * @param targetId - Current debugger target, for the destination next to it.
 * @returns Result message.
 */
export function spawnDebugEntry(
  entry: IDebugSpawnEntry,
  count: TCount,
  destination: EDebugSpawnDestination,
  targetId: Nillable<TNumberId>
): TLabel {
  if (entry.kind === EDebugSpawnKind.SQUADS) {
    const terrainId: Nillable<TNumberId> = registry.smartTerrainNearest.id;

    if ($isNil(terrainId)) {
      return "no smart terrain near the actor for the squad";
    }

    const terrainName: TLabel = registry.simulator.object(terrainId)!.name();

    for (const _ of $range(1, count)) {
      spawnSquadInSmart(entry.section, terrainName);
    }

    return `spawned ${count} x ${entry.section} at ${terrainName}`;
  }

  if (destination === EDebugSpawnDestination.INVENTORY) {
    if (!isDebugItemKind(entry.kind)) {
      return `${entry.kind} cannot go to the inventory`;
    }

    spawnItemsForObject(registry.actor, entry.section, count);

    return `spawned ${count} x ${entry.name} in the inventory`;
  }

  const placement: IDebugSpawnPlacement | TLabel = getSpawnPlacement(destination, targetId);

  if (type(placement) === "string") {
    return placement as TLabel;
  }

  const { position, levelVertexId, gameVertexId } = placement as IDebugSpawnPlacement;

  if (isDebugItemKind(entry.kind)) {
    spawnItemsAtPosition(entry.section, gameVertexId, levelVertexId, position, count);
  } else {
    for (const _ of $range(1, count)) {
      registry.simulator.create(entry.section, position, levelVertexId, gameVertexId);
    }
  }

  return `spawned ${count} x ${entry.name} ${destination === EDebugSpawnDestination.CROSSHAIR ? "at the crosshair" : destination}`;
}
