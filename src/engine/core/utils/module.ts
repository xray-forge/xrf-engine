import { AnyObject, TName } from "xray16/lib";

/**
 * Require a Lua module afresh, dropping the copy `require` cached, so module-scope code runs again.
 *
 * @param name - Lua module name.
 * @returns What the module returns.
 */
export function requireFresh<T = unknown>(name: TName): T {
  ((_G as AnyObject)["package"].loaded as AnyObject)[name] = null;

  return require(name) as T;
}
