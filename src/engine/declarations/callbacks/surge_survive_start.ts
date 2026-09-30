import { extern } from "xray16/lib";

import { getManager } from "@/engine/core/database";
import { SurgeManager } from "@/engine/core/managers/surge";

/** On surviving surge start sleeping. */
extern("engine.surge_survive_start", (): void => getManager(SurgeManager).onSurgeSurviveStart());
