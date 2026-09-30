import { extern } from "xray16/lib";

import { getManager } from "@/engine/core/database";
import { SleepManager } from "@/engine/core/managers/sleep";

/** On anabiotic used and stop sleeping. */
extern("engine.on_anabiotic_wake_up", (): void => getManager(SleepManager).onAnabioticWakeUp());
