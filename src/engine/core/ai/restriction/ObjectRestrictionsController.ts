import { GameObject, IniFile } from "xray16/alias";
import { LuaArray, NIL, TName, TSection } from "xray16/lib";
import { $filename } from "xray16/macros";

import { IRegistryObjectState, registry } from "@/engine/core/database";
import { parseStringsList, readIniString } from "@/engine/core/ini";
import { LuaLogger } from "@/engine/core/utils/logging";

const logger: LuaLogger = new LuaLogger($filename);

/**
 * Per-object controller synchronizing the object's own restrictors, without the level defaults, with its logic.
 */
export class ObjectRestrictionsController {
  /**
   * Return the cached restrictions controller for a registered object, creating it when absent.
   *
   * @param object - Registered game object whose restrictors are controlled.
   * @returns Cached or newly created restrictions controller.
   */
  public static getOrCreateForObject(object: GameObject): ObjectRestrictionsController {
    const state: IRegistryObjectState = registry.objects.get(object.id());

    if (!state.restrictionsController) {
      state.restrictionsController = new ObjectRestrictionsController(object);
    }

    return state.restrictionsController!;
  }

  /**
   * Synchronize an object's dynamic restrictors with an active logic section.
   *
   * @param object - Registered game object whose restrictors are controlled.
   * @param section - Active logic section defining `in_restr` and `out_restr` values.
   * @returns Restrictions controller used for synchronization.
   */
  public static syncForObject(object: GameObject, section: TSection): ObjectRestrictionsController {
    const controller: ObjectRestrictionsController = ObjectRestrictionsController.getOrCreateForObject(object);

    controller.sync(section);

    return controller;
  }

  /** Registered game object whose restrictors are synchronized. */
  public readonly object: GameObject;
  /** Out restrictors captured when this controller was created and never removed by synchronization. */
  public readonly baseOutRestrictions: LuaTable<string, boolean> = new LuaTable();
  /** In restrictors captured when this controller was created and never removed by synchronization. */
  public readonly baseInRestrictions: LuaTable<string, boolean> = new LuaTable();

  public constructor(object: GameObject) {
    this.object = object;

    for (const [, name] of parseStringsList(this.object.base_out_restrictions())) {
      this.baseOutRestrictions.set(name, true);
    }

    for (const [, name] of parseStringsList(this.object.base_in_restrictions())) {
      this.baseInRestrictions.set(name, true);
    }
  }

  /**
   * Synchronize dynamic restrictors with values from the specified logic section.
   * Initial restrictors captured when this controller was created are always retained.
   * A literal `nil` restrictor value is ignored.
   *
   * @param section - Active logic section defining `in_restr` and `out_restr` values.
   */
  public sync(section: TSection): void {
    const objectName: TName = this.object.name();
    const ini: IniFile = registry.objects.get(this.object.id()).ini;

    // Update OUT restrictors based on active / ini restrictors.
    const outRestrictorString: string = readIniString(ini, section, "out_restr", false, null, "");
    const newOutRestrictors: LuaArray<TName> = parseStringsList(outRestrictorString);
    const oldOutRestrictors: LuaArray<TName> = parseStringsList(this.object.base_out_restrictions());

    let restrictorsToAdd: LuaArray<TName> = new LuaTable();
    let restrictorsToRemove: LuaArray<TName> = new LuaTable();

    // Get OUT restrictors to remove.
    for (const [, name] of oldOutRestrictors) {
      let isExistingRestrictor: boolean = false;

      for (const [, newName] of newOutRestrictors) {
        if (name === newName) {
          isExistingRestrictor = true;
          break;
        }
      }

      if (!isExistingRestrictor && !this.baseOutRestrictions.get(name)) {
        table.insert(restrictorsToRemove, name);
      }
    }

    // Get OUT restrictors to add.
    for (const [, name] of newOutRestrictors) {
      let isExistingRestrictor: boolean = false;

      for (const [, oldName] of oldOutRestrictors) {
        if (name === oldName) {
          isExistingRestrictor = true;
          break;
        }
      }

      if (!isExistingRestrictor && name !== NIL) {
        table.insert(restrictorsToAdd, name);
      }
    }

    for (const [, name] of restrictorsToRemove) {
      logger.info("Remove 'OUT' restriction: %s %s", objectName, name);
      this.object.remove_restrictions(name, "");
    }

    for (const [, name] of restrictorsToAdd) {
      logger.info("Add 'OUT' restriction: %s %s", objectName, name);
      this.object.add_restrictions(name, "");
    }

    // Update IN restrictors based on active / ini restrictors.
    const inRestrictorString: string = readIniString(ini, section, "in_restr", false, null, "");
    const newInRestrictors: LuaArray<TName> = parseStringsList(inRestrictorString);
    const oldInRestrictors: LuaArray<TName> = parseStringsList(this.object.base_in_restrictions());

    restrictorsToAdd = new LuaTable();
    restrictorsToRemove = new LuaTable();

    // Get IN restrictors to remove.
    for (const [, name] of oldInRestrictors) {
      let isExistingRestrictor: boolean = false;

      for (const [, newName] of newInRestrictors) {
        if (name === newName) {
          isExistingRestrictor = true;
          break;
        }
      }

      if (!isExistingRestrictor && !this.baseInRestrictions.get(name)) {
        table.insert(restrictorsToRemove, name);
      }
    }

    // Get IN restrictors to add.
    for (const [, name] of newInRestrictors) {
      let isExistingRestrictor: boolean = false;

      for (const [, oldName] of oldInRestrictors) {
        if (name === oldName) {
          isExistingRestrictor = true;
          break;
        }
      }

      if (!isExistingRestrictor && name !== NIL) {
        table.insert(restrictorsToAdd, name);
      }
    }

    for (const [, name] of restrictorsToRemove) {
      logger.info("Remove 'IN' restriction: %s %s", objectName, name);
      this.object.remove_restrictions("", name);
    }

    for (const [, name] of restrictorsToAdd) {
      logger.info("Add 'IN' restriction: %s %s", objectName, name);
      this.object.add_restrictions("", name);
    }
  }
}
