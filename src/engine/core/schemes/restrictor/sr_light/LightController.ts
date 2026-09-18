import { GameObject } from "xray16/alias";

import { registry } from "@/engine/core/database";
import { AbstractSchemeController } from "@/engine/core/schemes/base";
import { ISchemeLightState } from "@/engine/core/schemes/restrictor/sr_light/sr_light_types";
import { trySwitchToAnotherSection } from "@/engine/core/schemes/runtime/scheme_switch";

/**
 * Controller handling light scheme behaviour for a restrictor zone, registering it as a light zone for stalker checks.
 */
export class LightController extends AbstractSchemeController<ISchemeLightState> {
  public active: boolean = false;

  public override activate(): void {
    registry.lightZones.set(this.object.id(), this);
  }

  public override deactivate(): void {
    this.active = false;
    registry.lightZones.delete(this.object.id());
  }

  public update(): void {
    if (trySwitchToAnotherSection(this.object, this.state)) {
      return;
    }

    this.active = true;
  }

  /**
   * Check whether the given object is inside the active light zone and report the configured light state.
   *
   * @param object - Object whose position is checked against the zone.
   * @returns Pair of the configured light flag and whether the object is inside an active zone.
   */
  public checkStalker(object: GameObject): LuaMultiReturn<[boolean, boolean]> {
    if (!this.active) {
      return $multi(false, false);
    }

    if (this.object.inside(object.position())) {
      return $multi(this.state.light, true);
    }

    return $multi(false, false);
  }
}
