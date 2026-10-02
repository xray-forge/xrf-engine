import { ini_file, system_ini } from "xray16";
import { IniFile } from "xray16/alias";
import { TLabel } from "xray16/lib";

/**
 * Prefix to mark ini files stored in RAM.
 */
export const DYNAMIC_LTX_PREFIX: TLabel = "*";

export const SYSTEM_INI: IniFile = system_ini();

export const DUMMY_LTX: IniFile = new ini_file("scripts\\dummy.ltx");
export const GAME_LTX: IniFile = new ini_file("game.ltx");
export const FORGE_LTX: IniFile = new ini_file("forge.ltx");
