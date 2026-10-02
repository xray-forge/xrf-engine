import { FORGE_LTX } from "@/engine/core/database/ini_registry";
import { readIniBoolean, readIniString, readIniStringWB } from "@/engine/core/ini/ini_read";

/**
 * Global-level configuration for configs/scripts/forms.
 * Used to define some dev flags/features.
 */
export const forgeConfig = {
  VERSION: readIniStringWB(FORGE_LTX, "config", "version", true),
  ARE_INTRO_VIDEOS_ENABLED: readIniBoolean(FORGE_LTX, "config", "intro_videos_enabled", true),
  EXTENSIONS: {
    ENABLED: readIniBoolean(FORGE_LTX, "extensions", "enabled", true),
    ORDER_FILE: readIniString(FORGE_LTX, "extensions", "order_file", true),
  },
  SAVE: {
    GAME_SAVE_EXTENSION: readIniString(FORGE_LTX, "save", "extension", true),
    GAME_SAVE_DYNAMIC_EXTENSION: readIniString(FORGE_LTX, "save", "dynamic_extension", true),
    GAME_SAVE_PREVIEW_EXTENSION: readIniString(FORGE_LTX, "save", "preview_extension", true),
  },
  DEBUG: {
    IS_ENABLED: readIniBoolean(FORGE_LTX, "debug", "enabled", true),
    IS_LOG_ENABLED: readIniBoolean(FORGE_LTX, "debug", "log_enabled", true),
    IS_SIMULATION_ENABLED: readIniBoolean(FORGE_LTX, "debug", "simulation_enabled", true),
    IS_RESOLVE_LOG_ENABLED: readIniBoolean(FORGE_LTX, "debug", "resolve_log_enabled", true),
    IS_SEPARATE_LUA_LOG_ENABLED: readIniBoolean(FORGE_LTX, "debug", "separate_lua_log_enabled", true),
  },
};
