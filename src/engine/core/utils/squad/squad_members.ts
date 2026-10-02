import { GameObject, ServerCreatureObject, ServerGroupObject } from "xray16/alias";
import { LuaArray, Nillable } from "xray16/lib";
import { $isNil } from "xray16/macros";

import { registry } from "@/engine/core/database";

/**
 * List squad members before acting on them, as `squad_members()` walks the engine member list in place and a death or
 * unregister inside the loop shifts it, skipping and repeating members.
 *
 * @param squad - Squad to list.
 * @returns Its members at the time of the call.
 */
export function getSquadMembers(squad: ServerGroupObject): LuaArray<ServerCreatureObject> {
  const members: LuaArray<ServerCreatureObject> = new LuaTable();

  for (const member of squad.squad_members()) {
    table.insert(members, member.object);
  }

  return members;
}

/**
 * Kill a squad member: online members die on the client to run their death callbacks, offline ones die on the server.
 * Either way the member leaves its squad, so list the squad with {@link getSquadMembers} first.
 *
 * @param member - Squad member to kill.
 */
export function killSquadMember(member: ServerCreatureObject): void {
  const object: Nillable<GameObject> = registry.objects.get(member.id)?.object;

  if ($isNil(object)) {
    member.kill();
  } else {
    object.kill(object);
  }
}
