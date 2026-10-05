import { abort, TName } from "xray16/lib";

import { ICheckResult, reportBanner } from "@/engine/checks/framework/core";
import { drainRegistration, IRegistration } from "@/engine/checks/framework/dsl";
import { runFlow } from "@/engine/checks/framework/flow";

/**
 * Run whatever the just required source file registered.
 *
 * @param name - Name the launcher reports, e.g. `quests_zat_b14`.
 * @param isTravelAllowed - Whether steps may move the actor; a caller polling a walk it already moved passes false.
 * @returns Result of the run.
 */
export function run(name: TName, isTravelAllowed: boolean = true): ICheckResult {
  const registration: IRegistration = drainRegistration();

  if (registration.steps.length() === 0) {
    abort("checks: '%s' registered no steps. A flow declares them with step() at module scope.", name);
  }

  reportBanner(name);

  return runFlow(name, registration, isTravelAllowed);
}
