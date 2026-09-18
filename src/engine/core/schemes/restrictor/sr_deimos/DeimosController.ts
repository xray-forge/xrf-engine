import { time_global } from "xray16";
import { clamp, TIndex, TRate, TTimestamp } from "xray16/lib";
import { $isNil } from "xray16/macros";

import { getManager } from "@/engine/core/database";
import { DeimosManager } from "@/engine/core/managers/deimos";
import { AbstractSchemeController } from "@/engine/core/schemes/base";
import { ISchemeDeimosState } from "@/engine/core/schemes/restrictor/sr_deimos/sr_deimos_types";
import { trySwitchToAnotherSection } from "@/engine/core/schemes/runtime/scheme_switch";

/**
 * Per-restrictor controller for the Deimos intensity state machine and scheme switching.
 */
export class DeimosController extends AbstractSchemeController<ISchemeDeimosState> {
  public phase: TIndex = 0;
  public effectorActivatedAt: TTimestamp = 0;

  public update(): void {
    const deimosManager: DeimosManager = getManager(DeimosManager);

    if (!deimosManager.canUpdate()) {
      return;
    }

    const currentSpeed = deimosManager.getActorMovementSpeed();
    const restoredIntensity = deimosManager.consumeRestoredIntensity();

    if ($isNil(currentSpeed)) {
      return;
    }

    if (!$isNil(restoredIntensity)) {
      this.state.intensity = restoredIntensity;

      if (this.state.intensity > this.state.disableBound) {
        deimosManager.startPrimaryEffects(this.state.ppEffector, this.state.noiseSound);
        this.phase = 1;
      }

      if (this.state.intensity > this.state.switchLowerBound) {
        deimosManager.startHeartbeat(this.state.heartbeatSound);
        this.phase = 2;
      }
    }

    let intensityDelta: TRate = (this.state.movementSpeed - currentSpeed) * 0.005;

    intensityDelta *= intensityDelta > 0 ? this.state.growingRate : this.state.loweringRate;

    this.state.intensity = clamp(this.state.intensity + intensityDelta, 0, 1);

    if (this.phase > 0) {
      deimosManager.updateEffectStrengths(
        this.phase,
        this.state.intensity,
        this.state.noiseSound,
        this.state.heartbeatSound
      );
    }

    if (intensityDelta > 0) {
      if (this.state.intensity > this.state.switchUpperBound) {
        const now: TTimestamp = time_global();

        if (now - this.effectorActivatedAt > this.state.camEffectorRepeatingTime) {
          this.effectorActivatedAt = now;
          deimosManager.triggerHighIntensityEffects(
            this.state.camEffector,
            this.state.ppEffector2,
            this.state.healthLost
          );
        }
      } else if (this.state.intensity > this.state.switchLowerBound) {
        if (this.phase < 2) {
          deimosManager.startHeartbeat(this.state.heartbeatSound);
          this.phase = 2;
          deimosManager.updateEffectStrengths(
            this.phase,
            this.state.intensity,
            this.state.noiseSound,
            this.state.heartbeatSound
          );
        }
      } else if (this.state.intensity > this.state.disableBound) {
        if (this.phase < 1) {
          deimosManager.startPrimaryEffects(this.state.ppEffector, this.state.noiseSound);
          this.phase = 1;
          deimosManager.updateEffectStrengths(
            this.phase,
            this.state.intensity,
            this.state.noiseSound,
            this.state.heartbeatSound
          );
        }
      }
    } else {
      // One update can cross multiple thresholds; unwind each effect before lowering its phase.
      if (this.state.intensity < this.state.switchUpperBound) {
        deimosManager.removeSecondaryEffects();
      }

      if (this.state.intensity < this.state.switchLowerBound) {
        if (this.phase > 1) {
          deimosManager.stopHeartbeat(this.state.heartbeatSound);
          this.phase = 1;
        }
      }

      if (this.state.intensity < this.state.disableBound) {
        if (this.phase > 0) {
          deimosManager.stopPrimaryEffects(this.state.noiseSound);
          this.phase = 0;
        }
      }
    }

    if (trySwitchToAnotherSection(this.object, this.state)) {
      this.reset();
    }
  }

  /**
   * Reset effectors and sounds related to Deimos.
   */
  public reset(): void {
    if (this.phase > 0) {
      const deimosManager: DeimosManager = getManager(DeimosManager);

      deimosManager.stopPrimaryEffects(this.state.noiseSound);

      if (this.phase > 1) {
        deimosManager.stopHeartbeat(this.state.heartbeatSound);
        deimosManager.removeSecondaryEffects();
      }
    }

    this.phase = 0;
    this.effectorActivatedAt = 0;
  }
}
