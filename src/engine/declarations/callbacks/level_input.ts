import { extern, TNumberId } from "xray16/lib";

import { getManager } from "@/engine/core/database";
import { ActorInputManager } from "@/engine/core/managers/actor";
import { DebugManager } from "@/engine/core/managers/debug";

/** Player input callbacks. */
extern("level_input", {
  on_key_press: (key: TNumberId, bind: TNumberId): boolean =>
    getManager(DebugManager).onKeyPress(bind) || getManager(ActorInputManager).onKeyPress(key, bind),
});
