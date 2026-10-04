import { JSXNode, JSXXML } from "jsx-xml";

import { ActorDialog, SpecificCharacter, StartDialog } from "@/engine/configs/gameplay/components";
import {
  CharacterProfileCriticals,
  DefaultCharacterDialogs,
  DefaultCharacterDialogsNoGuide,
  loadoutAbakan,
  loadoutAk74,
  loadoutAk74u,
  loadoutBeretta,
  loadoutBinocular,
  loadoutBm16,
  loadoutCharacterDrugsAdvanced,
  loadoutCharacterDrugsBase,
  loadoutCharacterDrugsElite,
  loadoutCharacterDrugsExtended,
  loadoutCharacterDrugsMilitary,
  loadoutCharacterDrugsScientific,
  loadoutCharacterFood,
  loadoutCharacterItems,
  loadoutCharacterItems2,
  loadoutCharacterItems3,
  loadoutCharacterItemsWithoutDetector,
  loadoutCharacterSellWeapons,
  loadoutColt1911,
  loadoutDesertEagle,
  loadoutDetectorAdvanced,
  loadoutDetectorElite,
  loadoutDetectorScientific,
  loadoutF1Grenades,
  loadoutFort,
  loadoutG36,
  loadoutGroza,
  loadoutHpsa,
  loadoutL85,
  loadoutLr300,
  loadoutMp5,
  loadoutPb,
  loadoutPm,
  loadoutProtecta,
  loadoutRgd5Grenades,
  loadoutSig220,
  loadoutSig550,
  loadoutSpas12,
  loadoutSvd,
  loadoutSvu,
  loadoutTorch,
  loadoutToz34,
  loadoutUsp,
  loadoutVintorez,
  loadoutWalther,
  loadoutWincheaster1300,
} from "@/engine/configs/gameplay/loadouts";
import { profileIcon } from "@/engine/configs/gameplay/loadouts/profile_presets";
import { communities } from "@/engine/constants/communities";
import { ammo } from "@/engine/constants/items/ammo";
import { food } from "@/engine/constants/items/food";
import { misc } from "@/engine/constants/items/misc";
import { questItems } from "@/engine/constants/items/quest_items";
import { weapons } from "@/engine/constants/items/weapons";
import {
  GENERATE_BANDIT_NAME,
  GENERATE_CAPTAIN_NAME,
  GENERATE_LIEUTENANT_NAME,
  GENERATE_SERGEANT_NAME,
  GENERATE_STALKER_NAME,
} from "@/engine/constants/names";

export function create(): JSXNode {
  return (
    <xml>
      <SpecificCharacter
        id={"jup_a12_stalker_assaulter"}
        class={"jup_a12_stalker_assaulter"}
        name={"st_jup_a12_stalker_assaulter"}
        icon={profileIcon.ui_inGame2_neutral_3}
        community={communities.stalker}
        soundConfig={"characters_voice\\human_03\\stalker\\"}
        moneyMin={1000}
        moneyMax={5000}
        rank={40}
        supplies={[
          ...loadoutRgd5Grenades(),
          ...loadoutSpas12(),
          ...loadoutColt1911(),
          ...loadoutCharacterItems2(),
          ...loadoutCharacterFood(),
          ...loadoutCharacterDrugsAdvanced(),
          ...loadoutCharacterDrugsMilitary(),
        ]}
      >
        <CharacterProfileCriticals />
        <ActorDialog>jup_b1_stalker_about_scrutiny</ActorDialog>
        <ActorDialog>jup_b1_stalker_about_scrutiny_2</ActorDialog>
        <ActorDialog>jup_b1_stalker_about_scrutiny_3</ActorDialog>
        <ActorDialog>jup_a12_stalkers_choose_actor_ransom_dialog</ActorDialog>
        <ActorDialog>jup_a12_stalkers_choose_actor_ransom_take_dialog</ActorDialog>
        <ActorDialog>jup_a12_stalkers_choose_actor_power_dialog</ActorDialog>
        <ActorDialog>jup_a12_stalkers_choose_actor_power_take_dialog</ActorDialog>
        <ActorDialog>jup_a12_stalkers_choose_actor_wait_dialog</ActorDialog>
        <ActorDialog>jup_a12_stalkers_choose_actor_self_dialog</ActorDialog>
        <ActorDialog>jup_a12_stalker_assaulter_after_scene_actor_dialog</ActorDialog>
        <ActorDialog>actor_break_dialog</ActorDialog>
      </SpecificCharacter>

      <SpecificCharacter
        id={"jup_a12_stalker_diplomat"}
        class={"jup_a12_stalker_diplomat"}
        name={"st_jup_a12_stalker_diplomat"}
        icon={"ui_inGame2_neutral_2_mask"}
        community={communities.stalker}
        soundConfig={"characters_voice\\human_01\\stalker\\"}
        visual={"actors\\stalker_neutral\\stalker_neutral_2_mask"}
        moneyMin={1000}
        moneyMax={5000}
        rank={30}
        supplies={[
          ...loadoutRgd5Grenades(),
          ...loadoutL85(true),
          ...loadoutSig220(),
          ...loadoutCharacterItems2(),
          ...loadoutCharacterFood(),
          ...loadoutCharacterDrugsAdvanced(),
          ...loadoutCharacterDrugsScientific(),
        ]}
      >
        <CharacterProfileCriticals />
        <ActorDialog>jup_b1_stalker_about_scrutiny</ActorDialog>
        <ActorDialog>jup_b1_stalker_about_scrutiny_2</ActorDialog>
        <ActorDialog>jup_b1_stalker_about_scrutiny_3</ActorDialog>
        <ActorDialog>jup_a12_stalker_diplomat_after_scene_actor_dialog</ActorDialog>
        <ActorDialog>actor_break_dialog</ActorDialog>
      </SpecificCharacter>

      <SpecificCharacter
        id={"jup_a12_stalker_prisoner"}
        class={"jup_a12_stalker_prisoner"}
        name={"st_jup_a12_stalker_prisoner"}
        icon={"ui_inGame2_neutral_2_mask"}
        community={communities.stalker}
        soundConfig={"characters_voice\\human_02\\stalker\\"}
        visual={"actors\\stalker_neutral\\stalker_neutral_2_mask"}
        moneyMin={0}
        moneyMax={0}
        rank={40}
      >
        <CharacterProfileCriticals />
        <ActorDialog>jup_a12_stalker_prisoner_free_actor_dialog</ActorDialog>
        <ActorDialog>jup_a12_stalker_prisoner_employ_stalkers</ActorDialog>
        <ActorDialog>jup_a12_stalker_prisoner_come_with_me</ActorDialog>
        <ActorDialog>jup_b1_stalker_about_scrutiny</ActorDialog>
        <ActorDialog>jup_b1_stalker_about_scrutiny_2</ActorDialog>
        <ActorDialog>jup_b1_stalker_about_scrutiny_3</ActorDialog>
        <ActorDialog>actor_break_dialog</ActorDialog>
      </SpecificCharacter>

      <SpecificCharacter
        id={"jup_a12_bandit_chief"}
        class={"jup_a12_bandit_chief"}
        name={"st_jup_a12_bandit_chief"}
        icon={"ui_inGame2_bandit_3_mask"}
        community={communities.bandit}
        soundConfig={"characters_voice\\human_01\\bandit\\"}
        visual={"actors\\stalker_bandit\\stalker_bandit_3_mask"}
        moneyMin={1000}
        moneyMax={5000}
        rank={55}
        supplies={[...loadoutHpsa(), ...loadoutCharacterItemsWithoutDetector(), ...loadoutCharacterDrugsAdvanced()]}
      >
        <CharacterProfileCriticals />
        <StartDialog>jup_a12_bandit_chief_dialog</StartDialog>
        <ActorDialog>jup_a12_bandit_chief_actor_self_dialog</ActorDialog>
        <ActorDialog>actor_break_dialog</ActorDialog>
      </SpecificCharacter>

      <SpecificCharacter
        id={"jup_a12_bandit_guard"}
        class={"jup_a12_bandit_guard"}
        name={GENERATE_BANDIT_NAME}
        icon={"ui_inGame2_bandit_1"}
        community={communities.bandit}
        soundConfig={"characters_voice\\human_02\\bandit\\"}
        visual={"actors\\stalker_bandit\\stalker_bandit_1"}
        moneyMin={1000}
        moneyMax={5000}
        rank={40}
        supplies={[
          ...loadoutMp5(),
          ...loadoutPm(),
          ...loadoutRgd5Grenades(),
          ...loadoutCharacterItemsWithoutDetector(),
          ...loadoutCharacterFood(),
          ...loadoutCharacterDrugsExtended(),
        ]}
      >
        <CharacterProfileCriticals />
        <StartDialog>jup_a12_bandit_guard_start</StartDialog>
        <StartDialog>jup_a12_bandit_guard_visited</StartDialog>
        <ActorDialog>actor_break_dialog</ActorDialog>
      </SpecificCharacter>

      <SpecificCharacter
        id={"jup_a12_bandit_cashier"}
        class={"jup_a12_bandit_cashier"}
        name={"st_jup_a12_bandit_cashier"}
        icon={"ui_inGame2_bandit_2"}
        community={communities.bandit}
        soundConfig={"characters_voice\\human_02\\bandit\\"}
        visual={"actors\\stalker_bandit\\stalker_bandit_2"}
        moneyMin={1000}
        moneyMax={5000}
        rank={30}
        supplies={[
          ...loadoutWincheaster1300(),
          ...loadoutFort(),
          ...loadoutRgd5Grenades(),
          ...loadoutCharacterItemsWithoutDetector(),
          ...loadoutCharacterFood(),
          ...loadoutCharacterDrugsBase(),
        ]}
      >
        <CharacterProfileCriticals />
        <ActorDialog>actor_break_dialog</ActorDialog>
      </SpecificCharacter>

      <SpecificCharacter
        id={"jup_a12_merc_cover"}
        class={"jup_a12_merc_cover"}
        name={GENERATE_STALKER_NAME}
        icon={"ui_inGame2_neutral_2_mask"}
        community={communities.stalker}
        soundConfig={"characters_voice\\human_01\\stalker\\"}
        visual={"actors\\stalker_neutral\\stalker_neutral_2_mask"}
        moneyMin={1000}
        moneyMax={5000}
        rank={60}
        supplies={[
          ...loadoutVintorez(),
          ...loadoutSig220({ silencer: true }),
          ...loadoutCharacterItems2(),
          ...loadoutCharacterFood(),
          ...loadoutCharacterDrugsAdvanced(),
        ]}
      >
        <CharacterProfileCriticals />
        <StartDialog>jup_a12_stalker_give_art_dialog</StartDialog>
        <StartDialog>jup_a12_merc_done_dialog</StartDialog>
        <ActorDialog>actor_break_dialog</ActorDialog>
      </SpecificCharacter>

      <SpecificCharacter
        id={"jup_b207_merc_illicit_dealer"}
        class={"jup_b207_merc_illicit_dealer"}
        name={GENERATE_STALKER_NAME}
        icon={"ui_inGame2_merc_4"}
        community={communities.killer}
        soundConfig={"characters_voice\\human_03\\killer\\"}
        visual={"actors\\stalker_merc\\stalker_merc_4"}
        moneyMin={1000}
        moneyMax={5000}
        rank={50}
        supplies={[
          { section: questItems.jup_b207_merc_pda_with_contract },
          ...loadoutAbakan({ ap: true, scope: true }),
          ...loadoutSig220({ ap: true }),
          ...loadoutCharacterItems3(),
          ...loadoutCharacterFood(),
          ...loadoutCharacterDrugsElite(),
          ...loadoutCharacterDrugsMilitary(),
        ]}
      >
        <CharacterProfileCriticals />
        <DefaultCharacterDialogs />
      </SpecificCharacter>

      <SpecificCharacter
        id={"jup_b207_merc_leader"}
        class={"jup_b207_merc_leader"}
        name={"jup_b207_merc_leader_name"}
        icon={"ui_inGame2_merc_4"}
        community={communities.killer}
        soundConfig={"characters_voice\\human_03\\killer\\"}
        visual={"actors\\stalker_merc\\stalker_merc_4"}
        moneyMin={1000}
        moneyMax={5000}
        rank={40}
        supplies={[
          ...loadoutAbakan({ ap: true, scope: true }),
          ...loadoutUsp(),
          ...loadoutF1Grenades(),
          ...loadoutCharacterItemsWithoutDetector(),
          ...loadoutCharacterFood(),
          ...loadoutCharacterDrugsAdvanced(),
          ...loadoutCharacterDrugsMilitary(),
        ]}
      >
        <CharacterProfileCriticals />
        <DefaultCharacterDialogs />
      </SpecificCharacter>

      <SpecificCharacter
        id={"jup_b207_duty_security_squad_leader"}
        class={"jup_b207_duty_security_squad_leader"}
        name={"st_jup_b207_duty_security_squad_leader_name"}
        icon={profileIcon.ui_inGame2_Dolg_4}
        community={communities.dolg}
        soundConfig={"characters_voice\\human_01\\dolg\\"}
        visual={"actors\\stalker_dolg\\stalker_dolg_4"}
        moneyMin={1500}
        moneyMax={3500}
        rank={50}
        supplies={[
          ...loadoutGroza(),
          ...loadoutUsp({ ap: true }),
          ...loadoutF1Grenades(2),
          ...loadoutCharacterItemsWithoutDetector(),
          ...loadoutCharacterFood(),
          ...loadoutCharacterDrugsAdvanced(),
          ...loadoutCharacterDrugsMilitary(),
        ]}
      >
        <CharacterProfileCriticals />
        <DefaultCharacterDialogsNoGuide />
      </SpecificCharacter>

      <SpecificCharacter
        id={"jup_b207_freedom_recon_squad_leader"}
        class={"jup_b207_freedom_recon_squad_leader"}
        name={"st_jup_b207_freedom_recon_squad_leader_name"}
        icon={"ui_inGame2_Freedom_3"}
        community={communities.freedom}
        soundConfig={"characters_voice\\human_02\\freedom\\"}
        visual={"actors\\stalker_freedom\\stalker_freedom_3"}
        moneyMin={1500}
        moneyMax={2500}
        rank={40}
        supplies={[
          ...loadoutL85(true),
          ...loadoutBeretta(),
          ...loadoutRgd5Grenades(2),
          ...loadoutCharacterItems3(),
          ...loadoutCharacterFood(),
          ...loadoutCharacterDrugsAdvanced(),
          ...loadoutCharacterDrugsScientific(),
        ]}
      >
        <CharacterProfileCriticals />
        <DefaultCharacterDialogsNoGuide />
      </SpecificCharacter>

      <SpecificCharacter
        id={"jup_b207_freedom_assault_squad_leader"}
        class={"jup_b207_freedom_assault_squad_leader"}
        name={"st_jup_b207_freedom_assault_squad_leader_name"}
        icon={"ui_inGame2_Freedom_4"}
        community={communities.freedom}
        soundConfig={"characters_voice\\human_03\\freedom\\"}
        visual={"actors\\stalker_freedom\\stalker_freedom_4"}
        moneyMin={1500}
        moneyMax={2500}
        rank={50}
        supplies={[
          ...loadoutG36(),
          ...loadoutColt1911(),
          ...loadoutF1Grenades(3),
          ...loadoutCharacterItems3(),
          ...loadoutCharacterFood(),
          ...loadoutCharacterDrugsAdvanced(),
          ...loadoutCharacterDrugsScientific(),
        ]}
      >
        <CharacterProfileCriticals />
        <DefaultCharacterDialogsNoGuide />
      </SpecificCharacter>

      <SpecificCharacter
        id={"jup_a10_bandit_leader"}
        class={"jup_a10_bandit_leader"}
        name={"jup_a10_bandit_leader_name"}
        icon={profileIcon.ui_inGame2_bandit_3}
        community={communities.bandit}
        soundConfig={"characters_voice\\human_02\\bandit\\"}
        moneyMin={10_000}
        moneyMax={10_000}
        rank={60}
        supplies={[
          ...loadoutProtecta(true),
          ...loadoutDesertEagle(),
          ...loadoutF1Grenades(3),
          ...loadoutCharacterItemsWithoutDetector(),
          ...loadoutCharacterFood(),
          ...loadoutCharacterDrugsAdvanced(),
        ]}
      >
        <CharacterProfileCriticals />
        <ActorDialog>jup_a10_stalkers_dialog_debt</ActorDialog>
        <ActorDialog>actor_break_dialog</ActorDialog>
      </SpecificCharacter>

      <SpecificCharacter
        id={"jup_a10_stalker_vano"}
        class={"jup_a10_stalker_vano"}
        name={"jup_a10_stalker_vano"}
        icon={"ui_inGame2_Vano"}
        community={communities.stalker}
        soundConfig={"characters_voice\\human_01\\stalker\\"}
        visual={"actors\\stalker_neutral\\stalker_neutral_1_face_1"}
        moneyMin={10_000}
        moneyMax={10_000}
        rank={45}
        supplies={[
          ...loadoutDetectorElite(),
          ...loadoutBinocular(),
          ...loadoutWincheaster1300(),
          ...loadoutBeretta(),
          ...loadoutRgd5Grenades(3),
          ...loadoutCharacterFood(),
          ...loadoutCharacterDrugsElite(),
        ]}
      >
        <CharacterProfileCriticals />
        <StartDialog>jup_a10_vano_help_dialog</StartDialog>
        <ActorDialog>jup_a10_stalker_vano_need_outfit</ActorDialog>
        <ActorDialog>jup_a10_stalker_vano_outfit_money_yes</ActorDialog>
        <ActorDialog>jup_a10_stalker_vano_pripyat_group</ActorDialog>
        <ActorDialog>jup_a10_stalker_vano_goto_zulus</ActorDialog>
        <ActorDialog>jup_a10_stalker_vano_pripyat_ready</ActorDialog>
        <ActorDialog>jup_a10_vano_back_1</ActorDialog>
        <ActorDialog>jup_a10_vano_back_2</ActorDialog>
        <ActorDialog>jup_a10_vano_back_3</ActorDialog>
        <ActorDialog>jup_a10_vano_back_4</ActorDialog>
        <ActorDialog>jup_a10_vano_give_duty</ActorDialog>
        <ActorDialog>jup_a10_stalker_vano_about_stolen_items</ActorDialog>
        <ActorDialog>actor_break_dialog</ActorDialog>
      </SpecificCharacter>

      <SpecificCharacter
        id={"jup_b4_monolith_squad_leader_monolith_skin"}
        class={"jup_b4_monolith_squad_leader_monolith_skin"}
        name={"jup_b4_monolith_squad_leader_name"}
        icon={"ui_inGame2_Brodyaga_monolit"}
        community={communities.monolith}
        soundConfig={"characters_voice\\human_02\\stalker\\"}
        visual={"actors\\stalker_monolith\\stalker_monolith_1_face_1"}
        moneyMin={10_000}
        moneyMax={10_000}
        rank={100}
        supplies={[
          ...loadoutBinocular(),
          ...loadoutSvu(),
          ...loadoutColt1911(),
          ...loadoutCharacterFood(),
          ...loadoutCharacterDrugsElite(),
        ]}
      >
        <CharacterProfileCriticals />
        <StartDialog>jup_b4_monolith_squad_leader_start</StartDialog>
        <ActorDialog>jup_b4_monolith_squad_leader_need_help</ActorDialog>
        <ActorDialog>jup_b4_monolith_squad_leader_need_help_2</ActorDialog>
        <ActorDialog>jup_b4_monolith_squad_leader_pripyat_ready</ActorDialog>
        <ActorDialog>jup_b4_monolith_squad_leader_pripyat_how_are_you</ActorDialog>
        <ActorDialog>actor_break_dialog</ActorDialog>
      </SpecificCharacter>

      <SpecificCharacter
        id={"jup_b4_monolith_squad_leader_duty_skin"}
        class={"jup_b4_monolith_squad_leader_duty_skin"}
        name={"jup_b4_monolith_squad_leader_name"}
        icon={"ui_inGame2_Brodyaga_monolit"}
        community={communities.dolg}
        soundConfig={"characters_voice\\human_02\\stalker\\"}
        visual={"actors\\stalker_dolg\\stalker_dolg_2_face_1"}
        moneyMin={10_000}
        moneyMax={10_000}
        rank={100}
        supplies={[
          ...loadoutBinocular(),
          ...loadoutSvu(),
          ...loadoutColt1911(),
          ...loadoutCharacterFood(),
          ...loadoutCharacterDrugsElite(),
        ]}
      >
        <CharacterProfileCriticals />
        <StartDialog>jup_b4_monolith_squad_leader_start</StartDialog>
        <ActorDialog>jup_b4_monolith_squad_leader_wassup</ActorDialog>
        <ActorDialog>jup_b4_monolith_squad_leader_pripyat_group</ActorDialog>
        <ActorDialog>jup_b4_monolith_squad_leader_need_outfit</ActorDialog>
        <ActorDialog>jup_b4_monolith_squad_leader_goto_zulus</ActorDialog>
        <ActorDialog>jup_b4_duty_go_home</ActorDialog>
        <ActorDialog>jup_b4_monolith_squad_leader_about_stolen_items</ActorDialog>
        <ActorDialog>actor_break_dialog</ActorDialog>
      </SpecificCharacter>

      <SpecificCharacter
        id={"jup_b4_monolith_squad_leader_freedom_skin"}
        class={"jup_b4_monolith_squad_leader_freedom_skin"}
        name={"jup_b4_monolith_squad_leader_name"}
        icon={"ui_inGame2_Brodyaga_monolit"}
        community={communities.freedom}
        soundConfig={"characters_voice\\human_02\\stalker\\"}
        visual={"actors\\stalker_freedom\\stalker_freedom_2_face_1"}
        moneyMin={1500}
        moneyMax={2500}
        rank={100}
        supplies={[
          ...loadoutBinocular(),
          ...loadoutSvu(),
          ...loadoutColt1911(),
          ...loadoutCharacterFood(),
          ...loadoutCharacterDrugsElite(),
        ]}
      >
        <CharacterProfileCriticals />
        <StartDialog>jup_b4_monolith_squad_leader_start</StartDialog>
        <ActorDialog>jup_b4_monolith_squad_leader_wassup</ActorDialog>
        <ActorDialog>jup_b4_monolith_squad_leader_pripyat_group</ActorDialog>
        <ActorDialog>jup_b4_monolith_squad_leader_need_outfit</ActorDialog>
        <ActorDialog>jup_b4_monolith_squad_leader_goto_zulus</ActorDialog>
        <ActorDialog>jup_b4_freedom_go_home</ActorDialog>
        <ActorDialog>jup_b4_monolith_squad_leader_about_stolen_items</ActorDialog>
        <ActorDialog>actor_break_dialog</ActorDialog>
      </SpecificCharacter>

      <SpecificCharacter
        id={"jup_b4_monolith_squad_leader_duty_mon_skin"}
        class={"jup_b4_monolith_squad_leader_duty_mon_skin"}
        name={"jup_b4_monolith_squad_leader_name"}
        icon={"ui_inGame2_Brodyaga_monolit"}
        community={communities.dolg}
        soundConfig={"characters_voice\\human_02\\stalker\\"}
        visual={"actors\\stalker_monolith\\stalker_monolith_1_face_1"}
        moneyMin={1500}
        moneyMax={2500}
        rank={100}
        supplies={[
          ...loadoutBinocular(),
          ...loadoutSvu(),
          ...loadoutColt1911(),
          ...loadoutCharacterFood(),
          ...loadoutCharacterDrugsElite(),
        ]}
      >
        <CharacterProfileCriticals />
        <StartDialog>jup_b4_monolith_squad_leader_start</StartDialog>
        <ActorDialog>jup_b4_monolith_squad_leader_wassup</ActorDialog>
        <ActorDialog>jup_b4_monolith_squad_leader_pripyat_group</ActorDialog>
        <ActorDialog>jup_b4_monolith_squad_leader_need_outfit</ActorDialog>
        <ActorDialog>jup_b4_monolith_squad_leader_goto_zulus</ActorDialog>
        <ActorDialog>jup_b4_duty_go_home</ActorDialog>
        <ActorDialog>jup_b4_monolith_squad_leader_about_stolen_items</ActorDialog>
        <ActorDialog>actor_break_dialog</ActorDialog>
      </SpecificCharacter>

      <SpecificCharacter
        id={"jup_b4_monolith_squad_leader_freedom_mon_skin"}
        class={"jup_b4_monolith_squad_leader_freedom_mon_skin"}
        name={"jup_b4_monolith_squad_leader_name"}
        icon={"ui_inGame2_Brodyaga_monolit"}
        community={communities.freedom}
        soundConfig={"characters_voice\\human_02\\stalker\\"}
        visual={"actors\\stalker_monolith\\stalker_monolith_1_face_1"}
        moneyMin={1500}
        moneyMax={2500}
        rank={100}
        supplies={[
          ...loadoutBinocular(),
          ...loadoutSvu(),
          ...loadoutColt1911(),
          ...loadoutCharacterFood(),
          ...loadoutCharacterDrugsElite(),
        ]}
      >
        <CharacterProfileCriticals />
        <StartDialog>jup_b4_monolith_squad_leader_start</StartDialog>
        <ActorDialog>jup_b4_monolith_squad_leader_wassup</ActorDialog>
        <ActorDialog>jup_b4_monolith_squad_leader_pripyat_group</ActorDialog>
        <ActorDialog>jup_b4_monolith_squad_leader_need_outfit</ActorDialog>
        <ActorDialog>jup_b4_monolith_squad_leader_goto_zulus</ActorDialog>
        <ActorDialog>jup_b4_freedom_go_home</ActorDialog>
        <ActorDialog>jup_b4_monolith_squad_leader_about_stolen_items</ActorDialog>
        <ActorDialog>actor_break_dialog</ActorDialog>
      </SpecificCharacter>

      <SpecificCharacter
        id={"jup_b4_monolith_squad_soldier_1_monolith_skin"}
        class={"jup_b4_monolith_squad_soldier_1_monolith_skin"}
        name={"jup_b4_monolith_squad_soldier_1_name"}
        icon={profileIcon.ui_inGame2_monolit_3}
        community={communities.monolith}
        soundConfig={"characters_voice\\human_02\\monolith\\"}
        moneyMin={10000}
        moneyMax={10000}
        rank={40}
        supplies={[
          ...loadoutBinocular(),
          ...loadoutWincheaster1300(),
          ...loadoutBeretta(),
          ...loadoutRgd5Grenades(),
          ...loadoutCharacterItemsWithoutDetector(),
          ...loadoutCharacterFood(),
          ...loadoutCharacterDrugsExtended(),
        ]}
      >
        <CharacterProfileCriticals />
        <ActorDialog>actor_break_dialog</ActorDialog>
      </SpecificCharacter>

      <SpecificCharacter
        id={"jup_b4_monolith_squad_soldier_1_duty_skin"}
        class={"jup_b4_monolith_squad_soldier_1_duty_skin"}
        name={"jup_b4_monolith_squad_soldier_1_name"}
        icon={"ui_inGame2_Dolg_2"}
        community={communities.dolg}
        visual={"actors\\stalker_dolg\\stalker_dolg_2"}
        moneyMin={10000}
        moneyMax={10000}
        rank={40}
        supplies={[
          ...loadoutSpas12(),
          ...loadoutWalther(),
          ...loadoutRgd5Grenades(),
          ...loadoutCharacterItems(),
          ...loadoutCharacterFood(),
          ...loadoutCharacterDrugsExtended(),
        ]}
      >
        <CharacterProfileCriticals />
        <DefaultCharacterDialogs />
        <ActorDialog>jup_b4_duty_go_home</ActorDialog>
        <ActorDialog>actor_break_dialog</ActorDialog>
      </SpecificCharacter>

      <SpecificCharacter
        id={"jup_b4_monolith_squad_soldier_1_freedom_skin"}
        class={"jup_b4_monolith_squad_soldier_1_freedom_skin"}
        name={"jup_b4_monolith_squad_soldier_1_name"}
        icon={"ui_inGame2_Freedom_2"}
        community={communities.freedom}
        soundConfig={"characters_voice\\human_03\\freedom\\"}
        visual={"actors\\stalker_freedom\\stalker_freedom_2"}
        moneyMin={1500}
        moneyMax={2500}
        rank={40}
        supplies={[
          ...loadoutWincheaster1300(true),
          ...loadoutColt1911(),
          ...loadoutRgd5Grenades(),
          ...loadoutCharacterItems2(),
          ...loadoutCharacterFood(),
          ...loadoutCharacterDrugsExtended(),
        ]}
      >
        <CharacterProfileCriticals />
        <DefaultCharacterDialogs />
        <ActorDialog>jup_b4_freedom_go_home</ActorDialog>
        <ActorDialog>actor_break_dialog</ActorDialog>
      </SpecificCharacter>

      <SpecificCharacter
        id={"jup_b4_monolith_squad_soldier_2_monolith_skin"}
        class={"jup_b4_monolith_squad_soldier_2_monolith_skin"}
        name={"jup_b4_monolith_squad_soldier_2_name"}
        icon={profileIcon.ui_inGame2_monolit_3}
        community={communities.monolith}
        soundConfig={"characters_voice\\human_02\\monolith\\"}
        moneyMin={10000}
        moneyMax={10000}
        rank={40}
        supplies={[
          ...loadoutLr300(),
          ...loadoutColt1911(),
          ...loadoutRgd5Grenades(),
          ...loadoutCharacterItemsWithoutDetector(),
          ...loadoutCharacterFood(),
          ...loadoutCharacterDrugsExtended(),
        ]}
      >
        <CharacterProfileCriticals />
        <ActorDialog>actor_break_dialog</ActorDialog>
      </SpecificCharacter>

      <SpecificCharacter
        id={"jup_b4_monolith_squad_soldier_2_duty_skin"}
        class={"jup_b4_monolith_squad_soldier_2_duty_skin"}
        name={"jup_b4_monolith_squad_soldier_2_name"}
        icon={"ui_inGame2_Dolg_2"}
        community={communities.dolg}
        visual={"actors\\stalker_dolg\\stalker_dolg_2"}
        moneyMin={10000}
        moneyMax={10000}
        rank={40}
        supplies={[
          ...loadoutAbakan(),
          ...loadoutFort(),
          ...loadoutRgd5Grenades(),
          ...loadoutCharacterItems2(),
          ...loadoutCharacterFood(),
          ...loadoutCharacterDrugsExtended(),
        ]}
      >
        <CharacterProfileCriticals />
        <DefaultCharacterDialogs />
        <ActorDialog>jup_b4_duty_go_home</ActorDialog>
        <ActorDialog>actor_break_dialog</ActorDialog>
      </SpecificCharacter>

      <SpecificCharacter
        id={"jup_b4_monolith_squad_soldier_2_freedom_skin"}
        class={"jup_b4_monolith_squad_soldier_2_freedom_skin"}
        name={"jup_b4_monolith_squad_soldier_2_name"}
        icon={"ui_inGame2_Dolg_2"}
        community={communities.freedom}
        soundConfig={"characters_voice\\human_03\\freedom\\"}
        visual={"actors\\stalker_freedom\\stalker_freedom_2"}
        moneyMin={1500}
        moneyMax={2500}
        rank={40}
        supplies={[
          ...loadoutLr300({ silencer: true }),
          ...loadoutColt1911(),
          ...loadoutRgd5Grenades(),
          ...loadoutCharacterItems2(),
          ...loadoutCharacterFood(),
          ...loadoutCharacterDrugsExtended(),
        ]}
      >
        <CharacterProfileCriticals />
        <DefaultCharacterDialogs />
        <ActorDialog>jup_b4_freedom_go_home</ActorDialog>
        <ActorDialog>actor_break_dialog</ActorDialog>
      </SpecificCharacter>

      <SpecificCharacter
        id={"jup_b4_monolith_squad_soldier_3_monolith_skin"}
        class={"jup_b4_monolith_squad_soldier_3_monolith_skin"}
        name={"jup_b4_monolith_squad_soldier_3_name"}
        icon={"ui_inGame2_monolit_2"}
        community={communities.monolith}
        soundConfig={"characters_voice\\human_01\\monolith\\"}
        visual={"actors\\stalker_monolith\\stalker_monolith_2"}
        moneyMin={10000}
        moneyMax={10000}
        rank={40}
        supplies={[
          ...loadoutAk74(),
          ...loadoutPb(),
          ...loadoutRgd5Grenades(2),
          ...loadoutCharacterItemsWithoutDetector(),
          ...loadoutCharacterFood(),
          ...loadoutCharacterDrugsExtended(),
        ]}
      >
        <CharacterProfileCriticals />
        <ActorDialog>actor_break_dialog</ActorDialog>
      </SpecificCharacter>

      <SpecificCharacter
        id={"jup_b4_monolith_squad_soldier_3_duty_skin"}
        class={"jup_b4_monolith_squad_soldier_3_duty_skin"}
        name={"jup_b4_monolith_squad_soldier_3_name"}
        icon={"ui_inGame2_Dolg_2"}
        community={communities.dolg}
        soundConfig={"characters_voice\\human_01\\dolg\\"}
        visual={"actors\\stalker_dolg\\stalker_dolg_2"}
        moneyMin={10000}
        moneyMax={10000}
        rank={40}
        supplies={[
          ...loadoutAk74(),
          ...loadoutPb(),
          ...loadoutRgd5Grenades(2),
          ...loadoutCharacterItemsWithoutDetector(),
          ...loadoutCharacterFood(),
          ...loadoutCharacterDrugsExtended(),
        ]}
      >
        <CharacterProfileCriticals />
        <DefaultCharacterDialogs />
        <ActorDialog>jup_b4_duty_go_home</ActorDialog>
        <ActorDialog>actor_break_dialog</ActorDialog>
      </SpecificCharacter>

      <SpecificCharacter
        id={"jup_b4_monolith_squad_soldier_3_freedom_skin"}
        class={"jup_b4_monolith_squad_soldier_3_freedom_skin"}
        name={"jup_b4_monolith_squad_soldier_3_name"}
        icon={"ui_inGame2_Freedom_2"}
        community={communities.freedom}
        soundConfig={"characters_voice\\human_03\\freedom\\"}
        visual={"actors\\stalker_freedom\\stalker_freedom_2"}
        moneyMin={1500}
        moneyMax={2500}
        rank={40}
        supplies={[
          ...loadoutAk74(),
          ...loadoutPb(),
          ...loadoutRgd5Grenades(2),
          ...loadoutCharacterItemsWithoutDetector(),
          ...loadoutCharacterFood(),
          ...loadoutCharacterDrugsExtended(),
        ]}
      >
        <CharacterProfileCriticals />
        <DefaultCharacterDialogs />
        <ActorDialog>jup_b4_freedom_go_home</ActorDialog>
        <ActorDialog>actor_break_dialog</ActorDialog>
      </SpecificCharacter>

      <SpecificCharacter
        id={"jup_b4_monolith_squad_soldier_4_monolith_skin"}
        class={"jup_b4_monolith_squad_soldier_4_monolith_skin"}
        name={"jup_b4_monolith_squad_soldier_4_name"}
        icon={"ui_inGame2_monolit_2"}
        community={communities.monolith}
        soundConfig={"characters_voice\\human_01\\monolith\\"}
        visual={"actors\\stalker_monolith\\stalker_monolith_2"}
        moneyMin={10000}
        moneyMax={10000}
        rank={40}
        supplies={[
          ...loadoutMp5(),
          ...loadoutFort(),
          ...loadoutRgd5Grenades(2),
          ...loadoutCharacterItemsWithoutDetector(),
          ...loadoutCharacterFood(),
          ...loadoutCharacterDrugsExtended(),
        ]}
      >
        <CharacterProfileCriticals />
        <ActorDialog>actor_break_dialog</ActorDialog>
      </SpecificCharacter>

      <SpecificCharacter
        id={"jup_b4_monolith_squad_soldier_4_duty_skin"}
        class={"jup_b4_monolith_squad_soldier_4_duty_skin"}
        name={"jup_b4_monolith_squad_soldier_4_name"}
        icon={"ui_inGame2_Dolg_2"}
        community={communities.dolg}
        soundConfig={"characters_voice\\human_01\\dolg\\"}
        visual={"actors\\stalker_dolg\\stalker_dolg_2"}
        moneyMin={10000}
        moneyMax={10000}
        rank={40}
        supplies={[
          ...loadoutAk74(),
          ...loadoutFort(),
          ...loadoutRgd5Grenades(2),
          ...loadoutCharacterItemsWithoutDetector(),
          ...loadoutCharacterFood(),
          ...loadoutCharacterDrugsExtended(),
        ]}
      >
        <CharacterProfileCriticals />
        <DefaultCharacterDialogs />
        <ActorDialog>jup_b4_duty_go_home</ActorDialog>
        <ActorDialog>actor_break_dialog</ActorDialog>
      </SpecificCharacter>

      <SpecificCharacter
        id={"jup_b4_monolith_squad_soldier_4_freedom_skin"}
        class={"jup_b4_monolith_squad_soldier_4_freedom_skin"}
        name={"jup_b4_monolith_squad_soldier_4_name"}
        icon={"ui_inGame2_Freedom_2"}
        community={communities.freedom}
        soundConfig={"characters_voice\\human_03\\freedom\\"}
        visual={"actors\\stalker_freedom\\stalker_freedom_2"}
        moneyMin={1500}
        moneyMax={2500}
        rank={40}
        supplies={[
          ...loadoutMp5({ silencer: true }),
          ...loadoutHpsa(),
          ...loadoutRgd5Grenades(2),
          ...loadoutCharacterItemsWithoutDetector(),
          ...loadoutCharacterFood(),
          ...loadoutCharacterDrugsExtended(),
        ]}
      >
        <CharacterProfileCriticals />
        <DefaultCharacterDialogs />
        <ActorDialog>jup_b4_freedom_go_home</ActorDialog>
        <ActorDialog>actor_break_dialog</ActorDialog>
      </SpecificCharacter>

      <SpecificCharacter
        id={"jup_b4_monolith_squad_soldier_5_monolith_skin"}
        class={"jup_b4_monolith_squad_soldier_5_monolith_skin"}
        name={"jup_b4_monolith_squad_soldier_5_name"}
        icon={"ui_inGame2_monolit_2"}
        community={communities.monolith}
        soundConfig={"characters_voice\\human_01\\monolith\\"}
        visual={"actors\\stalker_monolith\\stalker_monolith_2"}
        moneyMin={10000}
        moneyMax={10000}
        rank={40}
        supplies={[
          ...loadoutAk74(),
          ...loadoutHpsa(),
          ...loadoutRgd5Grenades(2),
          ...loadoutCharacterItemsWithoutDetector(),
          ...loadoutCharacterFood(),
          ...loadoutCharacterDrugsExtended(),
        ]}
      >
        <CharacterProfileCriticals />
        <ActorDialog>actor_break_dialog</ActorDialog>
      </SpecificCharacter>

      <SpecificCharacter
        id={"jup_b4_monolith_squad_soldier_5_duty_skin"}
        class={"jup_b4_monolith_squad_soldier_5_duty_skin"}
        name={"jup_b4_monolith_squad_soldier_5_name"}
        icon={"ui_inGame2_Dolg_2"}
        community={communities.dolg}
        soundConfig={"characters_voice\\human_01\\dolg\\"}
        visual={"actors\\stalker_dolg\\stalker_dolg_2"}
        moneyMin={10000}
        moneyMax={10000}
        rank={40}
        supplies={[
          ...loadoutAk74(),
          ...loadoutFort(),
          ...loadoutRgd5Grenades(2),
          ...loadoutCharacterItems2(),
          ...loadoutCharacterFood(),
          ...loadoutCharacterDrugsExtended(),
        ]}
      >
        <CharacterProfileCriticals />
        <DefaultCharacterDialogs />
        <ActorDialog>jup_b4_duty_go_home</ActorDialog>
        <ActorDialog>actor_break_dialog</ActorDialog>
      </SpecificCharacter>

      <SpecificCharacter
        id={"jup_b4_monolith_squad_soldier_5_freedom_skin"}
        class={"jup_b4_monolith_squad_soldier_5_freedom_skin"}
        name={"jup_b4_monolith_squad_soldier_5_name"}
        icon={"ui_inGame2_Freedom_2"}
        community={communities.freedom}
        soundConfig={"characters_voice\\human_03\\freedom\\"}
        visual={"actors\\stalker_freedom\\stalker_freedom_2"}
        moneyMin={1500}
        moneyMax={2500}
        rank={40}
        supplies={[
          ...loadoutAk74(),
          ...loadoutHpsa(),
          ...loadoutRgd5Grenades(2),
          ...loadoutCharacterItems2(),
          ...loadoutCharacterFood(),
          ...loadoutCharacterDrugsExtended(),
        ]}
      >
        <CharacterProfileCriticals />
        <DefaultCharacterDialogs />
        <ActorDialog>jup_b4_freedom_go_home</ActorDialog>
        <ActorDialog>actor_break_dialog</ActorDialog>
      </SpecificCharacter>

      <SpecificCharacter
        id={"jup_b4_freedom_help"}
        class={"jup_b4_freedom_help"}
        name={GENERATE_STALKER_NAME}
        icon={"ui_inGame2_Freedom_2_mask"}
        community={communities.freedom}
        soundConfig={"characters_voice\\human_01\\freedom\\"}
        visual={"actors\\stalker_freedom\\stalker_freedom_2_mask"}
        moneyMin={1500}
        moneyMax={2500}
        rank={35}
        supplies={[
          ...loadoutL85(),
          ...loadoutBeretta(),
          ...loadoutRgd5Grenades(2),
          ...loadoutCharacterItems2(),
          ...loadoutCharacterFood(),
          ...loadoutCharacterDrugsExtended(),
        ]}
      >
        <CharacterProfileCriticals />
        <ActorDialog>jup_b4_freedom_go_home</ActorDialog>
        <ActorDialog>actor_break_dialog</ActorDialog>
      </SpecificCharacter>

      <SpecificCharacter
        id={"jup_b4_duty_help"}
        class={"jup_b4_duty_help"}
        name={GENERATE_LIEUTENANT_NAME}
        icon={"ui_inGame2_Dolg_2"}
        community={communities.dolg}
        visual={"actors\\stalker_dolg\\stalker_dolg_2"}
        moneyMin={1500}
        moneyMax={2500}
        rank={40}
        supplies={[
          ...loadoutAbakan(),
          ...loadoutPm(),
          ...loadoutRgd5Grenades(2),
          ...loadoutCharacterItems2(),
          ...loadoutCharacterFood(),
          ...loadoutCharacterDrugsExtended(),
        ]}
      >
        <CharacterProfileCriticals />
        <ActorDialog>jup_b4_duty_go_home</ActorDialog>
        <ActorDialog>actor_break_dialog</ActorDialog>
      </SpecificCharacter>

      <SpecificCharacter
        id={"jup_b4_freedom_leader"}
        class={"jup_b4_freedom_leader"}
        name={GENERATE_STALKER_NAME}
        icon={"ui_inGame2_Freedom_3"}
        community={communities.freedom}
        soundConfig={"characters_voice\\human_02\\freedom\\"}
        visual={"actors\\stalker_freedom\\stalker_freedom_3"}
        moneyMin={1500}
        moneyMax={2500}
        rank={55}
        supplies={[
          ...loadoutTorch(),
          ...loadoutLr300({ scope: true, silencer: true, ap: true }),
          ...loadoutBeretta(),
          ...loadoutF1Grenades(),
          ...loadoutCharacterItems3(),
          ...loadoutCharacterFood(),
          ...loadoutCharacterDrugsAdvanced(),
          ...loadoutCharacterDrugsScientific(),
        ]}
      >
        <CharacterProfileCriticals />
        <ActorDialog>jup_b4_freedom_go_home</ActorDialog>
        <ActorDialog>actor_break_dialog</ActorDialog>
      </SpecificCharacter>

      <SpecificCharacter
        id={"jup_b4_duty_leader"}
        class={"jup_b4_duty_leader"}
        name={GENERATE_CAPTAIN_NAME}
        icon={"ui_inGame2_Dolg_3"}
        community={communities.dolg}
        soundConfig={"characters_voice\\human_01\\dolg\\"}
        visual={"actors\\stalker_dolg\\stalker_dolg_3"}
        moneyMin={2500}
        moneyMax={5000}
        rank={60}
        supplies={[
          ...loadoutGroza(),
          ...loadoutPm(),
          ...loadoutF1Grenades(3),
          ...loadoutCharacterItems3(),
          ...loadoutCharacterFood(),
          ...loadoutCharacterDrugsAdvanced(),
          ...loadoutCharacterDrugsMilitary(),
        ]}
      >
        <CharacterProfileCriticals />
        <ActorDialog>jup_b4_duty_go_home</ActorDialog>
        <ActorDialog>actor_break_dialog</ActorDialog>
      </SpecificCharacter>

      <SpecificCharacter
        id={"jup_b6_scientist_biochemist"}
        class={"jup_b6_scientist_biochemist"}
        name={"jup_b6_scientist_biochemist"}
        icon={"ui_inGame2_Ozerskiy"}
        community={communities.ecolog}
        soundConfig={"characters_voice\\human_02\\stalker\\"}
        visual={"actors\\stalker_ucheniy\\stalker_ucheniy_1_face_2"}
        moneyMin={10_000}
        moneyMax={10_000}
        rank={0}
      >
        <CharacterProfileCriticals />
        <StartDialog>jup_b16_biochemist_oasis_start</StartDialog>
        <ActorDialog>jup_b6_scientist_biochemist_b1_psi_emission_dialog</ActorDialog>
        <ActorDialog>jup_b16_biochemist_oasis_proof</ActorDialog>
        <ActorDialog>jup_b16_biochemist_oasis_give_artefact</ActorDialog>
        <ActorDialog>jup_b6_scientist_biochemist_hypotheses_confirmed</ActorDialog>
        <ActorDialog>jup_b6_scientist_biochemist_anomalous_plant</ActorDialog>
        <ActorDialog>jup_b6_scientist_biochemist_soldier_outfit</ActorDialog>
        <ActorDialog>jup_b6_scientist_biochemist_hypotheses_about</ActorDialog>
        <ActorDialog>jup_b6_scientist_biochemist_hypotheses_volunteer</ActorDialog>
        <ActorDialog>jup_b6_scientist_biochemist_anomalous_grove</ActorDialog>
        <ActorDialog>jup_b16_biochemist_oasis_legend</ActorDialog>
        <ActorDialog>jup_b6_scientist_biochemist_about_scrutiny</ActorDialog>
        <ActorDialog>jup_b6_scientist_biochemist_about_scrutiny_learned</ActorDialog>
        <ActorDialog>jup_b6_scientist_biochemist_stalker_assistant_rival</ActorDialog>
        <ActorDialog>jup_b6_scientist_biochemist_aproach</ActorDialog>
        <ActorDialog>jup_b6_scientist_biochemist_about_mercs</ActorDialog>
        <ActorDialog>jup_b6_scientist_biochemist_about_scientists</ActorDialog>
        <ActorDialog>actor_break_dialog</ActorDialog>
      </SpecificCharacter>

      <SpecificCharacter
        id={"jup_b6_scientist_nuclear_physicist"}
        class={"jup_b6_scientist_nuclear_physicist"}
        name={"jup_b6_scientist_nuclear_physicist"}
        icon={"ui_inGame2_German"}
        community={communities.ecolog}
        soundConfig={"characters_voice\\human_02\\stalker\\"}
        visual={"actors\\stalker_ucheniy\\stalker_ucheniy_1_face_1"}
        moneyMin={100_000}
        moneyMax={100_000}
        moneyInfinite={true}
        rank={0}
      >
        <CharacterProfileCriticals />
        <StartDialog>jup_b6_scientist_nuclear_physicist_start</StartDialog>
        <ActorDialog>jup_b16_nuclear_physicist_oasis_legend</ActorDialog>
        <ActorDialog>jup_b6_scientist_nuclear_physicist_soldier_outfit</ActorDialog>
        <ActorDialog>jup_b6_scientist_physicist_b1_variable_psi_emission_dialog</ActorDialog>
        <ActorDialog>jup_b6_scientist_physicist_b1_variable_psi_emission_dialog_complete</ActorDialog>
        <ActorDialog>jup_b6_scientist_nuclear_physicist_scan_anomaly</ActorDialog>
        <ActorDialog>jup_b6_scientist_nuclear_physicist_scan_anomaly_complete</ActorDialog>
        <ActorDialog>jup_b6_scientist_nuclear_physicist_b32_scanner_placed</ActorDialog>
        <ActorDialog>jup_b6_scientist_nuclear_physicist_b32_artefact_spawn</ActorDialog>
        <ActorDialog>jup_b6_scientist_nuclear_physicist_results</ActorDialog>
        <ActorDialog>jup_b6_scientist_nuclear_physicist_bubble</ActorDialog>
        <ActorDialog>jup_b6_scientist_nuclear_physicist_jupiter_products</ActorDialog>
        <ActorDialog>jup_b6_scientist_nuclear_physicist_jupiter_docs</ActorDialog>
        <ActorDialog>jup_b6_scientist_nuclear_physicist_guards</ActorDialog>
        <ActorDialog>jup_b6_scientist_nuclear_physicist_found_guards</ActorDialog>
        <ActorDialog>jup_b6_scientist_nuclear_physicist_gauss_rifle_docs</ActorDialog>
        <ActorDialog>jup_b6_scientist_nuclear_physicist_jupiter_products_info</ActorDialog>
        <ActorDialog>jup_b6_scientist_nuclear_physicist_about_halfartefact_zat_b14</ActorDialog>
        <ActorDialog>jup_b6_scientist_nuclear_physicist_about_mercs</ActorDialog>
        <ActorDialog>jup_b6_scientist_nuclear_physicist_about_scientists</ActorDialog>
        <ActorDialog>jup_b6_scientist_nuclear_physicist_employ_stalkers</ActorDialog>
        <ActorDialog>jup_b6_scientist_nuclear_physicist_employ_stalkers_done</ActorDialog>
        <ActorDialog>actor_break_dialog</ActorDialog>
      </SpecificCharacter>

      <SpecificCharacter
        id={"jup_b9_shliachin"}
        class={"jup_b9_shliachin"}
        name={"jup_b9_shliachin_name"}
        icon={"ui_inGame2_Soldier_2"}
        community={communities.army}
        soundConfig={"characters_voice\\human_01\\military\\"}
        visual={"actors\\stalker_soldier\\stalker_soldier_2"}
        moneyMin={100_000}
        moneyMax={100_000}
        moneyInfinite={true}
        rank={50}
        supplies={[
          ...loadoutAk74({ ap: true }),
          ...loadoutFort(),
          ...loadoutRgd5Grenades(2),
          ...loadoutCharacterItemsWithoutDetector(),
          ...loadoutCharacterFood(),
          ...loadoutCharacterDrugsExtended(),
          ...loadoutCharacterDrugsMilitary(),
        ]}
      >
        <CharacterProfileCriticals />
      </SpecificCharacter>

      <SpecificCharacter
        id={"jup_b10_stalker_drunk"}
        class={"jup_b10_stalker_drunk"}
        name={"jup_b10_stalker_drunk"}
        icon={"ui_inGame2_neutral_1"}
        community={communities.stalker}
        soundConfig={"characters_voice\\human_02\\bandit\\"}
        visual={"actors\\stalker_neutral\\stalker_neutral_1"}
        rank={20}
        supplies={[
          { section: food.vodka, count: 3 },
          { section: food.conserva },
          ...loadoutPm(),
          ...loadoutRgd5Grenades(2),
          ...loadoutCharacterItems(),
          ...loadoutCharacterFood(),
          ...loadoutCharacterDrugsBase(),
        ]}
      >
        <CharacterProfileCriticals />
        <DefaultCharacterDialogs />
      </SpecificCharacter>

      <SpecificCharacter
        id={"jup_b10_stalker_drunk_dead"}
        class={"jup_b10_stalker_drunk_dead"}
        name={"jup_b10_stalker_drunk"}
        icon={"ui_inGame2_neutral_1"}
        community={communities.stalker}
        soundConfig={"characters_voice\\human_02\\bandit\\"}
        visual={"actors\\stalker_neutral\\stalker_neutral_1"}
        rank={20}
      >
        <CharacterProfileCriticals />
        <DefaultCharacterDialogs />
      </SpecificCharacter>

      <SpecificCharacter
        id={"jup_b217_stalker_tech"}
        class={"jup_b217_stalker_tech"}
        name={"jup_b217_stalker_tech"}
        icon={"ui_inGame2_Azot"}
        community={communities.stalker}
        soundConfig={"characters_voice\\human_01\\dolg\\"}
        visual={"actors\\stalker_neutral\\stalker_neutral_nauchniy_face_3"}
        mechanicMode={true}
        rank={50}
        moneyMin={10_000}
        moneyMax={10_000}
        supplies={[
          ...loadoutFort(),
          ...loadoutF1Grenades(),
          ...loadoutCharacterItems2(),
          ...loadoutCharacterFood(),
          ...loadoutCharacterDrugsAdvanced(),
        ]}
      >
        <CharacterProfileCriticals />
        <StartDialog>jup_b217_stalker_tech_start</StartDialog>
        <ActorDialog>jup_b217_stalker_tech_blackbox</ActorDialog>
        <ActorDialog>jup_b217_stalker_tech_main_info</ActorDialog>
        <ActorDialog>jup_b217_stalker_tech_minor_info</ActorDialog>
        <ActorDialog>jup_b217_stalker_tech_ufo_memory_repair</ActorDialog>
        <ActorDialog>jup_b217_stalker_tech_ufo_memory_repaired</ActorDialog>
        <ActorDialog>jup_b217_stalker_tech_b202_about_stole</ActorDialog>
        <ActorDialog>jup_b217_stalker_tech_duty_founder_pda</ActorDialog>
        <ActorDialog>jup_b217_stalker_tech_b4_monolith_squad_dialog</ActorDialog>
        <ActorDialog>jup_b217_stalker_tech_jup_b207_pda_sell</ActorDialog>
        <ActorDialog>jup_b217_stalker_tech_b33_open_package_dialog</ActorDialog>
        <ActorDialog>jup_b217_stalker_tech_about_sci_guards</ActorDialog>
        <ActorDialog>jup_b217_stalker_tech_about_sci_helpers</ActorDialog>
        <ActorDialog>jup_b217_stalker_tech_materials_about</ActorDialog>
        <ActorDialog>jup_b217_stalker_tech_materials_volunteer</ActorDialog>
        <ActorDialog>jup_b217_stalker_tech_materials_where_from</ActorDialog>
        <ActorDialog>jup_b217_stalker_tech_materials_what_for</ActorDialog>
        <ActorDialog>jup_b217_stalker_tech_materials_transfer_some</ActorDialog>
        <ActorDialog>jup_b217_stalker_tech_materials_transfer_all</ActorDialog>
        <ActorDialog>jup_b217_stalker_tech_instruments</ActorDialog>
        <ActorDialog>jup_b217_stalker_tech_instruments_work</ActorDialog>
        <ActorDialog>jup_b217_stalker_tech_about_underpass</ActorDialog>
        <ActorDialog>jup_b217_stalker_tech_drunk</ActorDialog>
        <ActorDialog>actor_break_dialog</ActorDialog>
      </SpecificCharacter>

      <SpecificCharacter
        id={"jup_b220_trapper"}
        class={"jup_b220_trapper"}
        name={"jup_b220_trapper"}
        icon={"ui_inGame2_Zveroboy"}
        community={communities.stalker}
        soundConfig={"characters_voice\\human_02\\stalker\\"}
        visual={"actors\\stalker_neutral\\stalker_neutral_2_face_7"}
        rank={70}
        moneyMin={100_000}
        moneyMax={100_000}
        supplies={[
          ...loadoutWincheaster1300(),
          ...loadoutColt1911(),
          ...loadoutCharacterItems3(),
          ...loadoutCharacterFood(),
          ...loadoutCharacterDrugsElite(),
        ]}
      >
        <CharacterProfileCriticals />
        <StartDialog>jup_b220_trapper_start</StartDialog>
        <ActorDialog>jup_b220_trapper_about_himself</ActorDialog>
        <ActorDialog>jup_b220_trapper_about_retire</ActorDialog>
        <ActorDialog>jup_b220_trapper_about_chimera</ActorDialog>
        <ActorDialog>jup_b220_trapper_zaton_chimera_hunted</ActorDialog>
        <ActorDialog>jup_b220_trapper_bloodsucker_lair_hunted</ActorDialog>
        <ActorDialog>jup_b220_trapper_jupiter_chimera_hunt</ActorDialog>
        <ActorDialog>jup_b220_trapper_burers_hunt</ActorDialog>
        <ActorDialog>jup_b220_trapper_swamp_bloodsuckers_hunt</ActorDialog>
        <ActorDialog>jup_b220_trapper_burers_hunted</ActorDialog>
        <ActorDialog>jup_b220_trapper_swamp_bloodsuckers_hunted</ActorDialog>
        <ActorDialog>jup_b220_trapper_jupiter_chimera_hunted</ActorDialog>
        <ActorDialog>jup_b220_trapper_about_stolen_items</ActorDialog>
        <ActorDialog>jup_b220_trapper_about_mutants</ActorDialog>
        <ActorDialog>actor_break_dialog</ActorDialog>
      </SpecificCharacter>

      <SpecificCharacter
        id={"jup_b6_scientist_tech"}
        class={"jup_b6_scientist_tech"}
        name={"jup_b6_scientist_novikov"}
        icon={"ui_inGame2_Novikov"}
        community={communities.ecolog}
        soundConfig={"characters_voice\\human_02\\stalker\\"}
        visual={"actors\\stalker_nebo\\stalker_nebo_2_face_1"}
        mechanicMode={true}
        moneyMin={10_000}
        moneyMax={10_000}
      >
        <CharacterProfileCriticals />
        <StartDialog>jup_b6_scientist_medic_start</StartDialog>
        <ActorDialog>jup_b6_scientist_medic_soldier_outfit</ActorDialog>
        <ActorDialog>jup_b6_scientist_tech_b1_psi_emission_dialog</ActorDialog>
        <ActorDialog>jup_b6_scientist_medic_b32_give_scanner</ActorDialog>
        <ActorDialog>jup_b6_scientist_medic_aproach</ActorDialog>
        <ActorDialog>jup_b6_scientist_medic_ufo_memory_repair</ActorDialog>
        <ActorDialog>jup_b6_scientist_medic_ufo_memory_repaired</ActorDialog>
        <ActorDialog>jup_b6_scientist_tech_zat_b30_actor_bring_detectors</ActorDialog>
        <ActorDialog>jup_b6_scientist_tech_zat_b30_actor_about_owl</ActorDialog>
        <ActorDialog>jup_b6_scientist_tech_b33_about_snags_container</ActorDialog>
        <ActorDialog>jup_b6_scientist_tech_blackbox</ActorDialog>
        <ActorDialog>jup_b6_scientist_tech_csky_outfit</ActorDialog>
        <ActorDialog>jup_b6_scientist_tech_about_new_upgrade</ActorDialog>
        <ActorDialog>jup_b6_scientist_tech_about_mercs</ActorDialog>
        <ActorDialog>jup_b6_scientist_tech_about_scientists</ActorDialog>
        <ActorDialog>actor_break_dialog</ActorDialog>
      </SpecificCharacter>

      <SpecificCharacter
        id={"jup_b1_stalker_1"}
        class={"jup_b1_stalker_1"}
        name={"jup_b1_stalker_1"}
        icon={"ui_inGame2_neutral_2_mask"}
        community={communities.stalker}
        soundConfig={"characters_voice\\human_01\\stalker\\"}
        visual={"actors\\stalker_neutral\\stalker_neutral_2_mask"}
        rank={50}
        supplies={[
          { section: "anomaly_scaner" },
          ...loadoutDetectorElite(),
          ...loadoutAk74(),
          ...loadoutPm(),
          ...loadoutF1Grenades(),
          ...loadoutCharacterItemsWithoutDetector(),
          ...loadoutCharacterFood(),
          ...loadoutCharacterDrugsElite(),
          ...loadoutCharacterDrugsScientific(),
        ]}
      >
        <CharacterProfileCriticals />
        <StartDialog>jup_b1_stalkers_about_tunnel_dialog</StartDialog>
        <ActorDialog>jup_b1_stalker_lead_info</ActorDialog>
        <ActorDialog>jup_b1_stalkers_about_tunnel_dialog_after_end_1</ActorDialog>
        <ActorDialog>jup_b1_stalkers_about_tunnel_dialog_go_to</ActorDialog>
        <ActorDialog>jup_b1_stalkers_about_tunnel_dialog_start_miss</ActorDialog>
        <ActorDialog>jup_b1_stalkers_about_tunnel_dialog_after_end_go_home</ActorDialog>
        <ActorDialog>jup_b47_ask_topol_about_guard</ActorDialog>
        <ActorDialog>jup_b1_stalker_about_scrutiny</ActorDialog>
        <ActorDialog>jup_b1_stalker_about_scrutiny_2</ActorDialog>
        <ActorDialog>jup_b1_stalker_about_scrutiny_3</ActorDialog>
        <ActorDialog>jup_b1_stalker_1_come_with_me</ActorDialog>
        <ActorDialog>actor_break_dialog</ActorDialog>
      </SpecificCharacter>

      <SpecificCharacter
        id={"jup_b1_stalker_2"}
        class={"jup_b1_stalker_2"}
        name={"jup_b1_stalker_2"}
        icon={"ui_inGame2_neutral_2"}
        community={communities.stalker}
        soundConfig={"characters_voice\\human_01\\stalker\\"}
        visual={"actors\\stalker_neutral\\stalker_neutral_2"}
        rank={40}
        supplies={[
          { section: "anomaly_scaner" },
          ...loadoutWincheaster1300(),
          ...loadoutBeretta(),
          ...loadoutRgd5Grenades(),
          ...loadoutCharacterItemsWithoutDetector(),
          ...loadoutCharacterFood(),
          ...loadoutCharacterDrugsElite(),
          ...loadoutCharacterDrugsScientific(),
        ]}
      >
        <CharacterProfileCriticals />
        <DefaultCharacterDialogsNoGuide />
        <ActorDialog>jup_b1_stalkers_about_tunnel_dialog_ab_tu_2</ActorDialog>
        <ActorDialog>jup_b1_stalkers_about_tunnel_dialog_after_end_2</ActorDialog>
        <ActorDialog>jup_b1_stalkers_about_tunnel_dialog_after_end_go_home</ActorDialog>
        <ActorDialog>jup_b1_stalker_about_scrutiny</ActorDialog>
        <ActorDialog>jup_b1_stalker_about_scrutiny_2</ActorDialog>
        <ActorDialog>jup_b1_stalker_about_scrutiny_3</ActorDialog>
        <ActorDialog>actor_break_dialog</ActorDialog>
      </SpecificCharacter>

      <SpecificCharacter
        id={"jup_b1_stalker_3"}
        class={"jup_b1_stalker_3"}
        name={"jup_b1_stalker_3"}
        icon={"ui_inGame2_neutral_2"}
        community={communities.stalker}
        soundConfig={"characters_voice\\human_03\\stalker\\"}
        visual={"actors\\stalker_neutral\\stalker_neutral_2"}
        rank={40}
        supplies={[
          { section: "anomaly_scaner" },
          ...loadoutAk74u(),
          ...loadoutFort(),
          ...loadoutRgd5Grenades(),
          ...loadoutCharacterItemsWithoutDetector(),
          ...loadoutCharacterFood(),
          ...loadoutCharacterDrugsElite(),
          ...loadoutCharacterDrugsScientific(),
        ]}
      >
        <CharacterProfileCriticals />
        <DefaultCharacterDialogsNoGuide />
        <ActorDialog>jup_b1_stalkers_about_tunnel_dialog_ab_tu_3</ActorDialog>
        <ActorDialog>jup_b1_stalkers_about_tunnel_dialog_after_end_3</ActorDialog>
        <ActorDialog>jup_b1_stalkers_about_tunnel_dialog_after_end_go_home</ActorDialog>
        <ActorDialog>jup_b1_stalker_about_scrutiny</ActorDialog>
        <ActorDialog>jup_b1_stalker_about_scrutiny_2</ActorDialog>
        <ActorDialog>jup_b1_stalker_about_scrutiny_3</ActorDialog>
        <ActorDialog>actor_break_dialog</ActorDialog>
      </SpecificCharacter>

      <SpecificCharacter
        id={"jup_b1_stalker_4"}
        class={"jup_b1_stalker_4"}
        name={"jup_b1_stalker_4"}
        icon={"ui_inGame2_neutral_2"}
        community={communities.stalker}
        soundConfig={"characters_voice\\human_02\\stalker\\"}
        visual={"actors\\stalker_neutral\\stalker_neutral_2"}
        rank={30}
        supplies={[
          { section: "anomaly_scaner" },
          ...loadoutAk74u(),
          ...loadoutFort(),
          ...loadoutRgd5Grenades(),
          ...loadoutCharacterItemsWithoutDetector(),
          ...loadoutCharacterFood(),
          ...loadoutCharacterDrugsElite(),
          ...loadoutCharacterDrugsScientific(),
        ]}
      >
        <CharacterProfileCriticals />
        <DefaultCharacterDialogsNoGuide />
        <ActorDialog>jup_b1_stalkers_about_tunnel_dialog_ab_tu_4</ActorDialog>
        <ActorDialog>jup_b1_stalkers_about_tunnel_dialog_after_end_4</ActorDialog>
        <ActorDialog>jup_b1_stalkers_about_tunnel_dialog_after_end_go_home</ActorDialog>
        <ActorDialog>jup_b1_stalker_about_scrutiny</ActorDialog>
        <ActorDialog>jup_b1_stalker_about_scrutiny_2</ActorDialog>
        <ActorDialog>jup_b1_stalker_about_scrutiny_3</ActorDialog>
        <ActorDialog>actor_break_dialog</ActorDialog>
      </SpecificCharacter>

      <SpecificCharacter
        id={"jup_b1_pro_stalker_1"}
        class={"jup_b1_pro_stalker_1"}
        name={"jup_b1_stalker_1"}
        icon={"ui_inGame2_neutral_4"}
        community={communities.ecolog}
        soundConfig={"characters_voice\\human_01\\stalker\\"}
        visual={"actors\\stalker_neutral\\stalker_neutral_4"}
        rank={60}
        supplies={[
          { section: "anomaly_scaner" },
          ...loadoutDetectorScientific(),
          ...loadoutG36({ ap: true }),
          ...loadoutUsp({ ap: true }),
          ...loadoutF1Grenades(),
          ...loadoutCharacterItemsWithoutDetector(),
          ...loadoutCharacterFood(),
          ...loadoutCharacterDrugsElite(),
          ...loadoutCharacterDrugsScientific(),
        ]}
      >
        <CharacterProfileCriticals />
        <StartDialog>jup_b1_stalkers_about_tunnel_dialog</StartDialog>
        <ActorDialog>jup_b1_stalker_squad_thanks</ActorDialog>
        <ActorDialog>jup_b1_stalker_lead_info</ActorDialog>
        <ActorDialog>jup_b47_ask_topol_about_guard</ActorDialog>
        <ActorDialog>jup_b1_stalker_1_come_with_me</ActorDialog>
        <ActorDialog>actor_break_dialog</ActorDialog>
      </SpecificCharacter>

      <SpecificCharacter
        id={"jup_b1_pro_stalker_2"}
        class={"jup_b1_pro_stalker_2"}
        name={"jup_b1_stalker_2"}
        icon={profileIcon.ui_inGame2_neutral_3}
        community={communities.ecolog}
        soundConfig={"characters_voice\\human_03\\stalker\\"}
        rank={50}
        supplies={[
          ...loadoutSpas12(true),
          ...loadoutUsp(),
          ...loadoutF1Grenades(2),
          ...loadoutCharacterItemsWithoutDetector(),
          ...loadoutCharacterFood(),
          ...loadoutCharacterDrugsElite(),
          ...loadoutCharacterDrugsScientific(),
        ]}
      >
        <CharacterProfileCriticals />
        <ActorDialog>actor_break_dialog</ActorDialog>
      </SpecificCharacter>

      <SpecificCharacter
        id={"jup_b1_pro_stalker_3"}
        class={"jup_b1_pro_stalker_3"}
        name={"jup_b1_stalker_3"}
        icon={"ui_inGame2_neutral_nauchniy"}
        community={communities.ecolog}
        soundConfig={"characters_voice\\human_03\\stalker\\"}
        visual={"actors\\stalker_neutral\\stalker_neutral_nauchniy"}
        rank={45}
        supplies={[
          ...loadoutLr300({ ap: true, scope: true }),
          ...loadoutBeretta(),
          ...loadoutF1Grenades(),
          ...loadoutCharacterItemsWithoutDetector(),
          ...loadoutCharacterFood(),
          ...loadoutCharacterDrugsElite(),
          ...loadoutCharacterDrugsScientific(),
        ]}
      >
        <CharacterProfileCriticals />
        <ActorDialog>actor_break_dialog</ActorDialog>
      </SpecificCharacter>

      <SpecificCharacter
        id={"jup_b1_pro_stalker_4"}
        class={"jup_b1_pro_stalker_4"}
        name={"jup_b1_stalker_4"}
        icon={"ui_inGame2_neutral_nauchniy"}
        community={communities.ecolog}
        soundConfig={"characters_voice\\human_02\\stalker\\"}
        visual={"actors\\stalker_neutral\\stalker_neutral_nauchniy"}
        rank={40}
        supplies={[
          ...loadoutLr300({ ap: true }),
          ...loadoutBeretta(),
          ...loadoutF1Grenades(),
          ...loadoutCharacterItemsWithoutDetector(),
          ...loadoutCharacterFood(),
          ...loadoutCharacterDrugsElite(),
          ...loadoutCharacterDrugsScientific(),
        ]}
      >
        <CharacterProfileCriticals />
        <ActorDialog>actor_break_dialog</ActorDialog>
      </SpecificCharacter>

      <SpecificCharacter
        id={"jup_b6_stalker_assaulter"}
        class={"jup_b6_stalker_assaulter"}
        name={"st_jup_a12_stalker_assaulter"}
        icon={profileIcon.ui_inGame2_neutral_3}
        community={communities.stalker}
        soundConfig={"characters_voice\\human_03\\stalker\\"}
        rank={40}
        moneyMin={1000}
        moneyMax={5000}
        supplies={[
          { section: "anomaly_scaner" },
          ...loadoutDetectorElite(),
          ...loadoutSpas12(true),
          ...loadoutColt1911(),
          ...loadoutRgd5Grenades(2),
          ...loadoutCharacterItemsWithoutDetector(),
          ...loadoutCharacterFood(),
          ...loadoutCharacterDrugsAdvanced(),
          ...loadoutCharacterDrugsMilitary(),
        ]}
      >
        <CharacterProfileCriticals />
        <DefaultCharacterDialogs />
        <ActorDialog>jup_b1_stalker_about_scrutiny</ActorDialog>
        <ActorDialog>jup_b1_stalker_about_scrutiny_2</ActorDialog>
        <ActorDialog>jup_b1_stalker_about_scrutiny_3</ActorDialog>
        <ActorDialog>jup_a12_stalker_assaulter_after_scene_actor_dialog</ActorDialog>
        <ActorDialog>actor_break_dialog</ActorDialog>
      </SpecificCharacter>

      <SpecificCharacter
        id={"jup_b6_stalker_diplomat"}
        class={"jup_b6_stalker_diplomat"}
        name={"st_jup_a12_stalker_diplomat"}
        icon={"ui_inGame2_neutral_2_mask"}
        community={communities.stalker}
        soundConfig={"characters_voice\\human_01\\stalker\\"}
        visual={"actors\\stalker_neutral\\stalker_neutral_2_mask"}
        rank={30}
        moneyMin={1000}
        moneyMax={5000}
        supplies={[
          { section: "anomaly_scaner" },
          ...loadoutDetectorAdvanced(),
          ...loadoutL85(true),
          ...loadoutSig220(),
          ...loadoutRgd5Grenades(2),
          ...loadoutCharacterItemsWithoutDetector(),
          ...loadoutCharacterFood(),
          ...loadoutCharacterDrugsAdvanced(),
          ...loadoutCharacterDrugsScientific(),
        ]}
      >
        <CharacterProfileCriticals />
        <DefaultCharacterDialogsNoGuide />
        <ActorDialog>jup_b1_stalker_about_scrutiny</ActorDialog>
        <ActorDialog>jup_b1_stalker_about_scrutiny_2</ActorDialog>
        <ActorDialog>jup_b1_stalker_about_scrutiny_3</ActorDialog>
        <ActorDialog>jup_a12_stalker_diplomat_after_scene_actor_dialog</ActorDialog>
        <ActorDialog>actor_break_dialog</ActorDialog>
      </SpecificCharacter>

      <SpecificCharacter
        id={"jup_b6_stalker_prisoner"}
        class={"jup_b6_stalker_prisoner"}
        name={"st_jup_a12_stalker_prisoner"}
        icon={"ui_inGame2_neutral_2_mask"}
        community={communities.stalker}
        soundConfig={"characters_voice\\human_02\\stalker\\"}
        visual={"actors\\stalker_neutral\\stalker_neutral_2_mask"}
        rank={30}
        moneyMin={0}
        moneyMax={0}
        supplies={[
          { section: "anomaly_scaner" },
          ...loadoutDetectorElite(),
          ...loadoutAk74(),
          ...loadoutPm(),
          ...loadoutRgd5Grenades(2),
          ...loadoutCharacterItemsWithoutDetector(),
          ...loadoutCharacterFood(),
          ...loadoutCharacterDrugsAdvanced(),
          ...loadoutCharacterDrugsScientific(),
        ]}
      >
        <CharacterProfileCriticals />
        <ActorDialog>jup_a12_stalker_prisoner_employ_stalkers</ActorDialog>
        <ActorDialog>jup_a12_stalker_prisoner_come_with_me</ActorDialog>
        <ActorDialog>jup_b1_stalker_about_scrutiny</ActorDialog>
        <ActorDialog>jup_b1_stalker_about_scrutiny_2</ActorDialog>
        <ActorDialog>jup_b1_stalker_about_scrutiny_3</ActorDialog>
        <ActorDialog>actor_break_dialog</ActorDialog>
      </SpecificCharacter>

      <SpecificCharacter
        id={"jup_b6_stalker_gonta"}
        class={"jup_b6_stalker_gonta"}
        name={"st_zat_b106_stalker_gonta_name"}
        icon={"ui_inGame2_Gonta"}
        community={communities.stalker}
        soundConfig={"characters_voice\\human_01\\stalker\\"}
        visual={"actors\\stalker_neutral\\stalker_neutral_2_face_6"}
        rank={50}
        moneyMin={1000}
        moneyMax={1000}
        supplies={[
          { section: "anomaly_scaner" },
          ...loadoutDetectorElite(),
          ...loadoutAk74(),
          ...loadoutWalther(),
          ...loadoutF1Grenades(2),
          ...loadoutCharacterItemsWithoutDetector(),
          ...loadoutCharacterFood(),
          ...loadoutCharacterDrugsExtended(),
        ]}
      >
        <CharacterProfileCriticals />
        <StartDialog>zat_b106_stalker_gonta_start</StartDialog>
        <ActorDialog>jup_b1_stalker_about_scrutiny</ActorDialog>
        <ActorDialog>jup_b1_stalker_about_scrutiny_2</ActorDialog>
        <ActorDialog>jup_b1_stalker_about_scrutiny_3</ActorDialog>
        <ActorDialog>zat_b106_hunt_himera</ActorDialog>
        <ActorDialog>zat_b106_stalker_gonta_info_about_soroka</ActorDialog>
        <ActorDialog>zat_b106_stalker_gonta_info_about_soroka_gone</ActorDialog>
        <ActorDialog>zat_b106_stalker_gonta_about_soroka_dialog</ActorDialog>
        <ActorDialog>zat_b106_stalker_gonta_about_soroka_actor_task</ActorDialog>
        <ActorDialog>zat_b106_stalker_gonta_trapper_send</ActorDialog>
        <ActorDialog>zat_b106_stalker_gonta_about_himself</ActorDialog>
        <ActorDialog>zat_b106_stalker_gonta_b22_about_stalker_vampire</ActorDialog>
        <ActorDialog>zat_b106_stalker_gonta_employ_stalkers</ActorDialog>
        <ActorDialog>zat_b106_stalker_gonta_come_with_me</ActorDialog>
        <ActorDialog>zat_b106_stalker_gonta_b52_about_nimble</ActorDialog>
        <ActorDialog>zat_b106_stalker_gonta_about_mutants</ActorDialog>
        <ActorDialog>actor_break_dialog</ActorDialog>
      </SpecificCharacter>

      <SpecificCharacter
        id={"jup_b6_stalker_garmata"}
        class={"jup_b6_stalker_garmata"}
        name={"st_zat_b106_stalker_garmata_name"}
        icon={"ui_inGame2_neutral_2"}
        community={communities.stalker}
        soundConfig={"characters_voice\\human_03\\stalker\\"}
        visual={"actors\\stalker_neutral\\stalker_neutral_2"}
        rank={45}
        moneyMin={1000}
        moneyMax={1000}
        supplies={[
          { section: "anomaly_scaner" },
          ...loadoutDetectorAdvanced(),
          ...loadoutSpas12(),
          ...loadoutColt1911(),
          ...loadoutF1Grenades(3),
          ...loadoutCharacterItemsWithoutDetector(),
          ...loadoutCharacterFood(),
          ...loadoutCharacterDrugsExtended(),
        ]}
      >
        <CharacterProfileCriticals />
        <ActorDialog>jup_b1_stalker_about_scrutiny</ActorDialog>
        <ActorDialog>jup_b1_stalker_about_scrutiny_2</ActorDialog>
        <ActorDialog>jup_b1_stalker_about_scrutiny_3</ActorDialog>
        <ActorDialog>actor_break_dialog</ActorDialog>
      </SpecificCharacter>

      <SpecificCharacter
        id={"jup_b6_stalker_crab"}
        class={"jup_b6_stalker_crab"}
        name={"st_zat_b106_stalker_crab_name"}
        icon={"ui_inGame2_neutral_2_mask"}
        community={communities.stalker}
        soundConfig={"characters_voice\\human_02\\stalker\\"}
        visual={"actors\\stalker_neutral\\stalker_neutral_2_mask"}
        rank={35}
        moneyMin={1000}
        moneyMax={1000}
        supplies={[
          { section: "anomaly_scaner" },
          ...loadoutDetectorAdvanced(),
          ...loadoutAk74(),
          ...loadoutPm(),
          ...loadoutCharacterItemsWithoutDetector(),
          ...loadoutCharacterFood(),
          ...loadoutCharacterDrugsBase(),
        ]}
      >
        <CharacterProfileCriticals />
        <DefaultCharacterDialogsNoGuide />
        <ActorDialog>jup_b1_stalker_about_scrutiny</ActorDialog>
        <ActorDialog>jup_b1_stalker_about_scrutiny_2</ActorDialog>
        <ActorDialog>jup_b1_stalker_about_scrutiny_3</ActorDialog>
        <ActorDialog>actor_break_dialog</ActorDialog>
      </SpecificCharacter>

      <SpecificCharacter
        id={"jup_b6_freedom_stalker_1"}
        class={"jup_b6_freedom_stalker_1"}
        name={GENERATE_STALKER_NAME}
        icon={"ui_inGame2_Freedom_2_mask"}
        community={communities.freedom}
        soundConfig={"characters_voice\\human_01\\freedom\\"}
        visual={"actors\\stalker_freedom\\stalker_freedom_2_mask"}
        rank={50}
        moneyMin={2500}
        moneyMax={5000}
        supplies={[
          { section: "anomaly_scaner" },
          ...loadoutDetectorElite(),
          ...loadoutSig550({ ap: true }),
          ...loadoutDesertEagle(),
          ...loadoutF1Grenades(),
          ...loadoutCharacterItemsWithoutDetector(),
          ...loadoutCharacterFood(),
          ...loadoutCharacterDrugsAdvanced(),
          ...loadoutCharacterDrugsScientific(),
          ...loadoutCharacterSellWeapons(),
        ]}
      >
        <CharacterProfileCriticals />
        <ActorDialog>jup_b1_stalker_about_scrutiny</ActorDialog>
        <ActorDialog>jup_b1_stalker_about_scrutiny_2</ActorDialog>
        <ActorDialog>jup_b1_stalker_about_scrutiny_3</ActorDialog>
        <ActorDialog>actor_break_dialog</ActorDialog>
      </SpecificCharacter>

      <SpecificCharacter
        id={"jup_b6_freedom_stalker_2"}
        class={"jup_b6_freedom_stalker_2"}
        name={GENERATE_STALKER_NAME}
        icon={"ui_inGame2_Freedom_2"}
        community={communities.freedom}
        soundConfig={"characters_voice\\human_03\\freedom\\"}
        visual={"actors\\stalker_freedom\\stalker_freedom_2"}
        rank={40}
        moneyMin={1500}
        moneyMax={2500}
        supplies={[
          { section: "anomaly_scaner" },
          ...loadoutDetectorAdvanced(),
          ...loadoutLr300(),
          ...loadoutColt1911(),
          ...loadoutRgd5Grenades(),
          ...loadoutCharacterItemsWithoutDetector(),
          ...loadoutCharacterFood(),
          ...loadoutCharacterDrugsExtended(),
          ...loadoutCharacterSellWeapons(),
        ]}
      >
        <CharacterProfileCriticals />
        <DefaultCharacterDialogsNoGuide />
        <ActorDialog>jup_b1_stalker_about_scrutiny</ActorDialog>
        <ActorDialog>jup_b1_stalker_about_scrutiny_2</ActorDialog>
        <ActorDialog>jup_b1_stalker_about_scrutiny_3</ActorDialog>
        <ActorDialog>actor_break_dialog</ActorDialog>
      </SpecificCharacter>

      <SpecificCharacter
        id={"jup_b6_freedom_stalker_3"}
        class={"jup_b6_freedom_stalker_3"}
        name={GENERATE_STALKER_NAME}
        icon={"ui_inGame2_Freedom_2"}
        community={communities.freedom}
        soundConfig={"characters_voice\\human_03\\freedom\\"}
        visual={"actors\\stalker_freedom\\stalker_freedom_2"}
        rank={40}
        moneyMin={1500}
        moneyMax={2500}
        supplies={[
          { section: "anomaly_scaner" },
          ...loadoutDetectorAdvanced(),
          ...loadoutL85(),
          ...loadoutBeretta(),
          ...loadoutRgd5Grenades(),
          ...loadoutCharacterItemsWithoutDetector(),
          ...loadoutCharacterFood(),
          ...loadoutCharacterDrugsExtended(),
          ...loadoutCharacterSellWeapons(),
        ]}
      >
        <CharacterProfileCriticals />
        <DefaultCharacterDialogsNoGuide />
        <ActorDialog>jup_b1_stalker_about_scrutiny</ActorDialog>
        <ActorDialog>jup_b1_stalker_about_scrutiny_2</ActorDialog>
        <ActorDialog>jup_b1_stalker_about_scrutiny_3</ActorDialog>
        <ActorDialog>actor_break_dialog</ActorDialog>
      </SpecificCharacter>

      <SpecificCharacter
        id={"jup_b6_freedom_stalker_4"}
        class={"jup_b6_freedom_stalker_4"}
        name={GENERATE_STALKER_NAME}
        icon={"ui_inGame2_Freedom_1"}
        community={communities.freedom}
        soundConfig={"characters_voice\\human_03\\freedom\\"}
        visual={"actors\\stalker_freedom\\stalker_freedom_1"}
        rank={35}
        moneyMin={1000}
        moneyMax={2000}
        supplies={[
          { section: "anomaly_scaner" },
          ...loadoutDetectorAdvanced(),
          ...loadoutWincheaster1300(),
          ...loadoutBeretta(),
          ...loadoutRgd5Grenades(),
          ...loadoutCharacterItemsWithoutDetector(),
          ...loadoutCharacterFood(),
          ...loadoutCharacterDrugsExtended(),
        ]}
      >
        <CharacterProfileCriticals />
        <DefaultCharacterDialogsNoGuide />
        <ActorDialog>jup_b1_stalker_about_scrutiny</ActorDialog>
        <ActorDialog>jup_b1_stalker_about_scrutiny_2</ActorDialog>
        <ActorDialog>jup_b1_stalker_about_scrutiny_3</ActorDialog>
        <ActorDialog>actor_break_dialog</ActorDialog>
      </SpecificCharacter>

      <SpecificCharacter
        id={"jup_b6_duty_stalker_1"}
        class={"jup_b6_duty_stalker_1"}
        name={GENERATE_CAPTAIN_NAME}
        icon={"ui_inGame2_Dolg_2"}
        community={communities.dolg}
        visual={"actors\\stalker_dolg\\stalker_dolg_2"}
        rank={55}
        moneyMin={2500}
        moneyMax={5000}
        supplies={[
          { section: "anomaly_scaner" },
          ...loadoutDetectorElite(),
          ...loadoutGroza(),
          ...loadoutSig220(),
          ...loadoutF1Grenades(),
          ...loadoutCharacterItemsWithoutDetector(),
          ...loadoutCharacterFood(),
          ...loadoutCharacterDrugsAdvanced(),
          ...loadoutCharacterDrugsMilitary(),
          ...loadoutCharacterSellWeapons(),
        ]}
      >
        <CharacterProfileCriticals />
        <ActorDialog>jup_b1_stalker_about_scrutiny</ActorDialog>
        <ActorDialog>jup_b1_stalker_about_scrutiny_2</ActorDialog>
        <ActorDialog>jup_b1_stalker_about_scrutiny_3</ActorDialog>
        <ActorDialog>actor_break_dialog</ActorDialog>
      </SpecificCharacter>

      <SpecificCharacter
        id={"jup_b6_duty_stalker_2"}
        class={"jup_b6_duty_stalker_2"}
        name={GENERATE_LIEUTENANT_NAME}
        icon={"ui_inGame2_Dolg_1"}
        community={communities.dolg}
        soundConfig={"characters_voice\\human_01\\dolg\\"}
        visual={"actors\\stalker_dolg\\stalker_dolg_1"}
        rank={45}
        moneyMin={1500}
        moneyMax={3500}
        supplies={[
          { section: "anomaly_scaner" },
          ...loadoutDetectorAdvanced(),
          ...loadoutAbakan({ scope: true }),
          ...loadoutPm(),
          ...loadoutRgd5Grenades(),
          ...loadoutCharacterItemsWithoutDetector(),
          ...loadoutCharacterDrugsExtended(),
          ...loadoutCharacterSellWeapons(),
        ]}
      >
        <CharacterProfileCriticals />
        <DefaultCharacterDialogsNoGuide />
        <ActorDialog>jup_b1_stalker_about_scrutiny</ActorDialog>
        <ActorDialog>jup_b1_stalker_about_scrutiny_2</ActorDialog>
        <ActorDialog>jup_b1_stalker_about_scrutiny_3</ActorDialog>
        <ActorDialog>actor_break_dialog</ActorDialog>
      </SpecificCharacter>

      <SpecificCharacter
        id={"jup_b6_duty_stalker_3"}
        class={"jup_b6_duty_stalker_3"}
        name={GENERATE_SERGEANT_NAME}
        icon={"ui_inGame2_Dolg_2"}
        community={communities.dolg}
        visual={"actors\\stalker_dolg\\stalker_dolg_2"}
        rank={45}
        moneyMin={1500}
        moneyMax={3500}
        supplies={[
          { section: "anomaly_scaner" },
          ...loadoutDetectorAdvanced(),
          ...loadoutSpas12(),
          ...loadoutWalther(),
          ...loadoutRgd5Grenades(),
          ...loadoutCharacterItemsWithoutDetector(),
          ...loadoutCharacterFood(),
          ...loadoutCharacterDrugsExtended(),
          ...loadoutCharacterSellWeapons(),
        ]}
      >
        <CharacterProfileCriticals />
        <DefaultCharacterDialogsNoGuide />
        <ActorDialog>jup_b1_stalker_about_scrutiny</ActorDialog>
        <ActorDialog>jup_b1_stalker_about_scrutiny_2</ActorDialog>
        <ActorDialog>jup_b1_stalker_about_scrutiny_3</ActorDialog>
        <ActorDialog>actor_break_dialog</ActorDialog>
      </SpecificCharacter>

      <SpecificCharacter
        id={"jup_b6_duty_stalker_4"}
        class={"jup_b6_duty_stalker_4"}
        name={GENERATE_LIEUTENANT_NAME}
        icon={"ui_inGame2_Dolg_1"}
        community={communities.dolg}
        soundConfig={"characters_voice\\human_01\\dolg\\"}
        visual={"actors\\stalker_dolg\\stalker_dolg_1"}
        rank={45}
        moneyMin={1500}
        moneyMax={3500}
        supplies={[
          { section: "anomaly_scaner" },
          ...loadoutDetectorAdvanced(),
          ...loadoutAbakan(),
          ...loadoutPm(),
          ...loadoutRgd5Grenades(),
          ...loadoutCharacterItemsWithoutDetector(),
          ...loadoutCharacterDrugsExtended(),
          ...loadoutCharacterSellWeapons(),
        ]}
      >
        <CharacterProfileCriticals />
        <DefaultCharacterDialogsNoGuide />
        <ActorDialog>jup_b1_stalker_about_scrutiny</ActorDialog>
        <ActorDialog>jup_b1_stalker_about_scrutiny_2</ActorDialog>
        <ActorDialog>jup_b1_stalker_about_scrutiny_3</ActorDialog>
        <ActorDialog>actor_break_dialog</ActorDialog>
      </SpecificCharacter>

      <SpecificCharacter
        id={"jup_b25_stalker_senya"}
        class={"jup_b25_stalker_senya"}
        name={"jup_b25_stalker_senya"}
        icon={"ui_inGame2_neutral_2_mask"}
        community={communities.stalker}
        soundConfig={"characters_voice\\human_01\\stalker\\"}
        visual={"actors\\stalker_neutral\\stalker_neutral_2_mask"}
        rank={20}
        moneyMin={10_000}
        moneyMax={10_000}
        supplies={[
          ...loadoutDetectorAdvanced(),
          ...loadoutToz34(),
          ...loadoutPm(),
          ...loadoutRgd5Grenades(),
          ...loadoutCharacterFood(),
        ]}
      >
        <CharacterProfileCriticals />
        <ActorDialog>actor_break_dialog</ActorDialog>
      </SpecificCharacter>

      <SpecificCharacter
        id={"jup_b25_freedom_flint"}
        class={"jup_b25_freedom_flint"}
        name={"jup_b25_freedom_flint"}
        icon={"ui_inGame2_Flint"}
        community={communities.freedom}
        soundConfig={"characters_voice\\human_01\\stalker\\"}
        visual={"actors\\stalker_freedom\\stalker_freedom_1_face_1"}
        rank={0}
        moneyMin={500}
        moneyMax={1000}
        supplies={[
          ...loadoutMp5(),
          ...loadoutBeretta(),
          ...loadoutRgd5Grenades(),
          ...loadoutCharacterItems(),
          ...loadoutCharacterFood(),
        ]}
      >
        <CharacterProfileCriticals />
        <StartDialog>jup_b25_flint_start</StartDialog>
        <ActorDialog>jup_b25_flint_argue_oasis</ActorDialog>
        <ActorDialog>jup_b25_flint_argue_bloodsucker</ActorDialog>
        <ActorDialog>jup_b25_flint_argue_scientist</ActorDialog>
        <ActorDialog>jup_b25_flint_argue_guide</ActorDialog>
        <ActorDialog>jup_b25_flint_accuse</ActorDialog>
        <ActorDialog>jup_b25_flint_about_controller</ActorDialog>
        <ActorDialog>actor_break_dialog</ActorDialog>
      </SpecificCharacter>

      <SpecificCharacter
        id={"jup_a6_stalker_medik"}
        class={"jup_a6_stalker_medik"}
        name={"jup_a6_stalker_medik"}
        icon={"ui_inGame2_Kostoprav"}
        community={communities.stalker}
        soundConfig={"characters_voice\\human_02\\stalker\\"}
        visual={"actors\\stalker_neutral\\stalker_neutral_1_face_2"}
        rank={20}
        moneyMin={480_000}
        moneyMax={480_000}
        moneyInfinite={true}
        supplies={[
          ...loadoutAk74u(),
          ...loadoutBeretta(),
          ...loadoutRgd5Grenades(),
          ...loadoutCharacterItems(),
          ...loadoutCharacterFood(),
          ...loadoutCharacterDrugsElite(),
        ]}
      >
        <CharacterProfileCriticals />
        <StartDialog>jup_a6_stalker_medik_start_dialog</StartDialog>
        <ActorDialog>jup_a6_stalker_medik_pripyat_group</ActorDialog>
        <ActorDialog>jup_a6_stalker_medik_tech_b202_about_stole</ActorDialog>
        <ActorDialog>jup_a6_stalker_medik_duty_founder_pda</ActorDialog>
        <ActorDialog>jup_a6_stalker_medik_b4_monolith_squad_dialog</ActorDialog>
        <ActorDialog>jup_a6_stalker_medik_jup_b217_pda_sell</ActorDialog>
        <ActorDialog>jup_a6_stalker_medik_about_sci_guards</ActorDialog>
        <ActorDialog>jup_a6_stalker_medik_about_sci_helpers</ActorDialog>
        <ActorDialog>jup_a6_stalker_medik_need_health_care</ActorDialog>
        <ActorDialog>actor_break_dialog</ActorDialog>
      </SpecificCharacter>

      <SpecificCharacter
        id={"jup_b15_zulus"}
        class={"jup_b15_zulus"}
        name={"jup_b15_zulus"}
        icon={"ui_inGame2_Zulus"}
        community={communities.stalker}
        visual={"actors\\stalker_dolg\\stalker_dolg_1_face_1"}
        rank={50}
        supplies={[
          { section: food.vodka },
          { section: weapons.wpn_pkm_zulus },
          { section: ammo.ammo_pkm_100 },
          ...loadoutTorch(),
          ...loadoutBinocular(),
          ...loadoutUsp(),
          ...loadoutF1Grenades(3),
          ...loadoutCharacterFood(),
          ...loadoutCharacterDrugsElite(),
          ...loadoutCharacterDrugsMilitary(),
        ]}
      >
        <CharacterProfileCriticals />
        <StartDialog>jup_b15_zulus_about_dialog</StartDialog>
        <ActorDialog>jup_b15_zulus_go_to_pripyat</ActorDialog>
        <ActorDialog>jup_b15_zulus_group_fighters</ActorDialog>
        <ActorDialog>jup_b15_zulus_tech_b202_about_stole</ActorDialog>
        <ActorDialog>jup_b15_zulus_tech_b202_about_testimony</ActorDialog>
        <ActorDialog>jup_b15_zulus_group_stalker_about</ActorDialog>
        <ActorDialog>jup_b15_zulus_group_soldier_about</ActorDialog>
        <ActorDialog>jup_b15_zulus_group_monolith_about</ActorDialog>
        <ActorDialog>actor_break_dialog</ActorDialog>
      </SpecificCharacter>

      <SpecificCharacter
        id={"jup_b202_stalker_snag"}
        class={"jup_b202_stalker_snag"}
        name={"zat_b33_stalker_snag"}
        icon={"ui_inGame2_neutral_1"}
        community={communities.stalker}
        soundConfig={"characters_voice\\human_02\\stalker\\"}
        visual={"actors\\stalker_neutral\\stalker_neutral_1"}
        rank={25}
        supplies={[
          { section: questItems.device_flash_snag },
          ...loadoutBm16(),
          ...loadoutPm(),
          ...loadoutCharacterItems(),
          ...loadoutCharacterFood(),
          ...loadoutCharacterDrugsBase(),
        ]}
      >
        <CharacterProfileCriticals />
        <StartDialog>jup_b202_snag_b202_about_stole</StartDialog>
        <ActorDialog>actor_break_dialog</ActorDialog>
      </SpecificCharacter>

      <SpecificCharacter
        id={"jup_a6_stalker_barmen"}
        class={"jup_a6_stalker_barmen"}
        name={"jup_a6_stalker_barmen"}
        icon={"ui_inGame2_Gavaets"}
        community={communities.stalker}
        soundConfig={"characters_voice\\human_01\\stalker\\"}
        visual={"actors\\stalker_neutral\\stalker_neutral_2_face_3"}
        rank={50}
        moneyMin={480_000}
        moneyMax={480_000}
        moneyInfinite={true}
        supplies={[
          ...loadoutMp5(),
          ...loadoutBeretta(),
          ...loadoutRgd5Grenades(),
          ...loadoutCharacterItems3(),
          ...loadoutCharacterFood(),
          ...loadoutCharacterDrugsElite(),
        ]}
      >
        <CharacterProfileCriticals />
        <StartDialog>jup_a6_stalker_barmen_start_dialog</StartDialog>
        <ActorDialog>jup_a6_stalker_barmen_pripyat_group</ActorDialog>
        <ActorDialog>jup_a6_stalker_barmen_b4_monolith_squad_dialog</ActorDialog>
        <ActorDialog>jup_a6_stalker_barmen_b202_about_stole</ActorDialog>
        <ActorDialog>jup_a6_stalker_barmen_duty_founder_pda</ActorDialog>
        <ActorDialog>jup_a6_stalker_barmen_jup_b217_pda_sell</ActorDialog>
        <ActorDialog>jup_a6_stalker_barmen_about_sci_guards</ActorDialog>
        <ActorDialog>jup_a6_stalker_barmen_about_sci_helpers</ActorDialog>
        <ActorDialog>jup_a6_stalker_barmen_about_halfartefact_jup_b1</ActorDialog>
        <ActorDialog>jup_a6_stalker_barmen_about_halfartefact_zat_b14</ActorDialog>
        <ActorDialog>jup_a6_barmen_oasis_art_sell</ActorDialog>
        <ActorDialog>actor_break_dialog</ActorDialog>
      </SpecificCharacter>

      <SpecificCharacter
        id={"jup_b202_bandit"}
        class={"jup_b202_bandit"}
        name={GENERATE_BANDIT_NAME}
        icon={profileIcon.ui_inGame2_bandit_3}
        community={communities.bandit}
        soundConfig={"characters_voice\\human_01\\bandit\\"}
        rank={40}
        moneyMin={500}
        moneyMax={1750}
        moneyInfinite={true}
        supplies={[
          { section: questItems.jup_b202_bandit_pda },
          ...loadoutDesertEagle(true),
          ...loadoutRgd5Grenades(),
          ...loadoutCharacterItemsWithoutDetector(),
          ...loadoutCharacterFood(),
          ...loadoutCharacterDrugsExtended(),
        ]}
      >
        <CharacterProfileCriticals />
        <DefaultCharacterDialogsNoGuide />
        <ActorDialog>actor_break_dialog</ActorDialog>
      </SpecificCharacter>

      <SpecificCharacter
        id={"jup_b19_freedom_yar"}
        class={"jup_b19_freedom_yar"}
        name={"jup_b19_freedom_yar_name"}
        icon={"ui_inGame2_Dyadka_Yar"}
        community={communities.freedom}
        soundConfig={"characters_voice\\human_02\\freedom\\"}
        visual={"actors\\stalker_freedom\\stalker_freedom_2_face_2"}
        rank={100}
        moneyMin={2500}
        moneyMax={5000}
        mechanicMode={true}
        supplies={[
          ...loadoutSvd(),
          ...loadoutBeretta(),
          ...loadoutF1Grenades(),
          ...loadoutCharacterItems3(),
          ...loadoutCharacterFood(),
          ...loadoutCharacterDrugsAdvanced(),
          ...loadoutCharacterDrugsScientific(),
        ]}
      >
        <CharacterProfileCriticals />
        <StartDialog>jup_b19_freedom_yar_base_start</StartDialog>
        <ActorDialog>jup_b19_freedom_yar_base_why_me</ActorDialog>
        <ActorDialog>jup_b19_freedom_yar_base_where_to</ActorDialog>
        <ActorDialog>jup_b19_freedom_yar_base_agreed</ActorDialog>
        <ActorDialog>jup_b19_freedom_yar_done_why_mercs</ActorDialog>
        <ActorDialog>jup_b19_freedom_yar_done_why_me</ActorDialog>
        <ActorDialog>jup_b19_freedom_yar_done_bye</ActorDialog>
        <ActorDialog>jup_b19_freedom_yar_come_with_me</ActorDialog>
        <ActorDialog>jup_b19_freedom_yar_pripyat_about</ActorDialog>
        <ActorDialog>jup_b19_freedom_yar_pripyat_healing</ActorDialog>
        <ActorDialog>jup_b19_freedom_yar_break_dialog</ActorDialog>
      </SpecificCharacter>

      <SpecificCharacter
        id={"jup_b19_merc_1"}
        class={"jup_b19_merc_1"}
        name={GENERATE_STALKER_NAME}
        icon={"ui_inGame2_merc_2"}
        community={communities.killer}
        soundConfig={"characters_voice\\human_03\\killer\\"}
        visual={"actors\\stalker_merc\\stalker_merc_2"}
        rank={40}
        moneyMin={2500}
        moneyMax={5000}
        supplies={[
          ...loadoutLr300({ silencer: true, ap: true }),
          ...loadoutUsp({ ap: true }),
          ...loadoutRgd5Grenades(),
          ...loadoutCharacterItemsWithoutDetector(),
          ...loadoutCharacterFood(),
          ...loadoutCharacterDrugsAdvanced(),
          ...loadoutCharacterDrugsMilitary(),
        ]}
      >
        <CharacterProfileCriticals />
        <DefaultCharacterDialogs />
      </SpecificCharacter>

      <SpecificCharacter
        id={"jup_b19_merc_2"}
        class={"jup_b19_merc_2"}
        name={GENERATE_STALKER_NAME}
        icon={"ui_inGame2_merc_4"}
        community={communities.killer}
        soundConfig={"characters_voice\\human_03\\killer\\"}
        visual={"actors\\stalker_merc\\stalker_merc_4"}
        rank={50}
        moneyMin={2500}
        moneyMax={5000}
        supplies={[
          ...loadoutLr300({ silencer: true, scope: true, ap: true }),
          ...loadoutUsp({ ap: true }),
          ...loadoutF1Grenades(),
          ...loadoutCharacterItemsWithoutDetector(),
          ...loadoutCharacterFood(),
          ...loadoutCharacterDrugsAdvanced(),
          ...loadoutCharacterDrugsMilitary(),
        ]}
      >
        <CharacterProfileCriticals />
        <DefaultCharacterDialogs />
      </SpecificCharacter>

      <SpecificCharacter
        id={"jup_b19_merc_3"}
        class={"jup_b19_merc_3"}
        name={GENERATE_STALKER_NAME}
        icon={"ui_inGame2_merc_2"}
        community={communities.killer}
        soundConfig={"characters_voice\\human_03\\killer\\"}
        visual={"actors\\stalker_merc\\stalker_merc_2"}
        rank={40}
        moneyMin={2500}
        moneyMax={5000}
        supplies={[
          ...loadoutL85(true),
          ...loadoutUsp({ ap: true }),
          ...loadoutRgd5Grenades(),
          ...loadoutCharacterItemsWithoutDetector(),
          ...loadoutCharacterFood(),
          ...loadoutCharacterDrugsAdvanced(),
          ...loadoutCharacterDrugsMilitary(),
        ]}
      >
        <CharacterProfileCriticals />
        <DefaultCharacterDialogs />
      </SpecificCharacter>

      <SpecificCharacter
        id={"jup_b19_merc_4"}
        class={"jup_b19_merc_4"}
        name={GENERATE_STALKER_NAME}
        icon={"ui_inGame2_merc_4"}
        community={communities.killer}
        soundConfig={"characters_voice\\human_03\\killer\\"}
        visual={"actors\\stalker_merc\\stalker_merc_4"}
        rank={50}
        moneyMin={2500}
        moneyMax={5000}
        supplies={[
          ...loadoutLr300({ silencer: true }),
          ...loadoutUsp(),
          ...loadoutF1Grenades(),
          ...loadoutCharacterItemsWithoutDetector(),
          ...loadoutCharacterFood(),
          ...loadoutCharacterDrugsAdvanced(),
          ...loadoutCharacterDrugsMilitary(),
        ]}
      >
        <CharacterProfileCriticals />
        <DefaultCharacterDialogs />
      </SpecificCharacter>

      <SpecificCharacter
        id={"jup_b19_merc_5"}
        class={"jup_b19_merc_5"}
        name={GENERATE_STALKER_NAME}
        icon={"ui_inGame2_merc_2"}
        community={communities.killer}
        soundConfig={"characters_voice\\human_03\\killer\\"}
        visual={"actors\\stalker_merc\\stalker_merc_2"}
        rank={40}
        supplies={[
          ...loadoutL85(),
          ...loadoutUsp(),
          ...loadoutRgd5Grenades(),
          ...loadoutCharacterItemsWithoutDetector(),
          ...loadoutCharacterFood(),
          ...loadoutCharacterDrugsAdvanced(),
          ...loadoutCharacterDrugsMilitary(),
        ]}
      >
        <CharacterProfileCriticals />
        <DefaultCharacterDialogs />
      </SpecificCharacter>

      <SpecificCharacter
        id={"jup_b43_stalker_assistant"}
        class={"jup_b43_stalker_assistant"}
        name={"st_jup_b43_stalker_assistant"}
        icon={"ui_inGame2_Garik"}
        community={communities.stalker}
        soundConfig={"characters_voice\\human_01\\stalker\\"}
        visual={"actors\\stalker_neutral\\stalker_neutral_2_face_4"}
        rank={100}
        supplies={[
          ...loadoutVintorez(),
          ...loadoutColt1911(),
          ...loadoutF1Grenades(),
          ...loadoutCharacterItems3(),
          ...loadoutCharacterFood(),
          ...loadoutCharacterDrugsElite(),
        ]}
      >
        <CharacterProfileCriticals />
        <StartDialog>jup_b43_stalker_assistant_bunker_start</StartDialog>
        <ActorDialog>jup_b43_stalker_assistant_guide_leave_zone</ActorDialog>
        <ActorDialog>jup_b43_stalker_assistant_guide_to_pripyat</ActorDialog>
        <ActorDialog>jup_b43_stalker_assistant_guide_to_zaton</ActorDialog>
        <ActorDialog>jup_b43_stalker_assistant_guide_to_jupiter</ActorDialog>
        <ActorDialog>jup_b43_stalker_assistant_bunker_boredom</ActorDialog>
        <ActorDialog>jup_b43_stalker_assistant_bunker_contract</ActorDialog>
        <ActorDialog>jup_b43_stalker_assistant_bunker_pripyat</ActorDialog>
        <ActorDialog>jup_b43_stalker_assistant_bunker_way</ActorDialog>
        <ActorDialog>jup_b43_stalker_assistant_bunker_volunteer</ActorDialog>
        <ActorDialog>jup_b43_stalker_assistant_bunker_artefacts</ActorDialog>
        <ActorDialog>jup_b43_stalker_assistant_b35_about_merc_actor</ActorDialog>
        <ActorDialog>jup_b43_stalker_assistant_b301_about_zulus</ActorDialog>
        <ActorDialog>actor_break_dialog</ActorDialog>
      </SpecificCharacter>

      <SpecificCharacter
        id={"jup_b46_duty_founder"}
        class={"jup_b46_duty_founder"}
        name={"jup_b46_duty_founder_name"}
        icon={profileIcon.ui_inGame2_Dolg_4}
        community={communities.dolg}
        visual={"actors\\stalker_dolg\\stalker_dolg_4"}
        rank={100}
        moneyMin={1500}
        moneyMax={3500}
        supplies={[{ section: questItems.jup_b46_duty_founder_pda }]}
      >
        <CharacterProfileCriticals />
      </SpecificCharacter>

      <SpecificCharacter
        id={"jup_b46_duty_founder_squad_01"}
        class={"jup_b46_duty_founder_squad_01"}
        name={"jup_b46_duty_founder_squad_01_name"}
        icon={profileIcon.ui_inGame2_Dolg_3}
        community={communities.dolg}
        rank={50}
        moneyMin={100}
        moneyMax={3000}
      >
        <CharacterProfileCriticals />
      </SpecificCharacter>

      <SpecificCharacter
        id={"jup_b46_duty_founder_squad_02"}
        class={"jup_b46_duty_founder_squad_02"}
        name={"jup_b46_duty_founder_squad_02_name"}
        icon={profileIcon.ui_inGame2_Dolg_2}
        community={communities.dolg}
        soundConfig={"characters_voice\\human_01\\dolg\\"}
        rank={50}
        moneyMin={100}
        moneyMax={3000}
      >
        <CharacterProfileCriticals />
      </SpecificCharacter>

      <SpecificCharacter
        id={"jup_b46_duty_founder_squad_03"}
        class={"jup_b46_duty_founder_squad_03"}
        name={"jup_b46_duty_founder_squad_03_name"}
        icon={"ui_inGame2_Dolg_3"}
        community={communities.dolg}
        visual={"actors\\stalker_dolg\\stalker_dolg_3"}
        rank={50}
        moneyMin={100}
        moneyMax={3000}
      >
        <CharacterProfileCriticals />
      </SpecificCharacter>

      <SpecificCharacter
        id={"jup_b46_duty_founder_squad_04"}
        class={"jup_b46_duty_founder_squad_04"}
        name={"jup_b46_duty_founder_squad_04_name"}
        icon={profileIcon.ui_inGame2_Dolg_2}
        community={communities.dolg}
        soundConfig={"characters_voice\\human_01\\dolg\\"}
        rank={50}
        moneyMin={100}
        moneyMax={3000}
      >
        <CharacterProfileCriticals />
      </SpecificCharacter>

      <SpecificCharacter
        id={"jup_a6_freedom_leader"}
        class={"jup_a6_freedom_leader"}
        name={"jup_a6_freedom_leader"}
        icon={"ui_inGame2_Loki"}
        community={communities.freedom}
        soundConfig={"characters_voice\\human_01\\freedom\\"}
        visual={"actors\\stalker_freedom\\stalker_freedom_3_face_1"}
        rank={100}
        moneyMin={500}
        moneyMax={1000}
        supplies={[
          { section: misc.hand_radio },
          ...loadoutColt1911(true),
          ...loadoutF1Grenades(),
          ...loadoutCharacterItems3(),
          ...loadoutCharacterFood(),
          ...loadoutCharacterDrugsElite(),
          ...loadoutCharacterDrugsScientific(),
        ]}
      >
        <CharacterProfileCriticals />
        <StartDialog>jup_a6_freedom_leader_start_dialog</StartDialog>
        <ActorDialog>jup_a6_freedom_leader_duty_founder_pda</ActorDialog>
        <ActorDialog>jup_a6_freedom_leader_duty_sell_founder_pda</ActorDialog>
        <ActorDialog>jup_a6_freedom_leader_pripyat_group</ActorDialog>
        <ActorDialog>jup_a6_freedom_leader_b4_monolith_squad_dialog</ActorDialog>
        <ActorDialog>jup_a6_freedom_leader_b4_monolith_squad_dialog_redy_to_go</ActorDialog>
        <ActorDialog>jup_a6_freedom_leader_b207_hiding_place</ActorDialog>
        <ActorDialog>jup_a6_freedom_leader_employ_stalkers</ActorDialog>
        <ActorDialog>jup_a6_freedom_leader_b106_info_about_soroka</ActorDialog>
        <ActorDialog>jup_a6_freedom_leader_about_stolen_items</ActorDialog>
        <ActorDialog>jup_a6_freedom_leader_a9_sell_info</ActorDialog>
        <ActorDialog>jup_a6_freedom_leader_about_you</ActorDialog>
        <ActorDialog>actor_break_dialog</ActorDialog>
      </SpecificCharacter>

      <SpecificCharacter
        id={"jup_a6_duty_leader"}
        class={"jup_a6_duty_leader"}
        name={"jup_a6_duty_leader"}
        icon={"ui_inGame2_Shulga"}
        community={communities.dolg}
        visual={"actors\\stalker_dolg\\stalker_dolg_3_face_1"}
        rank={100}
        moneyMin={100}
        moneyMax={3000}
        supplies={[
          { section: misc.hand_radio },
          ...loadoutSig220(),
          ...loadoutF1Grenades(),
          ...loadoutCharacterItems3(),
          ...loadoutCharacterFood(),
          ...loadoutCharacterDrugsElite(),
          ...loadoutCharacterDrugsScientific(),
        ]}
      >
        <CharacterProfileCriticals />
        <StartDialog>jup_a6_duty_leader_start_dialog</StartDialog>
        <ActorDialog>jup_a6_duty_leader_duty_founder_pda</ActorDialog>
        <ActorDialog>jup_a6_duty_leader_duty_founder_sell_pda</ActorDialog>
        <ActorDialog>jup_a6_duty_leader_pripyat_group</ActorDialog>
        <ActorDialog>jup_a6_duty_leader_b4_monolith_squad_dialog</ActorDialog>
        <ActorDialog>jup_a6_duty_leader_b4_monolith_squad_dialog_redy_to_go</ActorDialog>
        <ActorDialog>jup_a6_duty_leader_b207_hiding_place</ActorDialog>
        <ActorDialog>jup_a6_duty_leader_employ_stalkers</ActorDialog>
        <ActorDialog>jup_a6_duty_leader_b106_info_about_soroka</ActorDialog>
        <ActorDialog>jup_a6_duty_leader_about_stolen_items</ActorDialog>
        <ActorDialog>jup_a6_duty_leader_a9_sell_info</ActorDialog>
        <ActorDialog>jup_a6_duty_leader_about_you</ActorDialog>
        <ActorDialog>actor_break_dialog</ActorDialog>
      </SpecificCharacter>

      <SpecificCharacter
        id={"jup_b218_vano_in_suit"}
        class={"jup_b218_vano_in_suit"}
        name={"jup_a10_stalker_vano"}
        icon={"ui_inGame2_Vano_nauchniy"}
        community={communities.stalker}
        soundConfig={"characters_voice\\human_03\\stalker\\"}
        visual={"actors\\stalker_neutral\\stalker_neutral_nauchniy_face_1"}
        rank={45}
        moneyMin={100}
        moneyMax={3000}
        supplies={[
          ...loadoutDetectorElite(),
          ...loadoutWincheaster1300(),
          ...loadoutBeretta(),
          ...loadoutRgd5Grenades(3),
          ...loadoutCharacterItemsWithoutDetector(),
          ...loadoutCharacterFood(),
          ...loadoutCharacterDrugsElite(),
        ]}
      >
        <CharacterProfileCriticals />
        <StartDialog>jup_a10_vano_help_dialog</StartDialog>
        <ActorDialog>jup_a10_stalker_vano_pripyat_ready</ActorDialog>
        <ActorDialog>jup_a10_stalker_vano_pripyat_how_are_you</ActorDialog>
        <ActorDialog>actor_break_dialog</ActorDialog>
      </SpecificCharacter>

      <SpecificCharacter
        id={"jup_b47_merc_07"}
        class={"jup_b47_merc_07"}
        name={"jup_b47_merc_07"}
        icon={profileIcon.ui_inGame2_merc_2}
        community={communities.killer}
        soundConfig={"characters_voice\\human_03\\killer\\"}
        rank={40}
        supplies={[
          ...loadoutLr300({ scope: true, silencer: true }),
          ...loadoutSig220(),
          ...loadoutRgd5Grenades(),
          ...loadoutCharacterItemsWithoutDetector(),
          ...loadoutCharacterFood(),
          ...loadoutCharacterDrugsExtended(),
          ...loadoutCharacterDrugsScientific(),
        ]}
      >
        <CharacterProfileCriticals />
        <DefaultCharacterDialogsNoGuide />
        <StartDialog>jup_b47_merc_guards_start</StartDialog>
      </SpecificCharacter>

      <SpecificCharacter
        id={"jup_b47_merc_06"}
        class={"jup_b47_merc_06"}
        name={"jup_b47_merc_06"}
        icon={profileIcon.ui_inGame2_merc_4}
        community={communities.killer}
        soundConfig={"characters_voice\\human_03\\killer\\"}
        rank={40}
        supplies={[
          ...loadoutSpas12(true),
          ...loadoutWalther(),
          ...loadoutRgd5Grenades(),
          ...loadoutCharacterItemsWithoutDetector(),
          ...loadoutCharacterFood(),
          ...loadoutCharacterDrugsExtended(),
          ...loadoutCharacterDrugsScientific(),
        ]}
      >
        <CharacterProfileCriticals />
        <DefaultCharacterDialogsNoGuide />
        <StartDialog>jup_b47_merc_guards_start</StartDialog>
      </SpecificCharacter>

      <SpecificCharacter
        id={"jup_b47_merc_05"}
        class={"jup_b47_merc_05"}
        name={"jup_b47_merc_05"}
        icon={profileIcon.ui_inGame2_merc_2}
        community={communities.killer}
        soundConfig={"characters_voice\\human_03\\killer\\"}
        rank={40}
        supplies={[
          ...loadoutLr300({ silencer: true }),
          ...loadoutWalther(),
          ...loadoutRgd5Grenades(),
          ...loadoutCharacterItemsWithoutDetector(),
          ...loadoutCharacterFood(),
          ...loadoutCharacterDrugsExtended(),
          ...loadoutCharacterDrugsScientific(),
        ]}
      >
        <CharacterProfileCriticals />
        <DefaultCharacterDialogsNoGuide />
        <StartDialog>jup_b47_merc_guards_start</StartDialog>
      </SpecificCharacter>

      <SpecificCharacter
        id={"jup_b47_merc_04"}
        class={"jup_b47_merc_04"}
        name={"jup_b47_merc_04"}
        icon={profileIcon.ui_inGame2_merc_4}
        community={communities.killer}
        soundConfig={"characters_voice\\human_03\\killer\\"}
        rank={40}
        supplies={[
          ...loadoutSpas12(true),
          ...loadoutWalther(),
          ...loadoutRgd5Grenades(),
          ...loadoutCharacterItemsWithoutDetector(),
          ...loadoutCharacterFood(),
          ...loadoutCharacterDrugsExtended(),
          ...loadoutCharacterDrugsScientific(),
        ]}
      >
        <CharacterProfileCriticals />
        <DefaultCharacterDialogsNoGuide />
        <StartDialog>jup_b47_merc_guards_start</StartDialog>
      </SpecificCharacter>

      <SpecificCharacter
        id={"jup_b47_merc_03"}
        class={"jup_b47_merc_03"}
        name={"jup_b47_merc_03"}
        icon={profileIcon.ui_inGame2_merc_2}
        community={communities.killer}
        soundConfig={"characters_voice\\human_03\\killer\\"}
        rank={50}
        supplies={[
          ...loadoutL85(true),
          ...loadoutSig220(),
          ...loadoutF1Grenades(),
          ...loadoutCharacterItemsWithoutDetector(),
          ...loadoutCharacterFood(),
          ...loadoutCharacterDrugsAdvanced(),
          ...loadoutCharacterDrugsScientific(),
        ]}
      >
        <CharacterProfileCriticals />
        <DefaultCharacterDialogsNoGuide />
        <StartDialog>jup_b47_merc_guards_start</StartDialog>
      </SpecificCharacter>

      <SpecificCharacter
        id={"jup_b47_merc_02"}
        class={"jup_b47_merc_02"}
        name={"jup_b47_merc_02"}
        icon={profileIcon.ui_inGame2_merc_2}
        community={communities.killer}
        soundConfig={"characters_voice\\human_03\\killer\\"}
        rank={50}
        supplies={[
          ...loadoutL85(true),
          ...loadoutSig220(),
          ...loadoutF1Grenades(),
          ...loadoutCharacterItemsWithoutDetector(),
          ...loadoutCharacterFood(),
          ...loadoutCharacterDrugsAdvanced(),
          ...loadoutCharacterDrugsScientific(),
        ]}
      >
        <CharacterProfileCriticals />
        <DefaultCharacterDialogsNoGuide />
        <StartDialog>jup_b47_merc_guards_start</StartDialog>
      </SpecificCharacter>

      <SpecificCharacter
        id={"jup_b47_merc_01"}
        class={"jup_b47_merc_01"}
        name={"jup_b47_merc_01"}
        icon={profileIcon.ui_inGame2_merc_4}
        community={communities.killer}
        soundConfig={"characters_voice\\human_03\\killer\\"}
        rank={65}
        supplies={[
          ...loadoutG36({ ap: true }),
          ...loadoutUsp(),
          ...loadoutF1Grenades(),
          ...loadoutCharacterItems(),
          ...loadoutCharacterFood(),
          ...loadoutCharacterDrugsBase(),
        ]}
      >
        <CharacterProfileCriticals />
        <DefaultCharacterDialogsNoGuide />
        <StartDialog>jup_b47_merc_guards_start</StartDialog>
      </SpecificCharacter>

      <SpecificCharacter
        id={"jup_b219_stalker_tech"}
        class={"jup_b219_stalker_tech"}
        name={"jup_b217_stalker_tech"}
        icon={"ui_inGame2_Azot"}
        community={communities.stalker}
        soundConfig={"characters_voice\\human_03\\stalker\\"}
        visual={"actors\\stalker_neutral\\stalker_neutral_nauchniy_face_3"}
        rank={50}
        moneyMin={10_000}
        moneyMax={10_000}
        supplies={[
          ...loadoutAk74u(true),
          ...loadoutFort(),
          ...loadoutF1Grenades(),
          ...loadoutCharacterItems2(),
          ...loadoutCharacterFood(),
          ...loadoutCharacterDrugsAdvanced(),
        ]}
      >
        <CharacterProfileCriticals />
        <ActorDialog>actor_break_dialog</ActorDialog>
      </SpecificCharacter>

      <SpecificCharacter
        id={"jup_b219_monolith_squad_leader_freedom_skin"}
        class={"jup_b219_monolith_squad_leader_freedom_skin"}
        name={"jup_b4_monolith_squad_leader_name"}
        icon={"ui_inGame2_Brodyaga_monolit"}
        community={communities.stalker}
        soundConfig={"characters_voice\\human_03\\stalker\\"}
        visual={"actors\\stalker_monolith\\stalker_monolith_1"}
        rank={100}
        moneyMin={1500}
        moneyMax={2500}
        supplies={[
          ...loadoutSvu(),
          ...loadoutColt1911(),
          ...loadoutF1Grenades(),
          ...loadoutCharacterItemsWithoutDetector(),
          ...loadoutCharacterFood(),
          ...loadoutCharacterDrugsElite(),
        ]}
      >
        <CharacterProfileCriticals />
        <ActorDialog>actor_break_dialog</ActorDialog>
      </SpecificCharacter>

      <SpecificCharacter
        id={"jup_b219_vano"}
        class={"jup_b219_vano"}
        name={"jup_a10_stalker_vano"}
        icon={"ui_inGame2_Vano_nauchniy"}
        community={communities.stalker}
        soundConfig={"characters_voice\\human_03\\stalker\\"}
        visual={"actors\\stalker_neutral\\stalker_neutral_nauchniy"}
        rank={45}
        moneyMin={1500}
        moneyMax={2500}
        supplies={[
          ...loadoutDetectorElite(),
          ...loadoutWincheaster1300(),
          ...loadoutBeretta(),
          ...loadoutRgd5Grenades(),
          ...loadoutCharacterItemsWithoutDetector(),
          ...loadoutCharacterFood(),
          ...loadoutCharacterDrugsElite(),
        ]}
      >
        <CharacterProfileCriticals />
        <ActorDialog>actor_break_dialog</ActorDialog>
      </SpecificCharacter>

      <SpecificCharacter
        id={"jup_b219_soldier"}
        class={"jup_b219_soldier"}
        name={"pri_a15_sokolov_name"}
        icon={"ui_inGame2_Sokolov_ecolog"}
        community={communities.stalker}
        soundConfig={"characters_voice\\human_03\\stalker\\"}
        visual={"actors\\stalker_soldier\\stalker_ecolog_military"}
        rank={50}
        moneyMin={1500}
        moneyMax={2500}
        supplies={[
          ...loadoutAk74u(),
          ...loadoutFort(),
          ...loadoutRgd5Grenades(3),
          ...loadoutCharacterItemsWithoutDetector(),
          ...loadoutCharacterFood(),
          ...loadoutCharacterDrugsExtended(),
          ...loadoutCharacterDrugsMilitary(),
        ]}
      >
        <CharacterProfileCriticals />
        <ActorDialog>actor_break_dialog</ActorDialog>
      </SpecificCharacter>

      <SpecificCharacter
        id={"jup_b219_zulus"}
        class={"jup_b219_zulus"}
        name={"jup_b15_zulus"}
        icon={"ui_inGame2_Zulus"}
        community={communities.stalker}
        soundConfig={"characters_voice\\human_03\\stalker\\"}
        visual={"actors\\stalker_dolg\\stalker_dolg_1"}
        rank={75}
        moneyMin={1500}
        moneyMax={2500}
        supplies={[
          { section: weapons.wpn_pkm_zulus },
          { section: ammo.ammo_pkm_100 },
          ...loadoutUsp({ ap: true }),
          ...loadoutF1Grenades(3),
          ...loadoutCharacterItemsWithoutDetector(),
          ...loadoutCharacterFood(),
          ...loadoutCharacterDrugsElite(),
          ...loadoutCharacterDrugsMilitary(),
        ]}
      >
        <CharacterProfileCriticals />
        <ActorDialog>actor_break_dialog</ActorDialog>
      </SpecificCharacter>
    </xml>
  );
}
