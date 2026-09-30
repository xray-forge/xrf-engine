import { GameObject, PhraseDialog } from "xray16/alias";
import { extern, TLabel, TStringId } from "xray16/lib";

import { getManager } from "@/engine/core/database";
import { TravelManager } from "@/engine/core/managers/travel";

/** Zone traveling callbacks. */
extern("travel_callbacks", {
  initialize_traveller_dialog: (dialog: PhraseDialog): void =>
    getManager(TravelManager).initializeTravellerDialog(dialog),
  can_start_traveling_dialogs: (actor: GameObject, object: GameObject): boolean =>
    getManager(TravelManager).canStartTravelingDialogs(actor, object),
  get_squad_current_action_description: (actor: GameObject, object: GameObject): TLabel =>
    getManager(TravelManager).getSquadCurrentActionDescription(actor, object),
  can_actor_move_with_squad: (actor: GameObject, object: GameObject): boolean =>
    getManager(TravelManager).canActorMoveWithSquad(actor, object),
  can_squad_take_actor: (object: GameObject, actor: GameObject): boolean =>
    getManager(TravelManager).canSquadTakeActor(object, actor),
  cannot_squad_take_actor: (object: GameObject, actor: GameObject, dialogId: TStringId, phraseId: TStringId): boolean =>
    !getManager(TravelManager).canSquadTakeActor(object, actor, dialogId, phraseId),
  on_travel_together_with_squad: (
    actor: GameObject,
    object: GameObject,
    dialogId: TStringId,
    phraseId: TStringId
  ): void => getManager(TravelManager).onTravelTogetherWithSquad(actor, object, dialogId, phraseId),
  on_travel_to_specific_smart_with_squad: (
    actor: GameObject,
    object: GameObject,
    dialogId: TStringId,
    phraseId: TStringId
  ): void => getManager(TravelManager).onTravelToSpecificSmartWithSquad(actor, object, dialogId, phraseId),
  can_squad_travel: (object: GameObject, actor: GameObject, dialogId: TStringId, phraseId: TStringId): boolean =>
    getManager(TravelManager).canSquadTravel(object, actor, dialogId, phraseId),
  cannot_squad_travel: (object: GameObject, actor: GameObject, dialogId: TStringId, phraseId: TStringId): boolean =>
    !getManager(TravelManager).canSquadTravel(object, actor, dialogId, phraseId),
  can_negotiate_travel_to_smart: (
    actor: GameObject,
    object: GameObject,
    dialogId: TStringId,
    prevPhraseId: TStringId,
    phraseId: TStringId
  ): boolean => getManager(TravelManager).canNegotiateTravelToSmart(actor, object, dialogId, prevPhraseId, phraseId),
  get_travel_cost: (actor: GameObject, object: GameObject, dialogId: TStringId, phraseId: TStringId): TLabel =>
    getManager(TravelManager).getTravelCostLabel(actor, object, dialogId, phraseId),
  is_enough_money_to_travel: (
    actor: GameObject,
    object: GameObject,
    dialogId: TStringId,
    phraseId: TStringId
  ): boolean => getManager(TravelManager).isEnoughMoneyToTravel(actor, object, dialogId, phraseId),
  is_not_enough_money_to_travel: (
    actor: GameObject,
    object: GameObject,
    dialogId: TStringId,
    phraseId: TStringId
  ): boolean => !getManager(TravelManager).isEnoughMoneyToTravel(actor, object, dialogId, phraseId),
});
