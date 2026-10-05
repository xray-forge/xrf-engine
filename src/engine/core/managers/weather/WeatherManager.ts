import { game, level } from "xray16";
import { NetPacket, NetProcessor, Time } from "xray16/alias";
import {
  AnyObject,
  NIL,
  Nillable,
  readTimeFromPacket,
  StringNillable,
  TDuration,
  TName,
  TSection,
  TTimestamp,
  writeTimeToPacket,
} from "xray16/lib";
import { $filename } from "xray16/macros";

import {
  closeLoadMarker,
  closeSaveMarker,
  GAME_LTX,
  getManager,
  getManagerByName,
  openLoadMarker,
  openSaveMarker,
  registry,
} from "@/engine/core/database";
import {
  parseConditionsList,
  pickSectionFromCondList,
  readIniSectionAsNumberMap,
  readIniString,
  TConditionList,
} from "@/engine/core/ini";
import { AbstractManager } from "@/engine/core/managers/abstract";
import { EGameEvent, EventsManager } from "@/engine/core/managers/events";
import type { SurgeManager } from "@/engine/core/managers/surge/SurgeManager";
import {
  getLevelWeatherPeriods,
  getNextWeatherFromGraph,
  getWeatherPeriodDuration,
  isPreBlowoutWeather,
  isTransitionWeather,
} from "@/engine/core/managers/weather/utils";
import {
  DYNAMIC_WEATHER,
  EWeatherPeriodType,
  TWeatherGraph,
  WEATHER_CYCLE_PREFIX,
} from "@/engine/core/managers/weather/weather_types";
import { DYNAMIC_WEATHER_GRAPHS_LTX, weatherConfig } from "@/engine/core/managers/weather/WeatherConfig";
import { isUndergroundLevel } from "@/engine/core/utils/level";
import { LuaLogger } from "@/engine/core/utils/logging";

const logger: LuaLogger = new LuaLogger($filename);

/**
 * Play the level's weather: a cycle it names, or dynamic weather, which picks a state of its period's graph hourly.
 */
export class WeatherManager extends AbstractManager {
  public weatherPeriod: EWeatherPeriodType = EWeatherPeriodType.GOOD;
  // Null until the actor first spawns, as game time does not exist yet while the game starts and creates managers.
  public weatherPeriodChangedAt: Nillable<Time> = null;
  // Game seconds the current period lasts from its change, rolled for the level on every actor spawn.
  public weatherPeriodDuration: TDuration = 0;
  public isWeatherPeriodTransition: boolean = false;
  public isWeatherPeriodPreBlowout: boolean = false;

  public weatherConditionList: TConditionList = new LuaTable();
  // Section the level plays: a weather graph, or a cycle played as it is.
  public weatherSection: TSection = "";
  // State of the weather graph playing, null for a cycle played as it is.
  public weatherState: Nillable<TName> = null;

  public lastUpdatedAtHour: TTimestamp = 0;
  public shouldForceWeatherChangeOnTimeChange: boolean = false;

  // Weather effect playing when the game was saved, resumed once the actor spawns.
  public savedWeatherFx: Nillable<TName> = null;
  public savedWeatherFxTime: TTimestamp = 0;

  // Weather graphs read so far, by section.
  public graphs: LuaTable<TSection, TWeatherGraph> = new LuaTable();

  public override initialize(): void {
    const eventsManager: EventsManager = getManager(EventsManager);

    eventsManager.registerCallback(EGameEvent.DUMP_LUA_DATA, this.onDebugDump, this);
    eventsManager.registerCallback(EGameEvent.ACTOR_UPDATE_2500, this.update, this);
    eventsManager.registerCallback(EGameEvent.ACTOR_GO_ONLINE, this.onActorNetworkSpawn, this);
    eventsManager.registerCallback(EGameEvent.GAME_TIME_FORWARDED, this.onGameTimeForwarded, this);
  }

  public override destroy(): void {
    const eventsManager: EventsManager = getManager(EventsManager);

    eventsManager.unregisterCallback(EGameEvent.DUMP_LUA_DATA, this.onDebugDump);
    eventsManager.unregisterCallback(EGameEvent.ACTOR_UPDATE_2500, this.update);
    eventsManager.unregisterCallback(EGameEvent.ACTOR_GO_ONLINE, this.onActorNetworkSpawn);
    eventsManager.unregisterCallback(EGameEvent.GAME_TIME_FORWARDED, this.onGameTimeForwarded);
  }

  /**
   * Load current state / related info.
   * Runs before the actor spawns, which plays the weather loaded here.
   */
  public override load(reader: NetProcessor): void {
    openLoadMarker(reader, WeatherManager.name);

    this.weatherSection = reader.r_stringZ();

    const weatherState: StringNillable = reader.r_stringZ();

    this.weatherState = weatherState === NIL ? null : weatherState;
    this.weatherPeriod = reader.r_stringZ();
    this.weatherPeriodChangedAt = readTimeFromPacket(reader);
    this.isWeatherPeriodTransition = isTransitionWeather(this.weatherSection);
    this.isWeatherPeriodPreBlowout = isPreBlowoutWeather(this.weatherSection);

    const weatherFx: StringNillable = reader.r_stringZ();

    if (weatherFx !== NIL) {
      this.savedWeatherFx = weatherFx;
      this.savedWeatherFxTime = reader.r_float();
    }

    closeLoadMarker(reader, WeatherManager.name);
  }

  /**
   * Save current state / related info.
   */
  public override save(packet: NetPacket): void {
    openSaveMarker(packet, WeatherManager.name);

    packet.w_stringZ(this.weatherSection);
    packet.w_stringZ(tostring(this.weatherState));
    packet.w_stringZ(this.weatherPeriod);
    writeTimeToPacket(packet, this.weatherPeriodChangedAt);

    if (level.is_wfx_playing()) {
      packet.w_stringZ(level.get_weather());
      packet.w_float(level.get_wfx_time());
    } else {
      packet.w_stringZ(NIL);
    }

    closeSaveMarker(packet, WeatherManager.name);
  }

  /**
   * Advance the weather once every game hour: change the period when it is over, then play a new state.
   */
  public override update(): void {
    const hour: TTimestamp = level.get_time_hours();

    if (this.lastUpdatedAtHour === hour) {
      return;
    }

    this.lastUpdatedAtHour = hour;
    this.changePeriod();

    // A weather graph plays a new state every game hour.
    this.weatherState = null;
    this.updateWeather();
  }

  /**
   * Switch at once to a new state of the weather the level plays now, as the next game hour would.
   */
  public changeWeatherState(): void {
    this.weatherState = null;
    this.updateWeather(true);
  }

  /**
   * Play the weather section the level picks now, keeping the state it plays while the section stays the same.
   *
   * @param now - Whether the weather is switched to at once rather than blended into.
   */
  public updateWeather(now: boolean = false): void {
    let section: TSection = pickSectionFromCondList(registry.actor, registry.actor, this.weatherConditionList)!;

    if (section === DYNAMIC_WEATHER) {
      if (this.isWeatherPeriodTransition) {
        section += "_transition";
        this.isWeatherPeriodTransition = false;
      } else if (this.isWeatherPeriodPreBlowout) {
        section += "_pre_blowout";
        this.isWeatherPeriodPreBlowout = false;
      } else {
        section += `_${
          this.weatherPeriod === EWeatherPeriodType.GOOD
            ? getLevelWeatherPeriods().periodGood
            : getLevelWeatherPeriods().periodBad
        }`;
      }
    }

    const graph: Nillable<TWeatherGraph> = this.getGraphBySection(section);

    if (!graph) {
      this.weatherState = null;
    } else if (!this.weatherState || section !== this.weatherSection) {
      this.weatherState = getNextWeatherFromGraph(graph);
    }

    this.weatherSection = section;

    const cycle: TName = this.weatherState ? `${WEATHER_CYCLE_PREFIX}${this.weatherState}` : section;
    const isForced: boolean = now || this.shouldForceWeatherChangeOnTimeChange;

    this.shouldForceWeatherChangeOnTimeChange = false;

    // Forcing drops a playing weather effect, so during one the cycle is only recorded for the engine to return to.
    level.set_weather(cycle, isForced && !level.is_wfx_playing());

    logger.info("Updated weather: %s %s %s", section, cycle, isForced);
  }

  /**
   * Change weather period - set of good or bad weathers in a row.
   * Compared by elapsed game time, so sleeping or skipping time past the change still changes the period.
   */
  public changePeriod(): void {
    const now: Time = game.get_game_time();
    const surgeManager: SurgeManager = getManagerByName("SurgeManager") as SurgeManager;
    const timeToSurge: TDuration = surgeManager.getTimeToNextSurge(now);

    // Weather darkens for the two game hours before a surge and while one plays, holding the period over it.
    if (timeToSurge < 7200 || level.is_wfx_playing()) {
      logger.info("Activate pre-blowout period: %s", timeToSurge);

      this.isWeatherPeriodPreBlowout = true;
      this.weatherPeriodDuration += 3600;
    }

    if (now.diffSec(this.weatherPeriodChangedAt!) >= this.weatherPeriodDuration) {
      this.weatherPeriod =
        this.weatherPeriod === EWeatherPeriodType.GOOD ? EWeatherPeriodType.BAD : EWeatherPeriodType.GOOD;
      this.weatherPeriodChangedAt = now;
      this.weatherPeriodDuration = getWeatherPeriodDuration(this.weatherPeriod);
      this.isWeatherPeriodTransition = true;

      logger.info("Changed weather period: %s %s", this.weatherPeriod, this.weatherPeriodDuration);
    }
  }

  /**
   * Mark weather change as needed on next update.
   */
  public forceWeatherChange(): void {
    logger.info("Force weather change");
    this.shouldForceWeatherChangeOnTimeChange = true;
  }

  /**
   * Get weather changes graph by section name.
   *
   * @param section - Name of the section to parse / read.
   * @returns Graph describing provided section, or null when the section is a weather cycle and not a graph.
   */
  public getGraphBySection(section: TSection): Nillable<TWeatherGraph> {
    if (!DYNAMIC_WEATHER_GRAPHS_LTX.section_exist(section)) {
      return null;
    }

    if (!this.graphs.has(section)) {
      this.graphs.set(section, readIniSectionAsNumberMap(DYNAMIC_WEATHER_GRAPHS_LTX, section));
    }

    return this.graphs.get(section);
  }

  /**
   * Handle actor net spawn.
   * Read the level's weather and play it at once, resuming a weather effect the game was saved during.
   */
  protected onActorNetworkSpawn(): void {
    const levelName: TName = level.name();
    const levelWeather: TName = readIniString(GAME_LTX, levelName, "weathers", false, null, DYNAMIC_WEATHER);

    logger.info("Initialize weather on network spawn: %s, %s", levelName, levelWeather);

    weatherConfig.IS_UNDERGROUND_WEATHER = isUndergroundLevel(levelName);

    this.weatherConditionList = parseConditionsList(levelWeather);

    // The first period of a new game starts here, once game time exists.
    if (!this.weatherPeriodChangedAt) {
      this.weatherPeriodChangedAt = game.get_game_time();
    }

    // Period lengths are per level, so the running period's length is rolled for the level just entered.
    this.weatherPeriodDuration = getWeatherPeriodDuration(this.weatherPeriod);
    this.lastUpdatedAtHour = level.get_time_hours();
    this.updateWeather(true);

    // Resumed once its cycle is set, so the level returns to that cycle when the effect ends.
    if (this.savedWeatherFx) {
      logger.info("Resume weather FX: %s %s", this.savedWeatherFx, this.savedWeatherFxTime);

      level.start_weather_fx_from_time(this.savedWeatherFx, this.savedWeatherFxTime);
      this.savedWeatherFx = null;
    }
  }

  /**
   * Handle game time jumping forward, switching to the weather of the new time at once rather than blending into it.
   */
  public onGameTimeForwarded(): void {
    this.forceWeatherChange();
  }

  /**
   * Handle dump data event.
   *
   * @param data - Data to dump into file.
   */
  public onDebugDump(data: AnyObject): AnyObject {
    data[this.constructor.name] = {
      weatherConfig: weatherConfig,
      weatherPeriod: this.weatherPeriod,
      weatherPeriodChangedAt: this.weatherPeriodChangedAt,
      weatherPeriodDuration: this.weatherPeriodDuration,
      isWeatherPeriodTransition: this.isWeatherPeriodTransition,
      isWeatherPeriodPreBlowout: this.isWeatherPeriodPreBlowout,
      weatherConditionList: this.weatherConditionList,
      weatherSection: this.weatherSection,
      weatherState: this.weatherState,
      lastUpdatedAtHour: this.lastUpdatedAtHour,
      shouldForceWeatherChangeOnTimeChange: this.shouldForceWeatherChangeOnTimeChange,
      savedWeatherFx: this.savedWeatherFx,
      savedWeatherFxTime: this.savedWeatherFxTime,
      graphs: this.graphs,
    };

    return data;
  }
}
