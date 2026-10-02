import { AlifeSimulator } from "xray16/alias";
import { TLabel } from "xray16/lib";

import { registry } from "@/engine/core/database";
import { forgeConfig } from "@/engine/core/database/forge_config";
import { SquadStayOnTargetAction } from "@/engine/core/objects/squad/action";
import { Squad } from "@/engine/core/objects/squad/Squad";
import { ESquadActionType } from "@/engine/core/objects/squad/squad_types";
import { getSquadCommunity } from "@/engine/core/utils/community";

/**
 * Get map display hint for debugging and display in game UI map.
 *
 * @param squad - Target squad to get hint for.
 * @returns Hint to show when hovering over in PDA map.
 */
export function getSquadMapDisplayHint(squad: Squad): TLabel {
  if (forgeConfig.DEBUG.IS_SIMULATION_ENABLED) {
    const simulator: AlifeSimulator = registry.simulator;

    let hint: TLabel = string.format(
      "[%s]\\navailable = %s\\nonline = %s\\nfaction = %s\\ncommunity = %s\\nspawn_id = %s\\nspawn_section = %s\\n",
      squad.name(),
      squad.isSimulationAvailable(),
      squad.online,
      squad.faction,
      getSquadCommunity(squad),
      squad.respawnPointId,
      squad.respawnPointSection
    );

    hint += string.format(
      "[smart_terrain]\\nassigned = %s\\n",
      squad.assignedTerrainId && simulator.object(squad.assignedTerrainId)?.name()
    );

    hint += string.format(
      "[target]\\ncurrent = %s\\nassigned = %s\\nlast = %s\\nnext = %s\\n",
      squad.currentTargetId && simulator.object(squad.currentTargetId)?.name(),
      squad.assignedTargetId && simulator.object(squad.assignedTargetId)?.name(),
      squad.lastTarget,
      squad.nextTargetIndex
    );

    hint += string.format("[action]\\ncurrent = %s\\n", squad.currentAction?.type);

    if (squad.currentAction?.type === ESquadActionType.STAY_ON_TARGET) {
      hint += string.format(
        "stay_on_target_for = %s\\n",
        (squad.currentAction as SquadStayOnTargetAction).getStayIdleDuration()
      );
    }

    return hint;
  } else {
    return "";
  }
}
