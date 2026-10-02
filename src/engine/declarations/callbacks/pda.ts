import { EActorMenuMode } from "xray16/alias";
import { AnyArgs, AnyObject, extern, TCount, TIndex, TLabel, TName, TSection } from "xray16/lib";
import { $filename } from "xray16/macros";

import { getManager } from "@/engine/core/database";
import { ActorInventoryMenuManager } from "@/engine/core/managers/actor/ActorInventoryMenuManager";
import { PdaManager } from "@/engine/core/managers/pda/PdaManager";
import { LuaLogger } from "@/engine/core/utils/logging";

const logger: LuaLogger = new LuaLogger($filename);

/** PDA callbacks. */
extern("pda", {
  set_active_subdialog: (section: TSection): void => logger.info("Set active sub-dialog: %s", section),
  get_max_resource: (): TCount => 10,
  get_max_power: (): TCount => 10,
  get_max_member_count: (): TCount => 10,
  actor_menu_mode: (mode: EActorMenuMode): void => getManager(ActorInventoryMenuManager).setActiveMode(mode),
  property_box_clicked: (..._args: AnyArgs): void => logger.info("PDA box property clicked"),
  property_box_add_properties: (..._args: AnyArgs): void => logger.info("PDA box property added"),
  fill_fraction_state: (state: AnyObject): void => {
    getManager(PdaManager).fillFactionState(state);
  },
  get_monster_back: (): TName => getManager(PdaManager).getMonsterBackground(),
  get_monster_icon: (): TName => "",
  get_favorite_weapon: (): TSection => getManager(PdaManager).getFavoriteWeapon(),
  get_stat: (index: TIndex): TLabel => getManager(PdaManager).getStatisticsLabel(index),
});
