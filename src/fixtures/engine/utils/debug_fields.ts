import { LuaArray } from "xray16/lib";

import { IDebugField } from "@/engine/core/managers/debug/debug_types";

/**
 * @param fields - Fields a debugger inspector reported.
 * @param label - Label of the fields to read.
 * @returns Values of every field with the label, in order.
 */
export function getDebugFieldValues(fields: LuaArray<IDebugField>, label: string): Array<string> {
  const values: Array<string> = [];

  for (const index of $range(1, fields.length())) {
    if (fields.get(index).label === label) {
      values.push(fields.get(index).value);
    }
  }

  return values;
}
