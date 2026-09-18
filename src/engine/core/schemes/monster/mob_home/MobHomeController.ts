import { patrol } from "xray16";
import { Patrol, ServerCreatureObject } from "xray16/alias";
import { assert, Nillable, TDistance, TName, TNumberId } from "xray16/lib";
import { $filename, $isNotNil } from "xray16/macros";

import { registry, setMonsterState } from "@/engine/core/database";
import { IWaypointData, parseWaypointData } from "@/engine/core/ini";
import type { SmartTerrain } from "@/engine/core/objects/smart_terrain";
import { AbstractSchemeController } from "@/engine/core/schemes/base";
import { ISchemeMobHomeState } from "@/engine/core/schemes/monster/mob_home/mob_home_types";
import { mobHomeConfig } from "@/engine/core/schemes/monster/mob_home/MobHomeConfig";
import { LuaLogger } from "@/engine/core/utils/logging";

const logger: LuaLogger = new LuaLogger($filename);

/**
 * Controller to assign home locations for mobs and guard them.
 */
export class MobHomeController extends AbstractSchemeController<ISchemeMobHomeState> {
  public override activate(): void {
    setMonsterState(this.object, this.state.monsterState);

    const [name, minRadius, maxRadius, isAggressive, midRadius] = this.getHomeParameters();

    logger.info("Activate mob home: %s %s %s %s %s", this.object.name(), name, minRadius, maxRadius, isAggressive);
    this.object.set_home(name as TName, minRadius, maxRadius, isAggressive, midRadius);
  }

  public override deactivate(): void {
    logger.info("Deactivate mob home: %s", this.object.name());

    this.object.remove_home();
  }

  /**
   * Get home parameters based on current schema state.
   */
  public getHomeParameters(): LuaMultiReturn<[TNumberId | TName, TDistance, TDistance, boolean, TDistance]> {
    const isAggressive: boolean = this.state.isAggressive || false;

    let minRadius: TDistance = mobHomeConfig.DEFAULT_MIN_RADIUS;
    let maxRadius: TDistance = mobHomeConfig.DEFAULT_MAX_RADIUS;
    let midRadius: TDistance = mobHomeConfig.DEFAULT_MID_RADIUS;

    let waypointData: Partial<IWaypointData> = {};
    let radius: TDistance = 0;

    if ($isNotNil(this.state.homeWayPoint)) {
      const homePatrol: Patrol = new patrol(this.state.homeWayPoint);

      waypointData = parseWaypointData(this.state.homeWayPoint, homePatrol.flags(0), homePatrol.name(0));
    }

    // Assign min radius.
    if (this.state.homeMinRadius) {
      minRadius = this.state.homeMinRadius;
    } else if ($isNotNil(waypointData.minr)) {
      radius = tonumber(waypointData.minr) as TDistance;

      if ($isNotNil(radius)) {
        minRadius = radius;
      }
    }

    // Assign max radius.
    if (this.state.homeMaxRadius) {
      maxRadius = this.state.homeMaxRadius;
    } else if ($isNotNil(waypointData.maxr)) {
      radius = tonumber(waypointData.maxr) as TDistance;

      if ($isNotNil(radius)) {
        maxRadius = radius;
      }
    }

    assert(
      maxRadius >= minRadius,
      "MobHome: Home min Radius MUST be <= max radius. Got: min radius = %d, max radius = %d.",
      minRadius,
      maxRadius
    );

    // Assign mid radius.
    if (this.state.homeMidRadius) {
      midRadius = this.state.homeMidRadius;

      if (midRadius <= minRadius || midRadius >= maxRadius) {
        midRadius = minRadius + (maxRadius - minRadius) / 2;
      }
    } else {
      midRadius = minRadius + (maxRadius - minRadius) / 2;
    }

    // Assign mob home.
    if (this.state.isSmartTerrainPoint) {
      const terrain: Nillable<SmartTerrain> = registry.simulator.object(
        registry.simulator.object<ServerCreatureObject>(this.object.id())!.m_smart_terrain_id
      );
      const vertexId: Nillable<TNumberId> = terrain ? terrain.m_level_vertex_id : null;

      return $multi(vertexId as TNumberId, minRadius, maxRadius, isAggressive, midRadius);
    }

    logger.info("Activate mob home: %s %s", this.object.name(), this.state.homeWayPoint);

    return $multi(this.state.homeWayPoint as TName, minRadius, maxRadius, isAggressive, midRadius);
  }
}
