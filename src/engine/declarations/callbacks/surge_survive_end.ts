import { extern } from "xray16/lib";

import { getManager } from "@/engine/core/database";
import { SurgeManager } from "@/engine/core/managers/surge";

/** On surviving surge stop sleeping. */
extern("engine.surge_survive_end", (): void => getManager(SurgeManager).onSurgeSurviveEnd());
