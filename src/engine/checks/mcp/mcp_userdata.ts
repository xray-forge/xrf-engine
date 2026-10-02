import { GameObject, IniFile, ServerObject, Time, Vector } from "xray16/alias";
import { AnyObject } from "xray16/lib";

/**
 * Name an engine object by the members its class has, as the engine shares one metatable between all classes and
 * `class_info` lists every method on each call.
 *
 * @param value - Userdata value.
 * @returns Its name in a dump, such as `<CTime 2012-08-03 09:00:59.000>` or `<game_object 0 actor>`.
 */
export function describeUserdata(value: unknown): string {
  const [isRead, name] = pcall(readUserdataName, value as AnyObject);

  return isRead ? name : "<userdata>";
}

/**
 * @param value - Userdata value.
 * @returns Its name, raising when the engine refuses a member read.
 */
function readUserdataName(value: AnyObject): string {
  if (type(value.timeToString) === "function") {
    const [year, month, day, hour, minute, second, millisecond] = (value as Time).get(0, 0, 0, 0, 0, 0, 0);

    return string.format(
      "<CTime %04d-%02d-%02d %02d:%02d:%02d.%03d>",
      year,
      month,
      day,
      hour,
      minute,
      second,
      millisecond
    );
  } else if (type(value.section_exist) === "function") {
    return string.format("<ini_file %s>", (value as IniFile).fname());
  } else if (type(value.id) === "function" && type(value.clsid) === "function") {
    return string.format("<game_object %d %s>", (value as GameObject).id(), (value as GameObject).name());
  } else if (type(value.id) === "number" && type(value.name) === "function") {
    return string.format("<server_object %d %s>", (value as ServerObject).id, (value as ServerObject).name());
  } else if (type(value.x) === "number" && type(value.y) === "number" && type(value.z) === "number") {
    return string.format("<vector %.2f %.2f %.2f>", (value as Vector).x, (value as Vector).y, (value as Vector).z);
  }

  return "<userdata>";
}
