import { time_global } from "xray16";
import { Vector } from "xray16/alias";
import { $isNotNil } from "xray16/macros";

import { AbstractSchemeController } from "@/engine/core/schemes/base";
import { ISchemePhysicalForceState } from "@/engine/core/schemes/physical/ph_force/ph_force_types";
import { trySwitchToAnotherSection } from "@/engine/core/schemes/runtime/scheme_switch";

/**
 * Controller handling physical force scheme behaviour for an object.
 */
export class PhysicalForceController extends AbstractSchemeController<ISchemePhysicalForceState> {
  public time: number = 0;
  public process: boolean = false;

  public override activate(): void {
    this.time = time_global() + this.state.delay;
    this.process = false;
  }

  public update(): void {
    if (trySwitchToAnotherSection(this.object, this.state)) {
      return;
    }

    if (this.process) {
      return;
    }

    if ($isNotNil(this.state.delay)) {
      if (time_global() - this.time < 0) {
        return;
      }
    }

    const direction: Vector = this.state.point.sub(this.object.position());

    direction.normalize();
    this.object.set_const_force(direction, this.state.force, this.state.time);
    this.process = true;
  }
}
