import { GameObject } from "xray16/alias";
import { extern } from "xray16/lib";

import { registry } from "@/engine/core/database";
import { isObjectInjured, restoreObjectCondition } from "@/engine/core/utils/object";

extern("dialogs.medic_magic_potion", (_firstSpeaker: GameObject, _secondSpeaker: GameObject): void => {
  restoreObjectCondition(registry.actor);
});

extern("dialogs.actor_needs_bless", (_firstSpeaker: GameObject, _secondSpeaker: GameObject): boolean => {
  return isObjectInjured(registry.actor);
});

extern("dialogs.actor_is_damn_healthy", (_firstSpeaker: GameObject, _secondSpeaker: GameObject): boolean => {
  return !isObjectInjured(registry.actor);
});
