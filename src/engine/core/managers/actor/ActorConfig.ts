import { EActorMenuMode } from "xray16/alias";

export const actorConfig = {
  ACTOR_MENU_MODE: EActorMenuMode.UNDEFINED as EActorMenuMode,
  // Input configuration:
  IS_WEAPON_HIDDEN: false,
  IS_WEAPON_HIDDEN_IN_DIALOG: false,
  // Whether a UI lock turned the actor night vision or torch off, to turn it back on once released.
  IS_NIGHT_VISION_TURNED_OFF: false,
  IS_TORCH_TURNED_OFF: false,
};
