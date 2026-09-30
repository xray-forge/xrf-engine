import { game, level } from "xray16";
import { NetPacket, NetProcessor, Time } from "xray16/alias";
import {
  AnyObject,
  assert,
  LuaArray,
  NIL,
  Nillable,
  readTimeFromPacket,
  StringNillable,
  TDuration,
  TName,
  TProbability,
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
import { SurgeManager } from "@/engine/core/managers/surge";
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
  IWeatherState,
  TWeatherGraph,
  WEATHER_CYCLE_PREFIX,
} from "@/engine/core/managers/weather/weather_types";
import { DYNAMIC_WEATHER_GRAPHS_LTX, weatherConfig } from "@/engine/core/managers/weather/WeatherConfig";
import { executeConsoleCommandsFromSection } from "@/engine/core/utils/console";
import { isUndergroundLevel } from "@/engine/core/utils/level";
import { LuaLogger } from "@/engine/core/utils/logging";

const logger: LuaLogger = new LuaLogger($filename);

/**
 * Initialize weather and manage updating of it hourly.
 */
export class WeatherManager extends AbstractManager {
  public shouldForceWeatherChangeOnTimeChange: boolean = false;

  public weatherPeriod: EWeatherPeriodType = EWeatherPeriodType.GOOD;
  public weatherPeriodChangedAt: Time = game.get_game_time();
  // Game seconds the current period lasts from its change.
  public weatherPeriodDuration: TDuration = 0;

  public isWeatherPeriodTransition: boolean = false;
  public isWeatherPeriodPreBlowout: boolean = false;

  public weatherFx: Nillable<TName> = null;
  public weatherFxTime: TTimestamp = 0;

  public weatherSection: TSection = "";
  public weatherConditionList: TConditionList = new LuaTable();

  public lastUpdatedAtHour: TTimestamp = 0;

  // Map of states for weather sections, where key is name and value is probability.
  public weatherState: LuaTable<TName, IWeatherState> = new LuaTable();

  // Map of weathers change graphs for weather section, where key is name and value is probability.
  public graphs: LuaTable<TName, TWeatherGraph> = new LuaTable();

  public override initialize(): void {
    const eventsManager: EventsManager = getManager(EventsManager);

    eventsManager.registerCallback(EGameEvent.DUMP_LUA_DATA, this.onDebugDump, this);
    eventsManager.registerCallback(EGameEvent.ACTOR_UPDATE_2500, this.update, this);
    eventsManager.registerCallback(EGameEvent.ACTOR_GO_ONLINE, this.onActorNetworkSpawn, this);

    // Apply settings for console if any exist.
    executeConsoleCommandsFromSection("weather_console_settings", DYNAMIC_WEATHER_GRAPHS_LTX);
  }

  public override destroy(): void {
    const eventsManager: EventsManager = getManager(EventsManager);

    eventsManager.unregisterCallback(EGameEvent.DUMP_LUA_DATA, this.onDebugDump);
    eventsManager.unregisterCallback(EGameEvent.ACTOR_UPDATE_2500, this.update);
    eventsManager.unregisterCallback(EGameEvent.ACTOR_GO_ONLINE, this.onActorNetworkSpawn);
  }

  /**
   * Load current state / related info.
   */
  public override load(reader: NetProcessor): void {
    openLoadMarker(reader, WeatherManager.name);

    this.weatherSection = reader.r_stringZ();
    this.weatherPeriod = reader.r_stringZ();

    this.isWeatherPeriodTransition = isTransitionWeather(this.weatherSection);
    this.isWeatherPeriodPreBlowout = isPreBlowoutWeather(this.weatherSection);

    this.weatherPeriodChangedAt = readTimeFromPacket(reader) ?? game.get_game_time();
    this.lastUpdatedAtHour = reader.r_u32();

    const stateString: string = reader.r_stringZ();

    this.setStateAsString(stateString);

    const weatherFx: StringNillable = reader.r_stringZ();

    if (weatherFx !== NIL) {
      this.weatherFx = weatherFx;
      this.weatherFxTime = reader.r_float();
    }

    closeLoadMarker(reader, WeatherManager.name);
  }

  /**
   * Save current state / related info.
   */
  public override save(packet: NetPacket): void {
    openSaveMarker(packet, WeatherManager.name);

    packet.w_stringZ(this.weatherSection);
    packet.w_stringZ(this.weatherPeriod);

    writeTimeToPacket(packet, this.weatherPeriodChangedAt);
    packet.w_u32(this.lastUpdatedAtHour);

    packet.w_stringZ(this.getStateAsString());
    packet.w_stringZ(tostring(this.weatherFx));

    if (this.weatherFx) {
      packet.w_float(level.get_wfx_time());
    }

    closeSaveMarker(packet, WeatherManager.name);
  }

  /**
   * Generic update iteration.
   */
  public override update(): void {
    const hour: TTimestamp = level.get_time_hours();

    this.weatherFx = level.is_wfx_playing() ? level.get_weather() : null;

    if (this.lastUpdatedAtHour !== hour) {
      this.lastUpdatedAtHour = hour;

      for (const [, state] of this.weatherState) {
        state.currentState = state.nextState;
        state.nextState = getNextWeatherFromGraph(state.weatherGraph);
      }

      this.changePeriod();
      this.updateWeather();
    }
  }

  /**
   * Try to change current weather based on current cycle, period and state.
   *
   * @param now - Whether weather should be changed immediately.
   */
  public updateWeather(now?: boolean): void {
    let weatherSection: TSection = pickSectionFromCondList(
      registry.actor,
      registry.actor,
      this.weatherConditionList
    ) as TSection;

    if (weatherSection === DYNAMIC_WEATHER) {
      if (this.isWeatherPeriodTransition) {
        weatherSection += "_transition";
        this.isWeatherPeriodTransition = false;
      } else if (this.isWeatherPeriodPreBlowout) {
        weatherSection += "_pre_blowout";
        this.isWeatherPeriodPreBlowout = false;
      } else {
        weatherSection = `${weatherSection}_${
          this.weatherPeriod === EWeatherPeriodType.GOOD
            ? getLevelWeatherPeriods().periodGood
            : getLevelWeatherPeriods().periodBad
        }`;
      }
    }

    this.weatherSection = weatherSection;

    logger.info("Current weather section is: %s", weatherSection);

    const graph: Nillable<TWeatherGraph> = this.getGraphBySection(weatherSection);
    let nextWeather: TName;

    if (graph) {
      if (
        !this.weatherState.get(weatherSection) ||
        this.weatherState.get(weatherSection).weatherName !== weatherSection
      ) {
        this.weatherState = new LuaTable();
        this.weatherState.set(weatherSection, {
          currentState: getNextWeatherFromGraph(graph),
          nextState: getNextWeatherFromGraph(graph),
          weatherName: weatherSection,
          weatherGraph: graph,
        });
      }

      nextWeather = `${WEATHER_CYCLE_PREFIX}${this.weatherState.get(weatherSection).currentState}`;
    } else {
      this.weatherState.delete(weatherSection);
      nextWeather = weatherSection;
    }

    // Force change now if marked as needed.
    if (this.shouldForceWeatherChangeOnTimeChange) {
      now = true;
      this.shouldForceWeatherChangeOnTimeChange = false;
    }

    if (now) {
      this.lastUpdatedAtHour = level.get_time_hours();
    }

    if (this.weatherFx) {
      level.start_weather_fx_from_time(this.weatherFx, this.weatherFxTime);
      logger.info("Start weather FX: %s %s %s", this.weatherFx, this.weatherFxTime, now);
    } else {
      level.set_weather(nextWeather, now === true);
      logger.info("Updated weather: %s %s %s %s", weatherSection, nextWeather, this.weatherFx, now);
    }
  }

  /**
   * Change weather period - set of good or bad weathers in a row.
   * Compared by elapsed game time, so sleeping or skipping time past the change still changes the period.
   */
  public changePeriod(): void {
    const now: Time = game.get_game_time();
    const surgeManager: SurgeManager = getManagerByName("SurgeManager") as SurgeManager;
    const timeToSurge: TDuration = math.floor(
      surgeManager.nextScheduledSurgeDelay - now.diffSec(surgeManager.lastSurgeAt)
    );

    if (timeToSurge < 7200 || level.is_wfx_playing()) {
      logger.info("Activate pre-blowout period: %s", timeToSurge);

      this.isWeatherPeriodPreBlowout = true;
      // Hold the current period over the surge.
      this.weatherPeriodDuration += 3600;
    }

    if (now.diffSec(this.weatherPeriodChangedAt) >= this.weatherPeriodDuration) {
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
   * Read serialized string and transform it into current state.
   */
  public setStateAsString(stateString: string): void {
    this.weatherState = new LuaTable();

    for (const weatherString of string.gfind(stateString, "[^;]+")) {
      const [, , groupName, currentState, nextState] = string.find(weatherString, "([^=]+)=([^,]+),([^,]+)");

      assert(
        groupName,
        "WeatherManager::setStateAsString got malformed state string '%s', '%s' parsed as '%'.",
        stateString,
        weatherString,
        groupName
      );

      const graphName: TName = groupName as TName;
      const graph: Nillable<LuaTable<TName, TProbability>> = this.getGraphBySection(graphName);

      if (graph) {
        logger.info("Change weather graph: %s", stateString);

        this.weatherState.set(graphName, {
          currentState: currentState as TName,
          nextState: nextState as TName,
          weatherName: graphName,
          weatherGraph: graph,
        });
      }
    }
  }

  /**
   * Transform current state into string.
   *
   * @returns String containing level states, example: `dynamic_clear=clear,partly;another=cloudy,rainy`.
   */
  public getStateAsString(): string {
    const levelStrings: LuaArray<string> = new LuaTable();

    for (const [, weatherState] of this.weatherState) {
      table.insert(
        levelStrings,
        weatherState.weatherName + "=" + weatherState.currentState + "," + weatherState.nextState
      );
    }

    return table.concat(levelStrings, ";");
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
   * Detect current level and environment, reset and re-init states.
   */
  protected onActorNetworkSpawn(): void {
    const levelName: TName = level.name();
    const levelWeather: TName = readIniString(GAME_LTX, levelName, "weathers", false, null, DYNAMIC_WEATHER);

    logger.info("Initialize weather on network spawn: %s, %s", levelName, levelWeather);

    weatherConfig.IS_UNDERGROUND_WEATHER = isUndergroundLevel(levelName);

    this.weatherSection = levelWeather;
    this.weatherConditionList = parseConditionsList(levelWeather);

    logger.info("Possible weathers condition list: %s", levelWeather);

    // Period lengths are per level, so the running period's length is rolled for the level just entered.
    this.weatherPeriodDuration = getWeatherPeriodDuration(this.weatherPeriod);

    this.lastUpdatedAtHour = level.get_time_hours();
    this.updateWeather(true);
  }

  /**
   * Handle dump data event.
   *
   * @param data - Data to dump into file.
   */
  public onDebugDump(data: AnyObject): AnyObject {
    data[this.constructor.name] = {
      weatherConfig: weatherConfig,
      shouldForceWeatherChangeOnTimeChange: this.shouldForceWeatherChangeOnTimeChange,
      weatherPeriod: this.weatherPeriod,
      weatherPeriodChangedAt: this.weatherPeriodChangedAt,
      weatherPeriodDuration: this.weatherPeriodDuration,
      isWeatherPeriodTransition: this.isWeatherPeriodTransition,
      isWeatherPeriodPreBlowout: this.isWeatherPeriodPreBlowout,
      weatherFx: this.weatherFx,
      weatherFxTime: this.weatherFxTime,
      weatherSection: this.weatherSection,
      weatherConditionList: this.weatherConditionList,
      lastUpdatedAtHour: this.lastUpdatedAtHour,
      weatherState: this.weatherState,
      graphs: this.graphs,
    };

    return data;
  }
}
