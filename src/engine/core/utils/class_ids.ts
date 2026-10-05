import { alife, clsid } from "xray16";
import type {
  AnyGameObject,
  GameObject,
  ServerArtefactItemObject,
  ServerGroupObject,
  ServerHumanObject,
  ServerMonsterAbstractObject,
  ServerObject,
  ServerSmartZoneObject,
  TClassId,
} from "xray16/alias";
import { MAX_ALIFE_ID, type Nillable, type TNumberId } from "xray16/lib";
import { $isNil, $isNotNil } from "xray16/macros";

import { classIds } from "@/engine/constants/class_ids";
import { SYSTEM_INI } from "@/engine/core/database/ini_registry";
import { type Stalker } from "@/engine/core/objects/creature";

/**
 * Check whether object class id matches monster.
 *
 * @param object - Game object to check.
 * @returns Whether provided object class id is matching monster.
 */
export function isMonster(object: GameObject): object is GameObject;
export function isMonster(object: ServerObject): object is ServerMonsterAbstractObject;
export function isMonster(object: AnyGameObject): boolean {
  return classIds.monster.has(object.clsid());
}

/**
 * Check whether object is matching stalker class id.
 *
 * @param object - Any game object to check.
 * @returns Whether object class id is a stalker.
 */
export function isStalker(object: AnyGameObject): object is Stalker | GameObject {
  return classIds.stalker.has(object.clsid());
}

/**
 * Check whether object is matching stalker or monster class id.
 *
 * @param object - Any game object to check.
 * @param classId - Class id to check.
 * @returns Whether object class id is a stalker or a monster.
 */
export function isCreature(
  object: AnyGameObject,
  classId: TClassId = object.clsid()
): object is Stalker | ServerMonsterAbstractObject | GameObject {
  return classIds.stalker.has(classId) || classIds.monster.has(classId);
}

/**
 * Check whether object is matching trader class id.
 *
 * @param object - Any game object to check.
 * @param classId - Class id to check.
 * @returns Whether object class id is a trader.
 */
export function isTrader(object: AnyGameObject, classId: TClassId = object.clsid()): object is ServerHumanObject {
  return classId === clsid.trader;
}

/**
 * Check whether object is matching weapon class id.
 *
 * @param object - Any game object to check.
 * @returns Whether object class id is weapon.
 */
export function isWeapon<T extends AnyGameObject>(object: Nillable<T>): object is T {
  return $isNotNil(object) && classIds.weapon.has(object.clsid());
}

/**
 * Check whether object is grenade.
 *
 * @param object - Game object to check.
 * @returns Whether object class id matches grenade.
 */
export function isGrenade(object: Nillable<AnyGameObject>): boolean {
  if ($isNil(object)) {
    return false;
  }

  const id: TClassId = object.clsid();

  return id === clsid.wpn_grenade_rgd5_s || id === clsid.wpn_grenade_f1_s;
}

/**
 * Is provided object artefact.
 *
 * @param object - Any game object to check if artefact.
 * @returns Whether object class id matches artefact.
 */
export function isArtefact(object: AnyGameObject): object is ServerArtefactItemObject {
  return classIds.artefact.has(object.clsid());
}

/**
 * Check whether weapon is strappable.
 *
 * @param object - Object to check.
 * @returns Whether strap animation is available for weapon.
 */
export function isStrappableWeapon(object: Nillable<GameObject>): object is GameObject {
  return $isNil(object) ? false : SYSTEM_INI.line_exist(object.section(), "strap_bone0");
}

/**
 * @inline
 *
 * @param object - Object to check.
 * @returns Whether provided object is actor class.
 */
export function isActor<T extends ServerGroupObject>(object: ServerObject): object is T {
  return object.clsid() === clsid.script_actor;
}

/**
 * @inline
 *
 * @param object - Object to check.
 * @returns Whether provided object is squad class.
 */
export function isSquad<T extends ServerGroupObject>(object: ServerObject): object is T {
  return object.clsid() === clsid.online_offline_group_s;
}

/**
 * @inline
 *
 * @param object - Object to check.
 * @returns Whether provided object is smart terrain class.
 */
export function isSmartTerrain<T extends ServerSmartZoneObject>(object: ServerObject): object is T {
  return object.clsid() === clsid.smart_terrain;
}

/**
 * @param squad - Squad object to check.
 * @returns Whether provided squad is assigned with monsters, false for a squad left without members.
 */
export function isMonsterSquad<T extends ServerGroupObject>(squad: T): boolean {
  const commanderId: TNumberId = squad.commander_id();

  // A squad whose last member died is still updated until its release completes, and asking the simulator for its
  // missing commander logs an invalid id.
  if (commanderId === MAX_ALIFE_ID) {
    return false;
  }

  const commander: Nillable<ServerObject> = alife().object(commanderId);

  return $isNotNil(commander) && isMonster(commander);
}

/**
 * @inline
 *
 * @param object - Object to check.
 * @returns Whether provided object is snork.
 */
export function isSnork(object: AnyGameObject): boolean {
  return object.clsid() === clsid.snork_s;
}

/**
 * @inline
 *
 * @param object - Object to check.
 * @returns Whether provided object is dog.
 */
export function isDog(object: AnyGameObject): boolean {
  return object.clsid() === clsid.dog_s;
}

/**
 * @inline
 *
 * @param object - Object to check.
 * @returns Whether provided object is psy dog.
 */
export function isPsyDog(object: AnyGameObject): boolean {
  return object.clsid() === clsid.psy_dog_s;
}

/**
 * @inline
 *
 * @param object - Object to check.
 * @returns Whether provided object is poltergeist.
 */
export function isPoltergeist(object: AnyGameObject): boolean {
  return object.clsid() === clsid.poltergeist_s;
}

/**
 * @inline
 *
 * @param object - Object to check.
 * @returns Whether provided object is tushkano.
 */
export function isTushkano(object: AnyGameObject): boolean {
  return object.clsid() === clsid.tushkano_s;
}

/**
 * @inline
 *
 * @param object - Object to check.
 * @returns Whether provided object is burer.
 */
export function isBurer(object: AnyGameObject): boolean {
  return object.clsid() === clsid.burer_s;
}

/**
 * @inline
 *
 * @param object - Object to check.
 * @returns Whether provided object is controller.
 */
export function isController(object: AnyGameObject): boolean {
  return object.clsid() === clsid.controller_s;
}

/**
 * @inline
 *
 * @param object - Object to check.
 * @returns Whether provided object is flesh.
 */
export function isFlesh(object: AnyGameObject): boolean {
  return object.clsid() === clsid.flesh_s;
}

/**
 * @inline
 *
 * @param object - Object to check.
 * @returns Whether provided object is boar.
 */
export function isBoar(object: AnyGameObject): boolean {
  return object.clsid() === clsid.boar_s;
}
