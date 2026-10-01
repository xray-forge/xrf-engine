import { IniFile } from "xray16/alias";
import { abort, assert, LuaArray, TCount, TSection, TStringId } from "xray16/lib";
import { $filename, $isNil } from "xray16/macros";

import { SYSTEM_INI } from "@/engine/core/database";
import { ISpawnDescriptor, parseConditionsList, parseSpawnDetails, readIniNumber } from "@/engine/core/ini";
import {
  ALLOWED_TREASURE_TYPES,
  ETreasureType,
  ITreasureDescriptor,
} from "@/engine/core/managers/treasures/treasures_types";
import { LuaLogger } from "@/engine/core/utils/logging";

const logger: LuaLogger = new LuaLogger($filename);

/**
 * Initialize treasures descriptors from ini file.
 *
 * @param ini - Target file to read secrets from.
 * @returns List of parsed secrets.
 */
export function readIniTreasuresList(ini: IniFile): LuaTable<TSection, ITreasureDescriptor> {
  const secrets: LuaTable<TSection, ITreasureDescriptor> = new LuaTable();
  const totalSecretsCount: TCount = ini.line_count("list");

  const rareCost: TCount = readIniNumber(ini, "config", "rare_cost", false, 5_000);
  const epicCost: TCount = readIniNumber(ini, "config", "epic_cost", false, 10_000);

  logger.info("Initialize secrets, expected: %s", totalSecretsCount);

  assert(epicCost > rareCost, "Epic cost cannot be lower than rare treasure const: '%s' < '%s'.", epicCost, rareCost);

  for (const it of $range(0, totalSecretsCount - 1)) {
    const [, treasureSection] = ini.r_line<TStringId>("list", it, "", "");

    assert(ini.section_exist(treasureSection), "There is no section '%s' in treasures.ltx.", treasureSection);

    let cost: TCount = 0;

    const descriptor: ITreasureDescriptor = {
      items: new LuaTable(),
      given: false,
      type: null as unknown as ETreasureType,
      empty: null,
      refreshing: null,
      checked: false,
      itemsToFindRemain: 0,
    };

    const itemsCount: TCount = ini.line_count(treasureSection);

    for (const index of $range(0, itemsCount - 1)) {
      const [, itemSection, itemValue] = ini.r_line(treasureSection, index, "", "");

      switch (itemSection) {
        case "empty":
          descriptor.empty = parseConditionsList(itemValue);
          break;

        case "refreshing":
          descriptor.refreshing = parseConditionsList(itemValue);
          break;

        case "type": {
          if ($isNil(itemValue) || ALLOWED_TREASURE_TYPES.has(itemValue as ETreasureType)) {
            descriptor.type = itemValue as ETreasureType;
          } else {
            abort("Unexpected type provided for treasure: '%s'.", itemValue);
          }

          break;
        }

        default: {
          descriptor.items.set(itemSection, new LuaTable());

          const spawnDetails: LuaArray<ISpawnDescriptor> = parseSpawnDetails(itemValue);

          assert(
            spawnDetails.length() !== 0,
            "There is no items count set for treasure [%s], item [%s]",
            treasureSection,
            itemSection
          );

          for (const [, spawnDescriptor] of spawnDetails) {
            const count: TCount = tonumber(spawnDescriptor.count) ?? 1;
            const probability: TCount = tonumber(spawnDescriptor.probability) ?? 1;

            cost += readIniNumber(SYSTEM_INI, itemSection, "cost", false, 0) * count;

            table.insert(descriptor.items.get(itemSection), {
              count,
              probability,
              itemsIds: null,
            });
          }
        }
      }
    }

    if ($isNil(descriptor.type)) {
      if (cost >= epicCost) {
        descriptor.type = ETreasureType.EPIC;
      } else if (cost >= rareCost) {
        descriptor.type = ETreasureType.RARE;
      } else {
        descriptor.type = ETreasureType.COMMON;
      }
    }

    secrets.set(treasureSection, descriptor);
  }

  return secrets;
}
