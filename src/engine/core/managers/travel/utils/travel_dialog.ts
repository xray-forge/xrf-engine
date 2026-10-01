import { game } from "xray16";
import { GameObject, Phrase, PhraseDialog, PhraseScript } from "xray16/alias";
import { abort, ACTOR_ID, Nillable, TLabel, TName, TNumberId, TStringId } from "xray16/lib";
import { $isNil } from "xray16/macros";

import { communities, TCommunity } from "@/engine/constants/communities";
import { registry } from "@/engine/core/database";
import { TSimulationObject } from "@/engine/core/managers/simulation/types";
import { travelConfig } from "@/engine/core/managers/travel/TravelConfig";
import { getTravelPriceByPhrase } from "@/engine/core/managers/travel/utils/travel_price";
import type { Squad } from "@/engine/core/objects/squad/Squad";
import { ESquadActionType } from "@/engine/core/objects/squad/squad_types";
import { isSmartTerrain, isSquad } from "@/engine/core/utils/class_ids";
import { getSquadCommunity } from "@/engine/core/utils/community";
import { getObjectSquad } from "@/engine/core/utils/squad";

/**
 * Create fast traveling phrases for provided dialog.
 * Phrases are created once for every traveler, so the answers use the stalker texts, the only ones written.
 *
 * @param dialog - Target dialog to modify.
 */
export function initializeTravellerDialog(dialog: PhraseDialog): void {
  let actorPhrase: Phrase;
  let actorScript: PhraseScript;

  dialog.AddPhrase("dm_traveler_what_are_you_doing", "0", "", -10000);

  let npcPhrase: Phrase = dialog.AddPhrase("if you see this - this is bad", "1", "0", -10000);
  let npcPhraseScript: PhraseScript = npcPhrase.GetPhraseScript();

  npcPhraseScript.SetScriptText("travel_callbacks.get_squad_current_action_description");

  actorPhrase = dialog.AddPhrase("dm_traveler_can_i_go_with_you", "11", "1", -10000);
  actorScript = actorPhrase.GetPhraseScript();
  actorScript.AddPrecondition("travel_callbacks.can_actor_move_with_squad");

  npcPhrase = dialog.AddPhrase("dm_traveler_stalker_actor_companion_yes", "111", "11", -10000);
  npcPhraseScript = npcPhrase.GetPhraseScript();
  npcPhraseScript.AddPrecondition("travel_callbacks.can_squad_take_actor");

  actorPhrase = dialog.AddPhrase("dm_traveler_actor_go_with_squad", "1111", "111", -10000);
  actorScript = actorPhrase.GetPhraseScript();
  actorScript.AddAction("travel_callbacks.on_travel_together_with_squad");

  dialog.AddPhrase("dm_traveler_actor_dont_go_with_squad", "1112", "111", -10000);

  npcPhrase = dialog.AddPhrase("dm_traveler_stalker_actor_companion_no", "112", "11", -10000);
  npcPhraseScript = npcPhrase.GetPhraseScript();
  npcPhraseScript.AddPrecondition("travel_callbacks.cannot_squad_take_actor");

  actorPhrase = dialog.AddPhrase("dm_traveler_take_me_to", "12", "1", -10000);

  npcPhrase = dialog.AddPhrase("dm_traveler_stalker_where_do_you_want", "121", "12", -10000);
  npcPhraseScript = npcPhrase.GetPhraseScript();
  npcPhraseScript.AddPrecondition("travel_callbacks.can_squad_travel");

  for (const [, descriptor] of travelConfig.TRAVEL_DESCRIPTORS_BY_NAME) {
    actorPhrase = dialog.AddPhrase(game.translate_string(descriptor.name) + ".", descriptor.phraseId, "121", -10000);
    actorScript = actorPhrase.GetPhraseScript();
    actorScript.AddPrecondition("travel_callbacks.can_negotiate_travel_to_smart");

    npcPhrase = dialog.AddPhrase(
      "if you see this - this is bad",
      descriptor.phraseId + "_1",
      descriptor.phraseId,
      -10000
    );
    npcPhraseScript = npcPhrase.GetPhraseScript();
    npcPhraseScript.SetScriptText("travel_callbacks.get_travel_cost");

    actorPhrase = dialog.AddPhrase(
      "dm_traveler_actor_agree",
      descriptor.phraseId + "_11",
      descriptor.phraseId + "_1",
      -10000
    );
    actorScript = actorPhrase.GetPhraseScript();
    actorScript.AddAction("travel_callbacks.on_travel_to_specific_smart_with_squad");
    actorScript.AddPrecondition("travel_callbacks.is_enough_money_to_travel");

    actorPhrase = dialog.AddPhrase(
      "dm_traveler_actor_has_no_money",
      descriptor.phraseId + "_13",
      descriptor.phraseId + "_1",
      -10000
    );
    actorScript = actorPhrase.GetPhraseScript();
    actorScript.AddPrecondition("travel_callbacks.is_not_enough_money_to_travel");

    actorPhrase = dialog.AddPhrase(
      "dm_traveler_actor_refuse",
      descriptor.phraseId + "_14",
      descriptor.phraseId + "_1",
      -10000
    );
  }

  dialog.AddPhrase("dm_traveler_actor_refuse", "1211", "121", -10000);

  npcPhrase = dialog.AddPhrase("dm_traveler_stalker_i_cant_travel", "122", "12", -10000);
  npcPhraseScript = npcPhrase.GetPhraseScript();
  npcPhraseScript.AddPrecondition("travel_callbacks.cannot_squad_travel");

  dialog.AddPhrase("dm_traveler_bye", "13", "1", -10000);
}

/**
 * Get a description of what the squad of the object is currently doing.
 *
 * @param object - Squad member game object being talked to.
 * @returns Label describing the squad current action.
 */
export function getSquadActionDescription(object: GameObject): TLabel {
  const squad: Squad = getObjectSquad(object)!;
  const squadTargetId: Nillable<TNumberId> = squad.assignedTargetId;

  if (!squad.currentAction || squad.currentAction.type === ESquadActionType.STAY_ON_TARGET) {
    return getTravelerActionLabel(object, string.format("doing_nothing_%s", math.random(1, 3)));
  }

  const target: Nillable<TSimulationObject> = registry.simulator.object(squadTargetId!);

  if ($isNil(target)) {
    abort("Simulation target not existing '%s', action_name '%s'.", squadTargetId, squad.currentAction.type);
  }

  if (isSmartTerrain(target)) {
    const terrainDescription: Nillable<TLabel> = travelConfig.TRAVEL_LOCATIONS.get(target.name());

    if ($isNil(terrainDescription)) {
      abort("Wrong smart name '%s' in travel_manager.ltx", target.name());
    }

    return terrainDescription;
  }

  if (isSquad<Squad>(target)) {
    return getTravelerActionLabel(
      object,
      string.format("chasing_squad_%s", getTextCommunity(getSquadCommunity(target)))
    );
  }

  if (target.id === ACTOR_ID) {
    abort("Actor talking with squad, which chasing actor.");
  }

  abort("Wrong target clsid [%s] supplied for travel manager.", tostring(target.clsid()));
}

/**
 * Build a label describing the travel cost for the phrase destination.
 *
 * @param object - Squad member game object being talked to.
 * @param phraseId - Identifier of the phrase mapped to a destination smart terrain.
 * @returns Localized label describing the travel cost.
 */
export function getTravelCostLabel(object: GameObject, phraseId: TStringId): TLabel {
  return string.format(
    "%s %s.",
    game.translate_string("dm_traveler_travel_cost"),
    getTravelPriceByPhrase(object, phraseId)
  );
}

/**
 * @param community - Community of the object or squad a text names.
 * @returns Name of the community in traveler texts.
 */
function getTextCommunity(community: TCommunity): TName {
  return travelConfig.TEXT_COMMUNITIES.get(community) ?? community;
}

/**
 * @param object - Traveler game object that says the text.
 * @param action - Text of the action without its community, like `doing_nothing_1`.
 * @returns Text of the traveler community when it is written, the stalker one otherwise.
 */
function getTravelerActionLabel(object: GameObject, action: TName): TLabel {
  const label: TLabel = string.format("dm_%s_%s", getTextCommunity(object.character_community()), action);

  return game.translate_string(label) === label ? string.format("dm_%s_%s", communities.stalker, action) : label;
}
