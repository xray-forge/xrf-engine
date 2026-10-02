import { extern } from "xray16/lib";

import { getManager } from "@/engine/core/database";
import { GameOutroManager } from "@/engine/core/managers/outro";

/**
 * Show game credits tutorial scene.
 */
extern("xr_effects.game_credits", (): void => getManager(GameOutroManager).startCredits());
