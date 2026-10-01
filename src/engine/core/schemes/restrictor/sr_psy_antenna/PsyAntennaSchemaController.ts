import { GameObject } from "xray16/alias";
import { $filename } from "xray16/macros";

import { getManager, getPortableStoreValue, registry, setPortableStoreValue } from "@/engine/core/database";
import { PsyAntennaManager } from "@/engine/core/managers/psy/PsyAntennaManager";
import { AbstractSchemeController } from "@/engine/core/schemes/base";
import {
  EAntennaState,
  ISchemePsyAntennaState,
} from "@/engine/core/schemes/restrictor/sr_psy_antenna/sr_psy_antenna_types";
import { trySwitchToAnotherSection } from "@/engine/core/schemes/runtime/scheme_switch";
import { LuaLogger } from "@/engine/core/utils/logging";

const logger: LuaLogger = new LuaLogger($filename, { file: "psy" });

/**
 * Controller handling psy antenna scheme behaviour for a restrictor zone, applying psy effects while the actor is inside.
 */
export class PsyAntennaSchemaController extends AbstractSchemeController<ISchemePsyAntennaState> {
  public antennaState: EAntennaState = EAntennaState.VOID;
  public antennaManager: PsyAntennaManager = getManager(PsyAntennaManager);

  public override activate(object: GameObject, loading?: boolean): void {
    logger.info("Activate antenna controller");

    if (loading) {
      this.antennaState = getPortableStoreValue(this.object.id(), "inside")!;
    }

    // Effects of a zone saved inside are taken away, and added back below if the actor is still there.
    if (this.antennaState === EAntennaState.INSIDE) {
      this.onZoneLeave();
    }

    this.antennaState = EAntennaState.VOID;

    this.switchState(registry.actor);
  }

  public override deactivate(): void {
    logger.info("Deactivate antenna controller");

    if (this.antennaState === EAntennaState.INSIDE) {
      this.onZoneLeave();
    }
  }

  public update(): void {
    if (trySwitchToAnotherSection(this.object, this.state)) {
      return;
    }

    this.switchState(registry.actor);
  }

  /**
   * Toggle the zone enter or leave handlers based on whether the actor is currently inside the zone.
   *
   * @param actor - Actor object whose position is checked against the zone.
   */
  public switchState(actor: GameObject): void {
    if (this.antennaState !== EAntennaState.INSIDE) {
      if (this.object.inside(actor.position())) {
        return this.onZoneEnter();
      }
    } else {
      if (!this.object.inside(actor.position())) {
        return this.onZoneLeave();
      }
    }
  }

  /**
   * Add the psy effects of the zone on actor enter.
   */
  public onZoneEnter(): void {
    logger.info("Enter psy antenna zone");

    this.antennaState = EAntennaState.INSIDE;
    this.antennaManager.addZoneEffects(this.state);
  }

  /**
   * Take the psy effects of the zone away on actor leave.
   */
  public onZoneLeave(): void {
    logger.info("Leave psy antenna zone");

    this.antennaState = EAntennaState.OUTSIDE;
    this.antennaManager.removeZoneEffects(this.state);
  }

  public save(): void {
    setPortableStoreValue(this.object.id(), "inside", this.antennaState);
  }
}
