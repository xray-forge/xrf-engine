import { level } from "xray16";
import { AlifeSimulator, GameObject, ServerObject } from "xray16/alias";
import { FALSE, NIL, Nillable, TName, TNumberId, TRUE, TSection, TStringId } from "xray16/lib";
import { $filename } from "xray16/macros";

import { IRegistryObjectState, registry } from "@/engine/core/database";
import { parseConditionsList, pickSectionFromCondList, readIniString } from "@/engine/core/ini";
import { IMapMarkDescriptor } from "@/engine/core/managers/map";
import { mapDisplayConfig } from "@/engine/core/managers/map/MapDisplayConfig";
import { EScheme } from "@/engine/core/schemes/types";
import { LuaLogger } from "@/engine/core/utils/logging";

const logger: LuaLogger = new LuaLogger($filename);

/**
 * Update map display for game object.
 *
 * @param object - Game object.
 * @param scheme - Active logic scheme.
 * @param state - Target object registry state.
 * @param section - Active logic section.
 */
export function updateObjectMapSpot(
  object: GameObject,
  scheme: EScheme,
  state: IRegistryObjectState,
  section: TSection
): void {
  const actor: GameObject = registry.actor;
  const simulator: Nillable<AlifeSimulator> = registry.simulator;

  if (!simulator) {
    return;
  }

  const serverObject: Nillable<ServerObject> = simulator.object(object.id());

  if (serverObject?.online) {
    const objectId: TNumberId = object.id();
    const isSpotVisibleSection: TSection =
      (!scheme || scheme === NIL
        ? readIniString(state.ini, state.sectionLogic, "show_spot")
        : readIniString(state.ini, section, "show_spot")) ?? TRUE;
    const isSpotVisible: TSection = pickSectionFromCondList(actor, object, parseConditionsList(isSpotVisibleSection))!;

    let mapSpot: Nillable<TName> =
      readIniString(state.ini, state.sectionLogic, "level_spot") ?? readIniString(state.ini, section, "level_spot");

    if (mapSpot) {
      mapSpot = pickSectionFromCondList(actor, object, parseConditionsList(mapSpot));
    }

    serverObject.visible_for_map(isSpotVisible !== FALSE);

    if (mapSpot) {
      const descriptor: IMapMarkDescriptor = mapDisplayConfig.MAP_MARKS.get(mapSpot);

      if (level.map_has_object_spot(objectId, descriptor.icon) !== 0) {
        level.map_remove_object_spot(objectId, descriptor.icon);
      }

      if (object.general_goodwill(actor) > -1000) {
        level.map_add_object_spot(objectId, descriptor.icon, descriptor.hint);
      }
    } else {
      // Only level spots belong here, squads, tasks and treasures own the other spots of the object, as in vanilla.
      for (const [, descriptor] of mapDisplayConfig.MAP_MARKS) {
        if (level.map_has_object_spot(objectId, descriptor.icon) !== 0) {
          level.map_remove_object_spot(objectId, descriptor.icon);
        }
      }
    }
  }
}

/**
 * Remove object map spot display.
 *
 * @param object - Game object.
 */
export function removeObjectMapSpot(object: GameObject): void {
  logger.info("Remove object spot: %s", object.name());

  if (!registry.simulator) {
    return;
  }

  const state: IRegistryObjectState = registry.objects.get(object.id());
  const spot: Nillable<TStringId> = pickSectionFromCondList(
    registry.actor,
    object,
    parseConditionsList(
      readIniString(state.ini, state.sectionLogic, "level_spot") ??
        readIniString(state.ini, state.activeSection, "level_spot") ??
        ""
    )
  );

  if (spot && spot !== "") {
    level.map_remove_object_spot(object.id(), mapDisplayConfig.MAP_MARKS.get(spot).icon);
  }
}
