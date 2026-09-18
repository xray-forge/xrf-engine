import { CUIGameCustom, get_hud, time_global } from "xray16";
import { globalTimeToString, Nillable, TSection, TTimestamp } from "xray16/lib";
import { $filename, $isNotNil } from "xray16/macros";

import { registry } from "@/engine/core/database";
import { pickSectionFromCondList } from "@/engine/core/ini";
import { AbstractSchemeController } from "@/engine/core/schemes/base";
import { ETimerType, ISchemeTimerState } from "@/engine/core/schemes/restrictor/sr_timer/sr_timer_types";
import { switchObjectSchemeToSection, trySwitchToAnotherSection } from "@/engine/core/schemes/runtime/scheme_switch";
import { LuaLogger } from "@/engine/core/utils/logging";

const logger: LuaLogger = new LuaLogger($filename);

/**
 * Timer controller to increment/decrement time according to scheme logic and show UI timer.
 */
export class TimerController extends AbstractSchemeController<ISchemeTimerState> {
  public override activate(): void {
    logger.info("Reset timer: %s", this.object.name());

    const hud: CUIGameCustom = get_hud();

    hud.AddCustomStatic(this.state.timerId, true);

    this.state.timer = hud.GetCustomStatic(this.state.timerId)!.wnd();

    if (this.state.string) {
      hud.AddCustomStatic("hud_timer_text", true);
      hud.GetCustomStatic("hud_timer_text")!.wnd().TextControl().SetTextST(this.state.string);
    }
  }

  public override deactivate(): void {
    logger.info("Deactivate timer: %s", this.object.name());

    const hud: CUIGameCustom = get_hud();

    hud.RemoveCustomStatic(this.state.timerId);

    if ($isNotNil(this.state.string)) {
      hud.RemoveCustomStatic("hud_timer_text");
    }
  }

  public update(): void {
    if (trySwitchToAnotherSection(this.object, this.state)) {
      return;
    }

    const sinceActivation: TTimestamp = time_global() - registry.objects.get(this.object.id()).activationTime;

    let valueTime: TTimestamp =
      this.state.type === ETimerType.INCREMENT
        ? this.state.startValue + sinceActivation
        : this.state.startValue - sinceActivation;

    if (valueTime <= 0) {
      valueTime = 0;
    }

    this.state.timer.TextControl().SetTextST(globalTimeToString(valueTime));

    for (const index of $range(1, this.state.onValue.length())) {
      const threshold = this.state.onValue.get(index);
      const expectedValue: TTimestamp = threshold.value;

      if (
        (this.state.type === ETimerType.DECREMENT && valueTime <= expectedValue) ||
        (this.state.type === ETimerType.INCREMENT && valueTime >= expectedValue)
      ) {
        const nextSection: Nillable<TSection> = pickSectionFromCondList(
          registry.actor,
          this.object,
          threshold.condlist
        );

        logger.info("Switch to another section: %s %s", this.object.name(), nextSection);

        if (switchObjectSchemeToSection(this.object, this.state.ini!, nextSection)) {
          return;
        }
      }
    }
  }
}
