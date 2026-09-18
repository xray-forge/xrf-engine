import { GameObject, IniFile } from "xray16/alias";
import { assert, LuaArray, Nillable, TSection, TTimestamp } from "xray16/lib";
import { $filename, $isNotNil } from "xray16/macros";

import {
  getConfigSwitchConditions,
  parseConditionsList,
  parseParameters,
  readIniNumber,
  readIniString,
} from "@/engine/core/ini";
import { AbstractScheme } from "@/engine/core/schemes/base/AbstractScheme";
import { ETimerType, ISchemeTimerState } from "@/engine/core/schemes/restrictor/sr_timer/sr_timer_types";
import { TimerController } from "@/engine/core/schemes/restrictor/sr_timer/TimerController";
import { EScheme, ESchemeType } from "@/engine/core/schemes/types";
import { LuaLogger } from "@/engine/core/utils/logging";

const logger: LuaLogger = new LuaLogger($filename);

/**
 * Scheme implementing timer logics with custom UI element telling about limits.
 */
export class SchemeTimer extends AbstractScheme {
  public static override readonly SCHEME_SECTION: EScheme = EScheme.SR_TIMER;
  public static override readonly SCHEME_TYPE: ESchemeType = ESchemeType.RESTRICTOR;

  public static override activate(
    object: GameObject,
    ini: IniFile,
    scheme: EScheme,
    section: TSection
  ): ISchemeTimerState {
    logger.info("Activate scheme: %s", object.name());

    const state: ISchemeTimerState = AbstractScheme.assign(object, ini, scheme, section);

    state.logic = getConfigSwitchConditions(ini, section);
    state.type = readIniString<ETimerType>(ini, section, "type", false, null, ETimerType.INCREMENT) as ETimerType;

    assert(
      state.type === ETimerType.INCREMENT || state.type === ETimerType.DECREMENT,
      "ERROR: wrong sr_timer type. Section [%s], Restrictor [%s]",
      section,
      object.name()
    );

    if (state.type === ETimerType.DECREMENT) {
      state.startValue = readIniNumber(ini, section, "start_value", true);
    } else {
      state.startValue = readIniNumber(ini, section, "start_value", false, 0);
    }

    state.onValue = new LuaTable();

    const onValue: string = readIniString(ini, section, "on_value", false, null, "").trim();

    if (onValue !== "") {
      const parameters: LuaArray<string> = parseParameters(onValue);

      assert(parameters.length() % 2 === 0, "Invalid on_value threshold list in section '%s'.", section);

      for (let index = 1; index <= parameters.length(); index += 2) {
        const value: Nillable<TTimestamp> = tonumber(parameters.get(index));
        const condlist: string = parameters.get(index + 1).trim();

        assert($isNotNil(value), "Invalid on_value threshold '%s' in section '%s'.", parameters.get(index), section);
        assert(condlist !== "", "Invalid on_value condition list in section '%s'.", section);

        table.insert(state.onValue, { value, condlist: parseConditionsList(condlist) });
      }
    }

    state.timerId = readIniString(ini, section, "timer_id", false, null, "hud_timer");
    state.string = readIniString(ini, section, "string", false);

    return state;
  }

  public static override add(
    object: GameObject,
    ini: IniFile,
    scheme: EScheme,
    section: TSection,
    state: ISchemeTimerState
  ): void {
    AbstractScheme.subscribe(state, new TimerController(object, state));
  }
}
