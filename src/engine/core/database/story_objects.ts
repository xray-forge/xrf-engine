import { AnyGameObject, GameObject, IniFile, ServerObject } from "xray16/alias";
import { abort, assert, Nillable, TName, TNumberId, TSection, TStringId } from "xray16/lib";
import { $isNil, $isNotNil } from "xray16/macros";

import { SYSTEM_INI } from "@/engine/core/database/ini_registry";
import { getGameObjectById } from "@/engine/core/database/objects";
import { registry } from "@/engine/core/database/registry";
import { readIniString } from "@/engine/core/ini/ini_read";

/**
 * Register story object link based on ini configuration.
 *
 * @param object - Server object to register links.
 */
export function registerObjectStoryLinks(object: ServerObject): void {
  const ini: IniFile = object.spawn_ini() as IniFile;

  if (ini.section_exist("story_object")) {
    const [, field, value] = ini.r_line("story_object", 0, "", "");

    assert(field === "story_id", "There is no 'story_id' field in [story_object] section [%s].", object.name());
    assert(value !== "", "Field 'story_id' in [story_object] section got no value: [%s].", object.name());

    registerStoryLink(object.id, value);

    return;
  }

  const section: TSection = object.section_name();
  const storyId: Nillable<TStringId> = readIniString(SYSTEM_INI, section, "story_id", false);

  if ($isNotNil(storyId)) {
    registerStoryLink(object.id, storyId);
  }
}

/**
 * Register story links based on object information.
 *
 * @param objectId - Game object ID.
 * @param storyObjectId - Game object story ID.
 */
export function registerStoryLink(objectId: TNumberId, storyObjectId: TStringId): void {
  const linkId: Nillable<number> = registry.storyLink.idBySid.get(storyObjectId);

  if ($isNotNil(linkId)) {
    if (objectId !== linkId) {
      const existingObjectName: TName = registry.simulator.object(linkId)?.name() as TName;
      const newObjectName: TName = registry.simulator.object(objectId)?.name() as TName;

      abort(
        "You are trying to spawn two or more objects with the same story_id: [%s] --> [%s] try to add: [%s]",
        storyObjectId,
        existingObjectName,
        newObjectName
      );
    }
  } else if ($isNotNil(registry.storyLink.sidById.get(objectId))) {
    if (registry.storyLink.sidById.get(objectId) !== storyObjectId) {
      abort("Object [%s] is already in registry with story id: [%s]", tostring(objectId), storyObjectId);
    }
  }

  registry.storyLink.idBySid.set(storyObjectId, objectId);
  registry.storyLink.sidById.set(objectId, storyObjectId);
}

/**
 * Unregister story object link by provided object ID.
 *
 * @param objectId - Game object ID to unregister story links.
 */
export function unregisterStoryLinkByObjectId(objectId: TNumberId): void {
  if ($isNotNil(registry.storyLink.sidById.get(objectId))) {
    registry.storyLink.idBySid.delete(registry.storyLink.sidById.get(objectId) as TStringId);
    registry.storyLink.sidById.delete(objectId);
  }
}

/**
 * Unregister story object link by provided story ID.
 *
 * @param storyId - Story object ID to unregister story links.
 */
export function unregisterStoryLinkByStoryId(storyId: TStringId): void {
  if ($isNotNil(registry.storyLink.idBySid.get(storyId))) {
    registry.storyLink.sidById.delete(registry.storyLink.idBySid.get(storyId) as TNumberId);
    registry.storyLink.idBySid.delete(storyId);
  }
}

/**
 * Check whether object has story link.
 *
 * @param object - Object to check.
 * @returns Whether provided object has linked story id.
 */
export function isStoryObject(object: AnyGameObject): boolean {
  if (type(object.id) === "function") {
    return registry.storyLink.sidById.has((object as GameObject).id());
  } else {
    return registry.storyLink.sidById.has((object as ServerObject).id);
  }
}

/**
 * Check whether story object exists.
 *
 * @param storyId - Story ID to check existing.
 * @returns Whether story object exists.
 */
export function isStoryObjectExisting(storyId: TStringId): boolean {
  const objectId: Nillable<TNumberId> = registry.storyLink.idBySid.get(storyId);

  return $isNil(objectId) ? false : $isNotNil(registry.simulator.object(objectId));
}

/**
 * Get object story ID by provided game object ID.
 *
 * @param objectId - Game object ID.
 * @returns Story object id.
 */
export function getStoryIdByObjectId(objectId: TNumberId): Nillable<TStringId> {
  return registry.storyLink.sidById.get(objectId);
}

/**
 * Get game object ID by provided story ID.
 *
 * @param storyId - Story ID of the object.
 * @returns Game object ID.
 */
export function getObjectIdByStoryId(storyId: TStringId): Nillable<TNumberId> {
  return registry.storyLink.idBySid.get(storyId);
}

/**
 * Get server object by provided story ID.
 *
 * @param storyId - Story id to search.
 * @returns Existing server object instance or null.
 */
export function getServerObjectByStoryId<T extends ServerObject>(storyId: TStringId): Nillable<T> {
  const objectId: Nillable<TNumberId> = registry.storyLink.idBySid.get(storyId) as Nillable<TNumberId>;

  return objectId ? registry.simulator.object<T>(objectId) : null;
}

/**
 * Get game object by provided story ID.
 *
 * @param storyId - Story id to search.
 * @returns Existing game object instance or null.
 */
export function getObjectByStoryId(storyId: TStringId): Nillable<GameObject> {
  return getGameObjectById(registry.storyLink.idBySid.get(storyId));
}

/**
 * Get runtime object identifier by its server story object SID.
 *
 * Todo: Probably remove, is it working at all? Used with heli only.
 *
 * @param sid - Server story object SID to resolve.
 * @returns Runtime identifier of the matching object, or null when not found.
 */
export function getIdBySid(sid: TNumberId): Nillable<TNumberId> {
  const object: Nillable<ServerObject> = registry.simulator.story_object(sid) as Nillable<ServerObject>;

  return object ? object.id : null;
}
