import { Command, Option } from "commander";

import { packDescriptionSprites } from "#/sprites/pack_description_sprites";
import { packEquipmentSprite } from "#/sprites/pack_equipment_sprite";
import { unpackDescriptionSprites } from "#/sprites/unpack_description_sprites";
import { unpackEquipmentSprite } from "#/sprites/unpack_equipment_sprite";

export interface ISpritesCommandParameters {
  description?: string;
  verbose?: boolean;
  strict?: boolean;
}

/**
 * Setup sprites commands.
 */
export function setupSpritesCommand(command: Command): void {
  const spritesCommand: Command = command.command("sprites").description("custom sprite pack and unpack commands");

  spritesCommand
    .command("unpack-equipment")
    .description("unpack the equipment sprite into separate icon files")
    .addOption(new Option("-v, --verbose", "print verbose logs"))
    .addOption(new Option("-s, --strict", "activate strict mode").default(true))
    .action(unpackEquipmentSprite);

  spritesCommand
    .command("pack-equipment")
    .description("pack separate icon files into the equipment sprite")
    .addOption(new Option("-v, --verbose", "print verbose logs"))
    .addOption(new Option("-s, --strict", "activate strict mode").default(true))
    .action(packEquipmentSprite);

  spritesCommand
    .command("pack-description")
    .description("pack the sprites an XML texture description declares")
    .addOption(new Option("-d, --description <name>", "name of description file to process"))
    .addOption(new Option("-v, --verbose", "print verbose logs"))
    .addOption(new Option("-s, --strict", "activate strict mode").default(true))
    .action(packDescriptionSprites);

  spritesCommand
    .command("unpack-description")
    .description("unpack the sprites an XML texture description declares")
    .addOption(new Option("-d, --description <name>", "name of description file to process"))
    .addOption(new Option("-v, --verbose", "print verbose logs"))
    .addOption(new Option("-s, --strict", "activate strict mode").default(true))
    .action(unpackDescriptionSprites);
}
