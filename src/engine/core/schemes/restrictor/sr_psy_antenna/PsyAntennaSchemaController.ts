import { get_hud, level } from "xray16";
import { GameObject } from "xray16/alias";
import { NIL } from "xray16/lib";
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

    if (this.antennaState === EAntennaState.INSIDE) {
      this.onZoneLeave(loading);
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
   * Apply the psy antenna effects to the shared antenna controller and register post-process effectors on zone enter.
   */
  public onZoneEnter(): void {
    logger.info("Enter psy antenna zone");

    this.antennaState = EAntennaState.INSIDE;

    get_hud().enable_fake_indicators(true);

    this.antennaManager.soundIntensityBase = this.antennaManager.soundIntensityBase + this.state.intensity;
    this.antennaManager.muteSoundThreshold = this.antennaManager.muteSoundThreshold + this.state.muteSoundThreshold;
    this.antennaManager.hitIntensity = this.antennaManager.hitIntensity + this.state.hitIntensity;
    this.antennaManager.phantomSpawnProbability = this.antennaManager.phantomSpawnProbability + this.state.phantomProb;

    this.antennaManager.noStatic = this.state.noStatic;
    this.antennaManager.noMumble = this.state.noMumble;
    this.antennaManager.hitType = this.state.hitType;
    this.antennaManager.hitFreq = this.state.hitFreq;

    if (this.state.postprocess === NIL) {
      return;
    }

    if (!this.antennaManager.postprocess.has(this.state.postprocess)) {
      this.antennaManager.postprocessCount += 1;
      this.antennaManager.postprocessNextId += 1;
      this.antennaManager.postprocess.set(this.state.postprocess, {
        intensityBase: 0,
        intensity: 0,
        idx: this.antennaManager.postprocessNextId,
      });

      level.add_pp_effector(
        this.state.postprocess,
        this.antennaManager.postprocess.get(this.state.postprocess).idx,
        true
      );
      level.set_pp_effector_factor(this.antennaManager.postprocess.get(this.state.postprocess).idx, 0.01);
    }

    this.antennaManager.postprocess.get(this.state.postprocess).intensityBase =
      this.antennaManager.postprocess.get(this.state.postprocess).intensityBase + this.state.intensity;
  }

  /**
   * Roll back the psy antenna effects applied to the shared antenna controller on zone leave.
   *
   * @param loading - Whether undoing a saved zone contribution before checking the restored actor position.
   */
  public onZoneLeave(loading: boolean = false): void {
    logger.info("Leave psy antenna zone");

    this.antennaState = EAntennaState.OUTSIDE;

    get_hud().enable_fake_indicators(false);

    this.antennaManager.soundIntensityBase -= this.state.intensity;
    this.antennaManager.muteSoundThreshold -= this.state.muteSoundThreshold;
    this.antennaManager.hitIntensity -= this.state.hitIntensity;

    // Phantom probability is not serialized; active zones rebuild it after loading.
    if (!loading) {
      this.antennaManager.phantomSpawnProbability -= this.state.phantomProb;
    }

    if (this.state.postprocess === NIL) {
      return;
    }

    if (this.antennaManager.postprocess.has(this.state.postprocess)) {
      this.antennaManager.postprocess.get(this.state.postprocess).intensityBase -= this.state.intensity;
    }
  }

  public save(): void {
    setPortableStoreValue(this.object.id(), "inside", this.antennaState);
  }
}
