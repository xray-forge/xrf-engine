import { key_bindings } from "xray16";
import { TCount, TName, TNumberId } from "xray16/lib";
import { $fromArray } from "xray16/macros";

import { consoleCommands } from "@/engine/constants/console_commands";
import { EDebugTab, EDebugToggleType, IDebugConsoleToggle } from "@/engine/core/managers/debug/debug_types";

export const debugConfig = {
  // Action opening the debugger, `custom1` bound to F11 in `default_controls.ltx`. Read by name, as the xray16
  // declarations do not list the custom actions OpenXRay adds.
  KEY_BINDING: (key_bindings as unknown as Record<TName, TNumberId>).kCUSTOM1,
  // Preferences file, in the user data folder.
  PREFERENCES_FILE: "debugger.dat",
  RECENT_TARGETS_LIMIT: 8 as TCount,
  DEFAULT_TAB: EDebugTab.TARGET,
  // Console commands the player tab toggles.
  CONSOLE_TOGGLES: $fromArray<IDebugConsoleToggle>([
    { command: consoleCommands.g_god, type: EDebugToggleType.ON_OFF },
    { command: consoleCommands.g_unlimitedammo, type: EDebugToggleType.ON_OFF },
    { command: consoleCommands.g_autopickup, type: EDebugToggleType.ON_OFF },
    { command: consoleCommands.wpn_aim_toggle, type: EDebugToggleType.ZERO_ONE },
    { command: consoleCommands.hud_draw, type: EDebugToggleType.ON_OFF },
    { command: consoleCommands.hud_weapon, type: EDebugToggleType.ON_OFF },
    { command: consoleCommands.hud_info, type: EDebugToggleType.ON_OFF },
    { command: consoleCommands.hud_crosshair, type: EDebugToggleType.ON_OFF },
    { command: consoleCommands.hud_crosshair_dist, type: EDebugToggleType.ON_OFF },
    { command: consoleCommands.ai_dbg_alife, type: EDebugToggleType.ON_OFF },
    { command: consoleCommands.ai_dbg_anim, type: EDebugToggleType.ON_OFF },
    { command: consoleCommands.ai_dbg_brain, type: EDebugToggleType.ON_OFF },
    { command: consoleCommands.ai_dbg_cover, type: EDebugToggleType.ON_OFF },
    { command: consoleCommands.ai_dbg_destroy, type: EDebugToggleType.ON_OFF },
    { command: consoleCommands.ai_dbg_dialogs, type: EDebugToggleType.ON_OFF },
    { command: consoleCommands.ai_dbg_frustum, type: EDebugToggleType.ON_OFF },
    { command: consoleCommands.ai_dbg_funcs, type: EDebugToggleType.ON_OFF },
    { command: consoleCommands.ai_dbg_goap, type: EDebugToggleType.ON_OFF },
    { command: consoleCommands.ai_dbg_goap_object, type: EDebugToggleType.ON_OFF },
    { command: consoleCommands.ai_dbg_goap_script, type: EDebugToggleType.ON_OFF },
    { command: consoleCommands.ai_dbg_infoportion, type: EDebugToggleType.ON_OFF },
    { command: consoleCommands.ai_dbg_monster, type: EDebugToggleType.ON_OFF },
    { command: consoleCommands.ai_dbg_motion, type: EDebugToggleType.ON_OFF },
    { command: consoleCommands.ai_dbg_node, type: EDebugToggleType.ON_OFF },
    { command: consoleCommands.ai_dbg_serialize, type: EDebugToggleType.ON_OFF },
    { command: consoleCommands.ai_dbg_stalker, type: EDebugToggleType.ON_OFF },
    { command: consoleCommands.ai_dbg_vision, type: EDebugToggleType.ON_OFF },
  ]),
};
