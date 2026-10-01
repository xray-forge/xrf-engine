import { GameObject, PhraseDialog } from "xray16/alias";
import { extern, TLabel, TStringId } from "xray16/lib";

import { getManager } from "@/engine/core/database";
import { TravelManager } from "@/engine/core/managers/travel";
import {
  canActorMoveWithSquad,
  canNegotiateTravelToSmart,
  canSquadTakeActor,
  canSquadTravel,
  canStartTravelingDialogs,
  getSquadActionDescription,
  getTravelCostLabel,
  initializeTravellerDialog,
  isEnoughMoneyToTravel,
} from "@/engine/core/managers/travel/utils";

/** Zone traveling callbacks. */
extern("travel_callbacks", {
  initialize_traveller_dialog: (dialog: PhraseDialog): void => initializeTravellerDialog(dialog),
  can_start_traveling_dialogs: (actor: GameObject, object: GameObject): boolean => canStartTravelingDialogs(object),
  get_squad_current_action_description: (actor: GameObject, object: GameObject): TLabel =>
    getSquadActionDescription(object),
  can_actor_move_with_squad: (actor: GameObject, object: GameObject): boolean => canActorMoveWithSquad(object),
  can_squad_take_actor: (object: GameObject, actor: GameObject): boolean => canSquadTakeActor(object),
  cannot_squad_take_actor: (object: GameObject, actor: GameObject, dialogId: TStringId, phraseId: TStringId): boolean =>
    !canSquadTakeActor(object),
  on_travel_together_with_squad: (
    actor: GameObject,
    object: GameObject,
    dialogId: TStringId,
    phraseId: TStringId
  ): void => getManager(TravelManager).onTravelTogetherWithSquad(object),
  on_travel_to_specific_smart_with_squad: (
    actor: GameObject,
    object: GameObject,
    dialogId: TStringId,
    phraseId: TStringId
  ): void => getManager(TravelManager).onTravelToSpecificSmartWithSquad(object, phraseId),
  can_squad_travel: (object: GameObject, actor: GameObject, dialogId: TStringId, phraseId: TStringId): boolean =>
    canSquadTravel(object),
  cannot_squad_travel: (object: GameObject, actor: GameObject, dialogId: TStringId, phraseId: TStringId): boolean =>
    !canSquadTravel(object),
  can_negotiate_travel_to_smart: (
    actor: GameObject,
    object: GameObject,
    dialogId: TStringId,
    prevPhraseId: TStringId,
    phraseId: TStringId
  ): boolean => canNegotiateTravelToSmart(object, phraseId),
  get_travel_cost: (actor: GameObject, object: GameObject, dialogId: TStringId, phraseId: TStringId): TLabel =>
    getTravelCostLabel(object, phraseId),
  is_enough_money_to_travel: (
    actor: GameObject,
    object: GameObject,
    dialogId: TStringId,
    phraseId: TStringId
  ): boolean => isEnoughMoneyToTravel(object, phraseId),
  is_not_enough_money_to_travel: (
    actor: GameObject,
    object: GameObject,
    dialogId: TStringId,
    phraseId: TStringId
  ): boolean => !isEnoughMoneyToTravel(object, phraseId),
});
