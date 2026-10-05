import { level } from "xray16";
import { AnyObject, LuaArray, Nillable, requireFresh, TLabel, TName } from "xray16/lib";
import { $isNil, $isNotNil } from "xray16/macros";

import { IDebugField, IDebugFlow, IDebugFlowResult, IDebugQuestEntry } from "@/engine/core/managers/debug/debug_types";
import { addDebugField } from "@/engine/core/managers/debug/utils/debug_inspect";

/**
 * Lua module the checks build lists the flows it built in.
 */
const MANIFEST_MODULE: TName = "checks.manifest";

/**
 * Lua module the checks framework exposes its entry points through.
 */
const FRAMEWORK_MODULE: TName = "checks.framework.index";

/**
 * Read the flows the checks build put into gamedata. Flows are built only on request, so most builds have none.
 *
 * @returns Built flows, `null` when flows are not built.
 */
export function readDebugFlows(): Nillable<LuaArray<IDebugFlow>> {
  const [isLoaded, manifest] = pcall(require, MANIFEST_MODULE);

  return isLoaded ? (manifest as LuaArray<IDebugFlow>) : null;
}

/**
 * List the flows that can run on the loaded level: those requiring it, and those that travel wherever they need.
 *
 * @param flows - Built flows.
 * @returns Flows that can run here, by identity.
 */
export function buildDebugFlowEntries(flows: LuaArray<IDebugFlow>): LuaArray<IDebugQuestEntry> {
  const entries: LuaArray<IDebugQuestEntry> = new LuaTable();
  const levelName: TName = level.name();

  for (const index of $range(1, flows.length())) {
    const flow: IDebugFlow = flows.get(index);

    if ($isNil(flow.level) || flow.level === levelName) {
      entries.set(entries.length() + 1, { key: flow.identity, label: flow.identity, search: flow.identity });
    }
  }

  return entries;
}

/**
 * Run a flow once, as its console launcher does, keeping its walk in the save.
 *
 * @param flow - Flow to run.
 * @param isTravelAllowed - Whether its steps may move the actor.
 * @param isNotifying - Whether the run tells the player in game tips; the overlay, showing it itself, runs quietly.
 * @returns What the run answered.
 */
export function runDebugFlow(
  flow: IDebugFlow,
  isTravelAllowed: boolean,
  isNotifying: boolean = true
): IDebugFlowResult {
  // A flow registers its steps while it is required, so it is required afresh for each run.
  requireFresh(flow.module);

  return (require(FRAMEWORK_MODULE) as AnyObject).run(flow.identity, isTravelAllowed, isNotifying) as IDebugFlowResult;
}

/**
 * Describe a flow run: its outcome, each step's state, and what to do about the step it waits on.
 *
 * @param result - What the run answered.
 * @returns Labelled values for the quests tab.
 */
export function inspectDebugFlowResult(result: IDebugFlowResult): LuaArray<IDebugField> {
  const fields: LuaArray<IDebugField> = new LuaTable();

  addDebugField(fields, "outcome", result.outcome);

  if ($isNotNil(result.skipReason)) {
    addDebugField(fields, "skipped", result.skipReason);
  }

  for (const index of $range(1, result.stepNames.length())) {
    let state: TLabel = index <= result.position ? "reached" : "ahead";

    if (result.waiting?.position === index) {
      state = "waiting";
    }

    addDebugField(fields, state, result.stepNames.get(index));
  }

  addDebugField(fields, "to reach it", result.waiting?.handOff);

  for (const index of $range(1, result.failures.length())) {
    addDebugField(fields, "failure", `${result.failures.get(index).assertion}: ${result.failures.get(index).detail}`);
  }

  return fields;
}
