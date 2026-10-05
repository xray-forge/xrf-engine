import { get_console } from "xray16";
import { TName } from "xray16/lib";
import { $isNotNil } from "xray16/macros";

/**
 * Whether the running engine registers a console command. Many debug commands exist only outside gold builds, and
 * `ai_dbg_*` only in Debug and Mixed ones.
 *
 * @param command - Console command name.
 * @returns Whether the console knows the command.
 */
export function isConsoleCommandAvailable(command: TName): boolean {
  return $isNotNil(get_console().get_string(command));
}
