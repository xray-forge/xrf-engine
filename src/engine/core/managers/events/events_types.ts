import { AnyCallable, TDuration, TTimestamp } from "xray16/lib";

/**
 * List of event to emit across the core.
 *
 * @inline
 */
export enum EGameEvent {
  /**
   * Actor registered.
   */
  ACTOR_REGISTER = 1,
  /**
   * Actor unregistered.
   */
  ACTOR_UNREGISTER,
  /**
   * Actor re-initialize.
   */
  ACTOR_REINIT,
  /**
   * Actor spawned after start / load in level and become online.
   */
  ACTOR_GO_ONLINE,
  /**
   * Actor object destroyed and gone offline.
   */
  ACTOR_GO_OFFLINE,
  /**
   * Actor update generic tick.
   */
  ACTOR_UPDATE,
  /**
   * Actor update generic tick with 100 ms throttle.
   */
  ACTOR_UPDATE_100,
  /**
   * Actor update generic tick with 250 ms throttle.
   */
  ACTOR_UPDATE_250,
  /**
   * Actor update generic tick with 500 ms throttle.
   */
  ACTOR_UPDATE_500,
  /**
   * Actor update generic tick with 1000 ms throttle.
   */
  ACTOR_UPDATE_1000,
  /**
   * Actor update generic tick with 2500 ms throttle.
   */
  ACTOR_UPDATE_2500,
  /**
   * Actor update generic tick with 5000 ms throttle.
   */
  ACTOR_UPDATE_5000,
  /**
   * Actor update generic tick with 10000 ms throttle.
   */
  ACTOR_UPDATE_10000,
  /**
   * Actor death.
   */
  ACTOR_DEATH,
  /**
   * Actor info-portion added.
   */
  ACTOR_INFO_ADDED,
  /**
   * Actor info-portion removed.
   */
  ACTOR_INFO_REMOVED,
  /**
   * Actor take item from box.
   */
  ACTOR_TAKE_BOX_ITEM,
  /**
   * Actor drop item.
   */
  ACTOR_ITEM_DROP,
  /**
   * Actor take item.
   */
  ACTOR_ITEM_TAKE,
  /**
   * Actor trade happened.
   */
  ACTOR_TRADE,
  /**
   * Actor used item.
   */
  ACTOR_USE_ITEM,
  /**
   * Actor started sleeping.
   */
  ACTOR_START_SLEEP,
  /**
   * Actor entering no weapon zone restrictor.
   */
  ACTOR_ENTER_NO_WEAPON_ZONE,
  /**
   * Actor leaving no weapon zone restrictor.
   */
  ACTOR_LEAVE_NO_WEAPON_ZONE,
  /**
   * Actor finished sleeping.
   */
  ACTOR_FINISH_SLEEP,
  /**
   * Actor first update after load / start.
   */
  ACTOR_FIRST_UPDATE,
  /**
   * On stalker object spawn.
   */
  STALKER_SPAWN,
  /**
   * On stalker object registered.
   */
  STALKER_REGISTER,
  /**
   * On stalker object unregistered.
   */
  STALKER_UNREGISTER,
  /**
   * On interaction with NPC, when player 'uses' game object.
   */
  STALKER_INTERACTION,
  /**
   * On stalker hit.
   */
  STALKER_HIT,
  /**
   * On stalker killed.
   * Client side death event.
   */
  STALKER_DEATH,
  /**
   * Stalker death.
   * Server side death event.
   */
  STALKER_DEATH_ALIFE,
  /**
   * Stalker weapon selection is needed.
   */
  STALKER_WEAPON_SELECT,
  /**
   * On monster register.
   */
  MONSTER_REGISTER,
  /**
   * On monster unregister.
   */
  MONSTER_UNREGISTER,
  /**
   * On monster hit.
   */
  MONSTER_HIT,
  /**
   * On monster killed.
   * Client side death event.
   */
  MONSTER_DEATH,
  /**
   * Monster death.
   * Server side death event.
   */
  MONSTER_DEATH_ALIFE,
  /**
   * Registered helicopter server object.
   */
  HELICOPTER_REGISTERED,
  /**
   * Unregistered helicopter server object.
   */
  HELICOPTER_UNREGISTERED,
  /**
   * Registered squad server object.
   */
  SQUAD_REGISTERED,
  /**
   * Unregistered squad server object.
   */
  SQUAD_UNREGISTERED,
  /**
   * Smart terrain registered.
   */
  SMART_TERRAIN_REGISTER,
  /**
   * Smart terrain unregistered.
   */
  SMART_TERRAIN_UNREGISTER,
  /**
   * Nearest smart terrain changed.
   */
  SMART_TERRAIN_NEAREST_CHANGED,
  /**
   * Mark smart terrain as visited.
   */
  SMART_TERRAIN_VISITED,
  /**
   * Smart terrain job assignments require scheduled full reselection.
   */
  SMART_TERRAIN_JOBS_DIRTY,
  /**
   * Registered physic object.
   */
  OBJECT_PHYSIC_REGISTER,
  /**
   * Unregister physic object.
   */
  OBJECT_PHYSIC_UNREGISTER,
  /**
   * Registered hanging lamp object.
   */
  OBJECT_HANGING_LAMP_REGISTER,
  /**
   * Unregister hanging lamp object.
   */
  OBJECT_HANGING_LAMP_UNREGISTER,
  /**
   * Smart cover registered.
   */
  SMART_COVER_REGISTER,
  /**
   * Smart cover unregistered.
   */
  SMART_COVER_UNREGISTER,
  /**
   * Registered zone server object.
   */
  ZONE_REGISTERED,
  /**
   * Unregistered zone server object.
   */
  ZONE_UNREGISTERED,
  /**
   * Registered anomalous zone server object.
   */
  ANOMALOUS_ZONE_REGISTERED,
  /**
   * Unregistered anomalous zone server object.
   */
  ANOMALOUS_ZONE_UNREGISTERED,
  /**
   * Registered restrictor zone server object.
   */
  RESTRICTOR_ZONE_REGISTERED,
  /**
   * Unregistered restrictor zone server object.
   */
  RESTRICTOR_ZONE_UNREGISTERED,
  /**
   * Restrictor zone visited for first time.
   */
  RESTRICTOR_ZONE_VISITED,
  /**
   * Registered torrid zone server object.
   */
  TORRID_ZONE_REGISTERED,
  /**
   * Unregistered torrid zone server object.
   */
  TORRID_ZONE_UNREGISTERED,
  /**
   * Registered visual zone server object.
   */
  VISUAL_ZONE_REGISTERED,
  /**
   * Unregistered visual zone server object.
   */
  VISUAL_ZONE_UNREGISTERED,
  /**
   * Registered level changer server object.
   */
  LEVEL_CHANGER_REGISTERED,
  /**
   * Unregistered level changer server object.
   */
  LEVEL_CHANGER_UNREGISTERED,
  /**
   * Registered item server object.
   */
  ITEM_REGISTERED,
  /**
   * Unregistered item server object.
   */
  ITEM_UNREGISTERED,
  /**
   * Registered inventory box server object.
   */
  INVENTORY_BOX_REGISTERED,
  /**
   * Unregistered inventory box server object.
   */
  INVENTORY_BOX_UNREGISTERED,
  /**
   * Registered ammo item server object.
   */
  ITEM_AMMO_REGISTERED,
  /**
   * Unregistered ammo item server object.
   */
  ITEM_AMMO_UNREGISTERED,
  /**
   * Registered artefact item server object.
   */
  ITEM_ARTEFACT_REGISTERED,
  /**
   * Unregistered artefact item server object.
   */
  ITEM_ARTEFACT_UNREGISTERED,
  /**
   * Registered detector item server object.
   */
  ITEM_DETECTOR_REGISTERED,
  /**
   * Unregistered detector item server object.
   */
  ITEM_DETECTOR_UNREGISTERED,
  /**
   * Registered eatable item server object.
   */
  ITEM_EATABLE_REGISTERED,
  /**
   * Unregistered eatable item server object.
   */
  ITEM_EATABLE_UNREGISTERED,
  /**
   * Registered explosive item server object.
   */
  ITEM_EXPLOSIVE_REGISTERED,
  /**
   * Registered grenade item server object.
   */
  ITEM_GRENADE_REGISTERED,
  /**
   * Unregistered grenade item server object.
   */
  ITEM_GRENADE_UNREGISTERED,
  /**
   * Helmet item go online first time.
   */
  ITEM_HELMET_GO_ONLINE_FIRST_TIME,
  /**
   * Helmet item go online.
   */
  ITEM_HELMET_GO_ONLINE,
  /**
   * Helmet item go offline.
   */
  ITEM_HELMET_GO_OFFLINE,
  /**
   * Registered helmet item server object.
   */
  ITEM_HELMET_REGISTERED,
  /**
   * Unregistered helmet item server object.
   */
  ITEM_HELMET_UNREGISTERED,
  /**
   * Outfit item go online first time.
   */
  ITEM_OUTFIT_GO_ONLINE_FIRST_TIME,
  /**
   * Outfit item go online.
   */
  ITEM_OUTFIT_GO_ONLINE,
  /**
   * Outfit item go offline.
   */
  ITEM_OUTFIT_GO_OFFLINE,
  /**
   * Registered outfit item server object.
   */
  ITEM_OUTFIT_REGISTERED,
  /**
   * Unregistered outfit item server object.
   */
  ITEM_OUTFIT_UNREGISTERED,
  /**
   * Unregistered pda item server object.
   */
  ITEM_PDA_REGISTERED,
  /**
   * Unregistered pda item server object.
   */
  ITEM_PDA_UNREGISTERED,
  /**
   * Unregistered pda item server object.
   */
  ITEM_TORCH_REGISTERED,
  /**
   * Unregistered pda item server object.
   */
  ITEM_TORCH_UNREGISTERED,
  /**
   * Weapon item go online first time.
   */
  ITEM_WEAPON_GO_ONLINE_FIRST_TIME,
  /**
   * Weapon item go online.
   */
  ITEM_WEAPON_GO_ONLINE,
  /**
   * Weapon item go offline.
   */
  ITEM_WEAPON_GO_OFFLINE,
  /**
   * Registered weapon item server object.
   */
  ITEM_WEAPON_REGISTERED,
  /**
   * Unregistered weapon item server object.
   */
  ITEM_WEAPON_UNREGISTERED,
  /**
   * Registered auto shotgun  item server object.
   */
  ITEM_WEAPON_AUTOMATIC_SHOTGUN_REGISTERED,
  /**
   * Unregistered auto shotgun item server object.
   */
  ITEM_WEAPON_AUTOMATIC_SHOTGUN_UNREGISTERED,
  /**
   * Registered magazined weapon item server object.
   */
  ITEM_WEAPON_MAGAZINED_REGISTERED,
  /**
   * Unregistered magazined weapon item server object.
   */
  ITEM_WEAPON_MAGAZINED_UNREGISTERED,
  /**
   * Registered magazined weapon with grenade launcher server object.
   */
  ITEM_WEAPON_MAGAZINED_WGL_REGISTERED,
  /**
   * Unregistered magazined weapon with grenade launcher server object.
   */
  ITEM_WEAPON_MAGAZINED_WGL_UNREGISTERED,
  /**
   * Registered shotgun weapon server object.
   */
  ITEM_WEAPON_SHOTGUN_REGISTERED,
  /**
   * Unregistered shotgun weapon server object.
   */
  ITEM_WEAPON_SHOTGUN_UNREGISTERED,
  /**
   * Unregistered generic server ALifeDynamicObject.
   */
  SERVER_OBJECT_UNREGISTERED,
  /**
   * Surge ended.
   */
  SURGE_ENDED,
  /**
   * Surge skipped (happened during sleep or more important events).
   */
  SURGE_SKIPPED,
  /**
   * Surge survived with usage of anabiotic.
   */
  SURGE_SURVIVED_WITH_ANABIOTIC,
  /**
   * Task activated.
   */
  TASK_ACTIVATED,
  /**
   * Task state updated.
   */
  TASK_STATE_UPDATE,
  /**
   * Task completed.
   */
  TASK_COMPLETED,
  /**
   * Task reversed.
   */
  TASK_REVERSED,
  /**
   * Task failed.
   */
  TASK_FAILED,
  /**
   * Actor found treasure.
   */
  TREASURE_FOUND,
  /**
   * Generic notification event.
   */
  NOTIFICATION,
  /**
   * Object received a hit.
   */
  HIT,
  /**
   * Main menu turned on.
   */
  MAIN_MENU_ON,
  /**
   * Main menu turned off.
   */
  MAIN_MENU_OFF,
  /**
   * Game started.
   */
  GAME_STARTED,
  /**
   * Game state save.
   */
  GAME_SAVE,
  /**
   * Game state saved.
   */
  GAME_SAVED,
  /**
   * Game state load.
   */
  GAME_LOAD,
  /**
   * Game state loaded.
   */
  GAME_LOADED,
  /**
   * Event called before level change.
   */
  BEFORE_LEVEL_CHANGE,
  /**
   * Dumping data from lua.
   */
  DUMP_LUA_DATA,
}

/**
 * Descriptor of interval to process on game ticks.
 */
export interface IIntervalDescriptor {
  callback: AnyCallable;
  period: TDuration;
  last: TTimestamp;
}

/**
 * Descriptor of timeout to process on game ticks.
 */
export interface ITimeoutDescriptor {
  callback: AnyCallable;
  delay: TDuration;
  last: TTimestamp;
}
