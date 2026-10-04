import { JSXNode, JSXXML } from "jsx-xml";

import { ActorDialog, SpecificCharacter, StartDialog } from "@/engine/configs/gameplay/components";
import {
  CharacterProfileCriticals,
  DefaultCharacterDialogs,
  DefaultCharacterDialogsNoGuide,
  loadoutAbakan,
  loadoutAk74,
  loadoutAk74u,
  loadoutBinocular,
  loadoutCharacterDrugsAdvanced,
  loadoutCharacterDrugsBase,
  loadoutCharacterDrugsElite,
  loadoutCharacterDrugsExtended,
  loadoutCharacterDrugsMilitary,
  loadoutCharacterDrugsScientific,
  loadoutCharacterFood,
  loadoutCharacterFoodWithoutAlcohol,
  loadoutCharacterItems,
  loadoutCharacterItems3,
  loadoutCharacterItemsWithoutDetector,
  loadoutCharacterSellWeapons,
  loadoutColt1911,
  loadoutDesertEagle,
  loadoutDetectorElite,
  loadoutF1Grenades,
  loadoutFort,
  loadoutG36,
  loadoutGroza,
  loadoutLr300,
  loadoutPb,
  loadoutPkm,
  loadoutProtecta,
  loadoutRgd5Grenades,
  loadoutRpg7,
  loadoutSig220,
  loadoutSvd,
  loadoutSvu,
  loadoutTorch,
  loadoutUsp,
  loadoutVal,
  loadoutVintorez,
} from "@/engine/configs/gameplay/loadouts";
import { profileIcon } from "@/engine/configs/gameplay/loadouts/profile_presets";
import { communities } from "@/engine/constants/communities";
import { ammo } from "@/engine/constants/items/ammo";
import { misc } from "@/engine/constants/items/misc";
import { questItems } from "@/engine/constants/items/quest_items";
import { weapons } from "@/engine/constants/items/weapons";
import { GENERATE_STALKER_NAME } from "@/engine/constants/names";

export function create(): JSXNode {
  return (
    <xml>
      <SpecificCharacter
        id={"pri_a17_military_captain_tarasov"}
        class={"pri_a17_military_captain_tarasov"}
        name={"pri_a17_military_captain_tarasov"}
        icon={profileIcon.ui_inGame2_Soldier_2}
        community={communities.army}
        rank={70}
        soundConfig={"characters_voice\\human_02\\military\\"}
        supplies={[
          ...loadoutBinocular(),
          ...loadoutVal({ ap: true, scope: true }),
          ...loadoutPb(true),
          ...loadoutF1Grenades(),
          ...loadoutCharacterFoodWithoutAlcohol(),
          ...loadoutCharacterDrugsElite(),
          ...loadoutCharacterDrugsMilitary(),
        ]}
      >
        <CharacterProfileCriticals />
        <ActorDialog>pri_a17_military_recon_squad_ambush_actor_ready</ActorDialog>
        <ActorDialog>actor_break_dialog</ActorDialog>
      </SpecificCharacter>

      <SpecificCharacter
        id={"pri_a17_military_prapor_valentyr"}
        class={"pri_a17_military_prapor_valentyr"}
        name={"pri_a17_military_prapor_valentyr"}
        icon={profileIcon.ui_inGame2_Soldier_3}
        community={communities.army}
        rank={40}
        soundConfig={"characters_voice\\human_03\\military\\"}
        supplies={[
          ...loadoutBinocular(),
          ...loadoutAbakan({ scope: true, ap: true }),
          ...loadoutPb(),
          ...loadoutF1Grenades(2),
          ...loadoutCharacterFoodWithoutAlcohol(),
          ...loadoutCharacterDrugsElite(),
          ...loadoutCharacterDrugsMilitary(),
        ]}
      >
        <CharacterProfileCriticals />
        <ActorDialog>actor_break_dialog</ActorDialog>
      </SpecificCharacter>

      <SpecificCharacter
        id={"pri_a17_military_sergeant_morozov"}
        class={"pri_a17_military_sergeant_morozov"}
        name={"pri_a17_military_sergeant_morozov"}
        icon={profileIcon.ui_inGame2_Soldier_2}
        community={communities.army}
        rank={80}
        soundConfig={"characters_voice\\human_01\\military\\"}
        supplies={[
          ...loadoutBinocular(),
          ...loadoutSvu(),
          ...loadoutPb(),
          ...loadoutF1Grenades(),
          ...loadoutCharacterFoodWithoutAlcohol(),
          ...loadoutCharacterDrugsElite(),
          ...loadoutCharacterDrugsMilitary(),
        ]}
      >
        <CharacterProfileCriticals />
        <ActorDialog>actor_break_dialog</ActorDialog>
      </SpecificCharacter>

      <SpecificCharacter
        id={"pri_a17_military_lieutenant_podorojniy"}
        class={"pri_a17_military_lieutenant_podorojniy"}
        name={"pri_a17_military_lieutenant_podorojniy"}
        icon={profileIcon.ui_inGame2_Soldier_3}
        community={communities.army}
        rank={50}
        soundConfig={"characters_voice\\human_03\\military\\"}
        supplies={[
          ...loadoutBinocular(),
          ...loadoutAbakan({ scope: true, ap: true }),
          ...loadoutPb(),
          ...loadoutF1Grenades(2),
          ...loadoutCharacterFoodWithoutAlcohol(),
          ...loadoutCharacterDrugsElite(),
          ...loadoutCharacterDrugsMilitary(),
        ]}
      >
        <CharacterProfileCriticals />
        <ActorDialog>actor_break_dialog</ActorDialog>
      </SpecificCharacter>

      <SpecificCharacter
        id={"pri_a17_military_colonel_kovalski"}
        class={"pri_a17_military_colonel_kovalski"}
        name={"pri_a17_military_colonel_kovalski_name"}
        icon={"ui_inGame2_Kovalskiy"}
        community={communities.army}
        rank={75}
        soundConfig={"characters_voice\\human_02\\military\\"}
        visual={"actors\\stalker_soldier\\stalker_soldier_3_face_1"}
        supplies={[
          { section: misc.hand_radio },
          ...loadoutBinocular(),
          ...loadoutGroza({ ap: true, scope: true }),
          ...loadoutFort(),
          ...loadoutF1Grenades(2),
          ...loadoutCharacterFoodWithoutAlcohol(),
          ...loadoutCharacterDrugsExtended(),
          ...loadoutCharacterDrugsMilitary(),
        ]}
      >
        <CharacterProfileCriticals />
        <StartDialog>pri_a17_military_base_commander_start</StartDialog>
        <ActorDialog>pri_a17_military_base_commander_actor_dialog_1</ActorDialog>
        <ActorDialog>pri_a17_military_base_commander_actor_questions_dialog</ActorDialog>
        <ActorDialog>pri_a17_military_colonel_kovalski_a23_about_gauss_labx8</ActorDialog>
        <ActorDialog>pri_a16_colonel_a21_about_sentry_dialog</ActorDialog>
        <ActorDialog>pri_a16_colonel_a21_about_sentry_pass_task_dialog</ActorDialog>
        <ActorDialog>pri_a17_military_colonel_kovalski_b35_about_merc_start</ActorDialog>
        <ActorDialog>pri_a17_military_colonel_kovalski_b35_actor_know_about_merc</ActorDialog>
        <ActorDialog>pri_a17_military_colonel_kovalski_b35_reward</ActorDialog>
        <ActorDialog>pri_a17_military_colonel_kovalski_evacuation_ready</ActorDialog>
        <ActorDialog>actor_break_dialog</ActorDialog>
      </SpecificCharacter>

      <SpecificCharacter
        id={"pri_a17_monolith_preacher"}
        class={"pri_a17_monolith_preacher"}
        name={GENERATE_STALKER_NAME}
        icon={profileIcon.ui_inGame2_monolit_3}
        community={communities.monolith}
        rank={100}
        soundConfig={"characters_voice\\human_01\\monolith\\"}
        supplies={[
          { section: questItems.pri_a17_gauss_rifle },
          { section: ammo.ammo_gauss },
          ...loadoutColt1911(),
          ...loadoutF1Grenades(),
          ...loadoutCharacterItemsWithoutDetector(),
          ...loadoutCharacterFoodWithoutAlcohol(),
          ...loadoutCharacterDrugsElite(),
          ...loadoutCharacterDrugsScientific(),
        ]}
      >
        <CharacterProfileCriticals />
      </SpecificCharacter>

      <SpecificCharacter
        id={"pri_a15_sokolov"}
        class={"pri_a15_sokolov"}
        name={"pri_a15_sokolov_name"}
        icon={"ui_inGame2_Sokolov"}
        community={communities.army}
        rank={50}
        soundConfig={"characters_voice\\human_01\\military\\"}
        visual={"actors\\stalker_soldier\\stalker_soldier_1_face_1"}
        supplies={[
          ...loadoutBinocular(),
          ...loadoutAk74u(),
          ...loadoutFort(),
          ...loadoutF1Grenades(),
          ...loadoutCharacterFoodWithoutAlcohol(),
          ...loadoutCharacterDrugsExtended(),
          ...loadoutCharacterDrugsMilitary(),
        ]}
      >
        <CharacterProfileCriticals />
        <StartDialog>pri_a15_sokolov_start_dialog</StartDialog>
        <ActorDialog>pri_a15_sokolov_where_from</ActorDialog>
        <ActorDialog>pri_a15_sokolov_jupiter</ActorDialog>
        <ActorDialog>pri_a15_sokolov_evacuation_point</ActorDialog>
        <ActorDialog>pri_a15_sokolov_evacuation_note</ActorDialog>
        <ActorDialog>pri_a15_sokolov_occupation</ActorDialog>
        <ActorDialog>pri_a15_sokolov_pripyat_group</ActorDialog>
        <ActorDialog>pri_a15_sokolov_need_outfit</ActorDialog>
        <ActorDialog>pri_a15_sokolov_arranged_outfit</ActorDialog>
        <ActorDialog>pri_a15_sokolov_goto_zulus</ActorDialog>
        <ActorDialog>pri_a15_sokolov_acquaintance_after_jorney</ActorDialog>
        <ActorDialog>pri_a15_sokolov_about_journey</ActorDialog>
        <ActorDialog>pri_a15_sokolov_helicopter</ActorDialog>
        <ActorDialog>actor_break_dialog</ActorDialog>
      </SpecificCharacter>

      <SpecificCharacter
        id={"pri_a15_sokolov_sci"}
        class={"pri_a15_sokolov_sci"}
        name={"pri_a15_sokolov_name"}
        icon={"ui_inGame2_Sokolov_ecolog"}
        community={communities.army}
        rank={50}
        soundConfig={"characters_voice\\human_01\\military\\"}
        visual={"actors\\stalker_soldier\\stalker_soldier_ecolog_face_1"}
        supplies={[
          ...loadoutBinocular(),
          ...loadoutAk74u(),
          ...loadoutFort(),
          ...loadoutF1Grenades(),
          ...loadoutCharacterFoodWithoutAlcohol(),
          ...loadoutCharacterDrugsExtended(),
          ...loadoutCharacterDrugsMilitary(),
        ]}
      >
        <CharacterProfileCriticals />
        <StartDialog>pri_a15_sokolov_start_dialog</StartDialog>
        <ActorDialog>pri_a15_sokolov_pripyat_ready</ActorDialog>
        <ActorDialog>pri_a15_sokolov_evacuation_point</ActorDialog>
        <ActorDialog>pri_a15_sokolov_evacuation_note</ActorDialog>
        <ActorDialog>actor_break_dialog</ActorDialog>
      </SpecificCharacter>

      <SpecificCharacter
        id={"pri_a15_sokolov_sci_head"}
        class={"pri_a15_sokolov_sci_head"}
        name={"pri_a15_sokolov_name"}
        icon={"ui_inGame2_Sokolov"}
        community={communities.army}
        rank={50}
        soundConfig={"characters_voice\\human_01\\military\\"}
        visual={"actors\\stalker_soldier\\stalker_soldier_1_face_1"}
        supplies={[
          ...loadoutBinocular(),
          ...loadoutAk74u(),
          ...loadoutFort(),
          ...loadoutF1Grenades(),
          ...loadoutCharacterFoodWithoutAlcohol(),
          ...loadoutCharacterDrugsExtended(),
          ...loadoutCharacterDrugsMilitary(),
        ]}
      >
        <CharacterProfileCriticals />
        <StartDialog>pri_a15_sokolov_start_dialog</StartDialog>
        <ActorDialog>pri_a15_sokolov_pripyat_ready</ActorDialog>
        <ActorDialog>pri_a15_sokolov_evacuation_point</ActorDialog>
        <ActorDialog>pri_a15_sokolov_evacuation_note</ActorDialog>
        <ActorDialog>pri_a15_sokolov_acquaintance_after_jorney</ActorDialog>
        <ActorDialog>pri_a15_sokolov_about_journey</ActorDialog>
        <ActorDialog>pri_a15_sokolov_helicopter</ActorDialog>
        <ActorDialog>actor_break_dialog</ActorDialog>
      </SpecificCharacter>

      <SpecificCharacter
        id={"pri_a22_military_merkulov"}
        class={"pri_a22_military_merkulov"}
        name={"pri_a18_vano_in_suit_reserve_name"}
        icon={profileIcon.ui_inGame2_Soldier_4}
        community={communities.army}
        rank={40}
        soundConfig={"characters_voice\\human_03\\military\\"}
        supplies={[
          ...loadoutBinocular(),
          ...loadoutVal({ ap: true }),
          ...loadoutFort(),
          ...loadoutF1Grenades(),
          ...loadoutCharacterFoodWithoutAlcohol(),
          ...loadoutCharacterDrugsExtended(),
          ...loadoutCharacterDrugsMilitary(),
        ]}
      >
        <CharacterProfileCriticals />
        <ActorDialog>actor_break_dialog</ActorDialog>
      </SpecificCharacter>

      <SpecificCharacter
        id={"pri_a22_military_skelja"}
        class={"pri_a22_military_skelja"}
        name={"pri_a18_skorlupko_in_suit_name"}
        icon={profileIcon.ui_inGame2_Soldier_4}
        community={communities.army}
        rank={40}
        soundConfig={"characters_voice\\human_03\\military\\"}
        supplies={[
          ...loadoutBinocular(),
          ...loadoutAbakan({ scope: true, ap: true }),
          ...loadoutFort(),
          ...loadoutF1Grenades(),
          ...loadoutCharacterFoodWithoutAlcohol(),
          ...loadoutCharacterDrugsExtended(),
          ...loadoutCharacterDrugsMilitary(),
        ]}
      >
        <CharacterProfileCriticals />
        <ActorDialog>actor_break_dialog</ActorDialog>
      </SpecificCharacter>

      <SpecificCharacter
        id={"pri_a22_military_yarmoshuk"}
        class={"pri_a22_military_yarmoshuk"}
        name={"pri_a22_military_yarmoshuk_name"}
        icon={profileIcon.ui_inGame2_Soldier_3}
        community={communities.army}
        rank={30}
        soundConfig={"characters_voice\\human_03\\military\\"}
        supplies={[
          { section: questItems.pri_a25_explosive_charge_item },
          ...loadoutBinocular(),
          ...loadoutAk74(),
          ...loadoutFort(),
          ...loadoutCharacterFoodWithoutAlcohol(),
          ...loadoutCharacterDrugsExtended(),
          ...loadoutCharacterDrugsMilitary(),
        ]}
      >
        <CharacterProfileCriticals />
        <ActorDialog>actor_break_dialog</ActorDialog>
      </SpecificCharacter>

      <SpecificCharacter
        id={"pri_a15_military_recon_leader"}
        class={"pri_a15_military_recon_leader"}
        name={"pri_a15_military_recon_leader_name"}
        icon={profileIcon.ui_inGame2_Soldier_2}
        community={communities.army}
        rank={40}
        soundConfig={"characters_voice\\human_02\\military\\"}
        supplies={[
          ...loadoutBinocular(),
          ...loadoutAbakan({ scope: true }),
          ...loadoutFort(),
          ...loadoutF1Grenades(),
          ...loadoutCharacterFoodWithoutAlcohol(),
          ...loadoutCharacterDrugsExtended(),
          ...loadoutCharacterDrugsMilitary(),
        ]}
      >
        <CharacterProfileCriticals />
        <ActorDialog>actor_break_dialog</ActorDialog>
      </SpecificCharacter>

      <SpecificCharacter
        id={"pri_a15_military_recon_1"}
        class={"pri_a15_military_recon_1"}
        name={"pri_a15_military_recon_1_name"}
        icon={profileIcon.ui_inGame2_Soldier_2}
        community={communities.army}
        rank={40}
        soundConfig={"characters_voice\\human_01\\military\\"}
        supplies={[
          ...loadoutAk74({ launcher: true }),
          ...loadoutFort(),
          ...loadoutF1Grenades(),
          ...loadoutCharacterFoodWithoutAlcohol(),
          ...loadoutCharacterDrugsExtended(),
          ...loadoutCharacterDrugsMilitary(),
        ]}
      >
        <CharacterProfileCriticals />
        <ActorDialog>actor_break_dialog</ActorDialog>
      </SpecificCharacter>

      <SpecificCharacter
        id={"pri_a15_military_recon_2"}
        class={"pri_a15_military_recon_2"}
        name={"pri_a15_military_recon_2_name"}
        icon={profileIcon.ui_inGame2_Soldier_4}
        community={communities.army}
        rank={40}
        soundConfig={"characters_voice\\human_03\\military\\"}
        supplies={[
          ...loadoutVal(),
          ...loadoutFort(),
          ...loadoutF1Grenades(2),
          ...loadoutCharacterFoodWithoutAlcohol(),
          ...loadoutCharacterDrugsExtended(),
          ...loadoutCharacterDrugsMilitary(),
        ]}
      >
        <CharacterProfileCriticals />
        <ActorDialog>actor_break_dialog</ActorDialog>
      </SpecificCharacter>

      <SpecificCharacter
        id={"pri_a15_military_recon_3"}
        class={"pri_a15_military_recon_3"}
        name={"pri_a15_military_recon_3_name"}
        icon={profileIcon.ui_inGame2_Soldier_4}
        community={communities.army}
        rank={40}
        soundConfig={"characters_voice\\human_03\\military\\"}
        supplies={[
          ...loadoutVintorez(),
          ...loadoutFort(),
          ...loadoutF1Grenades(2),
          ...loadoutCharacterFood(),
          ...loadoutCharacterDrugsBase(),
        ]}
      >
        <CharacterProfileCriticals />
        <ActorDialog>actor_break_dialog</ActorDialog>
      </SpecificCharacter>

      <SpecificCharacter
        id={"pri_a21_sentry_lieutenant_stecenko"}
        class={"pri_a21_sentry_lieutenant_stecenko"}
        name={"pri_a21_sentry_lieutenant_stecenko_name"}
        icon={profileIcon.ui_inGame2_Soldier_2}
        community={communities.army}
        rank={40}
        soundConfig={"characters_voice\\human_02\\military\\"}
        supplies={[
          ...loadoutTorch(),
          ...loadoutAk74u(),
          ...loadoutF1Grenades(2),
          ...loadoutCharacterFood(),
          ...loadoutCharacterDrugsBase(),
          ...loadoutCharacterDrugsMilitary(),
        ]}
      >
        <CharacterProfileCriticals />
        <ActorDialog>actor_break_dialog</ActorDialog>
      </SpecificCharacter>

      <SpecificCharacter
        id={"pri_a25_army_medic"}
        class={"pri_a25_army_medic"}
        name={"pri_a25_army_medic_name"}
        icon={"ui_inGame2_Rogovets"}
        community={communities.army}
        rank={40}
        soundConfig={"characters_voice\\human_02\\military\\"}
        visual={"actors\\stalker_soldier\\stalker_soldier_2_face_1"}
        supplies={[
          ...loadoutBinocular(),
          ...loadoutAbakan({ scope: true }),
          ...loadoutFort(),
          ...loadoutF1Grenades(2),
          ...loadoutCharacterFood(),
          ...loadoutCharacterDrugsElite(),
          ...loadoutCharacterDrugsMilitary(),
          ...loadoutCharacterDrugsScientific(),
        ]}
      >
        <CharacterProfileCriticals />
        <StartDialog>pri_a25_army_medic_start_dialog</StartDialog>
        <ActorDialog>pri_a25_army_medic_rescued</ActorDialog>
        <ActorDialog>pri_a25_army_medic_supply_medicine</ActorDialog>
        <ActorDialog>pri_a25_army_medic_need_health_care</ActorDialog>
        <ActorDialog>actor_break_dialog</ActorDialog>
      </SpecificCharacter>

      <SpecificCharacter
        id={"pri_b306_envoy"}
        class={"pri_b306_envoy"}
        name={"pri_b306_envoy_name"}
        icon={"ui_inGame2_ecolog_military"}
        community={communities.killer}
        rank={60}
        soundConfig={"characters_voice\\human_03\\military\\"}
        visual={"actors\\stalker_soldier\\stalker_ecolog_military"}
        supplies={[
          { section: questItems.pri_b306_envoy_pda },
          ...loadoutCharacterItemsWithoutDetector(),
          ...loadoutCharacterFood(),
          ...loadoutCharacterDrugsElite(),
          ...loadoutCharacterDrugsScientific(),
        ]}
      >
        <CharacterProfileCriticals />
        <DefaultCharacterDialogs />
      </SpecificCharacter>

      <SpecificCharacter
        id={"pri_a15_actor"}
        class={"pri_a15_actor"}
        name={"st_actor_name"}
        icon={"ui_inGame2_Hero"}
        community={communities.stalker}
        soundConfig={"characters_voice\\human_02\\stalker\\"}
        visual={"actors\\stalker_hero\\stalker_hero_1"}
        supplies={[
          { section: misc.device_torch },
          { section: questItems.pri_a15_wpn_ak74 },
          { section: questItems.pri_a15_documents },
          ...loadoutCharacterItems(),
          ...loadoutCharacterFood(),
          ...loadoutCharacterDrugsBase(),
        ]}
      >
        <CharacterProfileCriticals />
      </SpecificCharacter>

      <SpecificCharacter
        id={"pri_a15_vano"}
        class={"pri_a15_vano"}
        name={"jup_a10_stalker_vano"}
        icon={"ui_npc_u_soldier_1"}
        community={communities.stalker}
        rank={20}
        soundConfig={"characters_voice\\human_01\\stalker\\"}
        visual={"actors\\stalker_neutral\\stalker_neutral_nauchniy_face_1"}
        supplies={[
          { section: misc.device_torch },
          { section: questItems.pri_a15_wpn_wincheaster1300 },
          ...loadoutCharacterItems(),
          ...loadoutCharacterFood(),
          ...loadoutCharacterDrugsBase(),
        ]}
      >
        <CharacterProfileCriticals />
      </SpecificCharacter>

      <SpecificCharacter
        id={"pri_a15_sokolov_scene"}
        class={"pri_a15_sokolov_scene"}
        name={"pri_a15_sokolov_name"}
        icon={"ui_inGame2_Sokolov_ecolog"}
        community={communities.army}
        rank={30}
        soundConfig={"characters_voice\\human_01\\military\\"}
        visual={"actors\\stalker_soldier\\stalker_soldier_ecolog_face_1"}
        supplies={[
          { section: misc.device_torch },
          { section: questItems.pri_a15_wpn_ak74u },
          ...loadoutCharacterItems(),
          ...loadoutCharacterFood(),
          ...loadoutCharacterDrugsBase(),
        ]}
      >
        <CharacterProfileCriticals />
      </SpecificCharacter>

      <SpecificCharacter
        id={"pri_a15_zulus"}
        class={"pri_a15_zulus"}
        name={"jup_b15_zulus"}
        icon={"ui_inGame2_Zulus"}
        community={communities.stalker}
        rank={50}
        soundConfig={"characters_voice\\human_02\\dolg\\"}
        visual={"actors\\stalker_dolg\\stalker_dolg_1_face_1"}
        supplies={[
          { section: misc.device_torch },
          { section: weapons.wpn_pkm_zulus },
          { section: ammo.ammo_pkm_100 },
          ...loadoutCharacterItems(),
          ...loadoutCharacterFood(),
          ...loadoutCharacterDrugsBase(),
        ]}
      >
        <CharacterProfileCriticals />
      </SpecificCharacter>

      <SpecificCharacter
        id={"pri_a15_wanderer"}
        class={"pri_a15_wanderer"}
        name={"jup_b4_monolith_squad_leader_name"}
        icon={"ui_inGame2_Brodyaga_monolit"}
        community={communities.stalker}
        rank={100}
        soundConfig={"characters_voice\\human_02\\dolg\\"}
        visual={"actors\\stalker_monolith\\stalker_monolith_1_face_1"}
        supplies={[
          { section: questItems.pri_a15_wpn_svu },
          ...loadoutTorch(),
          ...loadoutPkm(),
          ...loadoutCharacterItems(),
          ...loadoutCharacterFood(),
          ...loadoutCharacterDrugsBase(),
        ]}
      >
        <CharacterProfileCriticals />
      </SpecificCharacter>

      <SpecificCharacter
        id={"pri_a15_military_tarasov"}
        class={"pri_a15_military_tarasov"}
        name={"pri_a17_military_captain_tarasov"}
        icon={profileIcon.ui_inGame2_Soldier_2}
        community={communities.army}
        rank={30}
        soundConfig={"characters_voice\\human_02\\military\\"}
        supplies={[
          ...loadoutAk74(),
          ...loadoutCharacterItems(),
          ...loadoutCharacterFood(),
          ...loadoutCharacterDrugsBase(),
        ]}
      >
        <CharacterProfileCriticals />
      </SpecificCharacter>

      <SpecificCharacter
        id={"pri_a15_military_2"}
        class={"pri_a15_military_2"}
        name={"pri_a17_military_prapor_valentyr"}
        icon={profileIcon.ui_inGame2_Soldier_4}
        community={communities.army}
        rank={40}
        soundConfig={"characters_voice\\human_03\\military\\"}
        supplies={[
          ...loadoutAk74(),
          ...loadoutCharacterItems(),
          ...loadoutCharacterFood(),
          ...loadoutCharacterDrugsBase(),
        ]}
      >
        <CharacterProfileCriticals />
      </SpecificCharacter>

      <SpecificCharacter
        id={"pri_a15_military_3"}
        class={"pri_a15_military_3"}
        name={"pri_a17_military_sergeant_morozov"}
        icon={profileIcon.ui_inGame2_Soldier_2}
        community={communities.army}
        rank={40}
        soundConfig={"characters_voice\\human_01\\military\\"}
        supplies={[
          ...loadoutAk74(),
          ...loadoutCharacterItems(),
          ...loadoutCharacterFood(),
          ...loadoutCharacterDrugsBase(),
        ]}
      >
        <CharacterProfileCriticals />
      </SpecificCharacter>

      <SpecificCharacter
        id={"pri_a15_military_4"}
        class={"pri_a15_military_4"}
        name={"pri_a17_military_lieutenant_podorojniy"}
        icon={profileIcon.ui_inGame2_Soldier_3}
        community={communities.army}
        rank={40}
        soundConfig={"characters_voice\\human_03\\military\\"}
        supplies={[
          ...loadoutAk74(),
          ...loadoutCharacterItems(),
          ...loadoutCharacterFood(),
          ...loadoutCharacterDrugsBase(),
        ]}
      >
        <CharacterProfileCriticals />
      </SpecificCharacter>

      <SpecificCharacter
        id={"pri_a22_army_signaller"}
        class={"pri_a22_army_signaller"}
        name={"st_pri_a22_army_signaller"}
        icon={profileIcon.ui_inGame2_Soldier_2}
        community={communities.army}
        mechanicMode={true}
        rank={40}
        moneyMin={1000}
        moneyMax={5000}
        soundConfig={"characters_voice\\human_01\\military\\"}
        supplies={[
          { section: misc.hand_radio },
          ...loadoutBinocular(),
          ...loadoutGroza(),
          ...loadoutFort(),
          ...loadoutF1Grenades(),
          ...loadoutCharacterFoodWithoutAlcohol(),
          ...loadoutCharacterDrugsExtended(),
          ...loadoutCharacterDrugsMilitary(),
        ]}
      >
        <CharacterProfileCriticals />
        <StartDialog>pri_a22_army_signaller_start_dialog</StartDialog>
        <ActorDialog>pri_a22_army_signaller_about_rfi_source</ActorDialog>
        <ActorDialog>pri_a22_army_signaller_about_signal</ActorDialog>
        <ActorDialog>pri_a22_army_signaller_supply_outfit</ActorDialog>
        <ActorDialog>pri_a22_army_signaller_supply_ammo</ActorDialog>
        <ActorDialog>pri_a22_army_signaller_supply_grenade</ActorDialog>
        <ActorDialog>actor_break_dialog</ActorDialog>
      </SpecificCharacter>

      <SpecificCharacter
        id={"pri_b35_merc_leader"}
        class={"pri_b35_merc_leader"}
        name={"st_pri_b35_merc_leader"}
        icon={"ui_inGame2_merc_4"}
        community={communities.killer}
        mechanicMode={true}
        rank={50}
        soundConfig={"characters_voice\\human_03\\killer\\"}
        visual={"actors\\stalker_merc\\stalker_merc_4"}
        supplies={[
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
      </SpecificCharacter>

      <SpecificCharacter
        id={"pri_b35_merc_grenade_launcher_1"}
        class={"pri_b35_merc_grenade_launcher_1"}
        name={GENERATE_STALKER_NAME}
        icon={profileIcon.ui_inGame2_merc_2}
        community={communities.killer}
        mechanicMode={true}
        rank={50}
        soundConfig={"characters_voice\\human_03\\killer\\"}
        supplies={[
          ...loadoutRpg7(),
          ...loadoutUsp(),
          ...loadoutRgd5Grenades(),
          ...loadoutCharacterItemsWithoutDetector(),
          ...loadoutCharacterFood(),
          ...loadoutCharacterDrugsAdvanced(),
          ...loadoutCharacterDrugsScientific(),
        ]}
      >
        <CharacterProfileCriticals />
        <DefaultCharacterDialogs />
      </SpecificCharacter>

      <SpecificCharacter
        id={"pri_b35_merc_grenade_launcher_2"}
        class={"pri_b35_merc_grenade_launcher_2"}
        name={GENERATE_STALKER_NAME}
        icon={profileIcon.ui_inGame2_merc_2}
        community={communities.killer}
        mechanicMode={true}
        rank={50}
        soundConfig={"characters_voice\\human_03\\killer\\"}
        supplies={[
          ...loadoutRpg7(),
          ...loadoutUsp(),
          ...loadoutRgd5Grenades(),
          ...loadoutCharacterItemsWithoutDetector(),
          ...loadoutCharacterFood(),
          ...loadoutCharacterDrugsAdvanced(),
          ...loadoutCharacterDrugsScientific(),
        ]}
      >
        <CharacterProfileCriticals />
        <DefaultCharacterDialogs />
      </SpecificCharacter>

      <SpecificCharacter
        id={"pri_b35_envoy"}
        class={"pri_b35_envoy"}
        name={"st_pri_b35_envoy"}
        icon={"ui_inGame2_ecolog_military"}
        community={communities.killer}
        mechanicMode={true}
        rank={30}
        soundConfig={"characters_voice\\human_03\\stalker\\"}
        visual={"actors\\stalker_soldier\\stalker_ecolog_military"}
        supplies={[
          { section: questItems.pri_b35_lab_x8_key },
          ...loadoutUsp(),
          ...loadoutCharacterItemsWithoutDetector(),
          ...loadoutCharacterFood(),
          ...loadoutCharacterDrugsElite(),
          ...loadoutCharacterDrugsScientific(),
        ]}
      >
        <CharacterProfileCriticals />
        <DefaultCharacterDialogs />
      </SpecificCharacter>

      <SpecificCharacter
        id={"pri_b35_guard_envoy_1"}
        class={"pri_b35_guard_envoy_1"}
        name={GENERATE_STALKER_NAME}
        icon={"ui_inGame2_ecolog_military"}
        community={communities.killer}
        mechanicMode={true}
        rank={50}
        soundConfig={"characters_voice\\human_03\\stalker\\"}
        visual={"actors\\stalker_soldier\\stalker_ecolog_military"}
        supplies={[
          ...loadoutLr300({ scope: true, ap: true }),
          ...loadoutUsp(),
          ...loadoutCharacterItemsWithoutDetector(),
          ...loadoutCharacterFood(),
          ...loadoutCharacterDrugsElite(),
          ...loadoutCharacterDrugsScientific(),
        ]}
      >
        <CharacterProfileCriticals />
        <DefaultCharacterDialogs />
      </SpecificCharacter>

      <SpecificCharacter
        id={"pri_b35_guard_envoy_2"}
        class={"pri_b35_guard_envoy_2"}
        name={GENERATE_STALKER_NAME}
        icon={"ui_inGame2_ecolog_military"}
        community={communities.killer}
        mechanicMode={true}
        rank={50}
        soundConfig={"characters_voice\\human_03\\stalker\\"}
        visual={"actors\\stalker_soldier\\stalker_ecolog_military"}
        supplies={[
          ...loadoutLr300({ scope: true, ap: true }),
          ...loadoutUsp(),
          ...loadoutCharacterItemsWithoutDetector(),
          ...loadoutCharacterFood(),
          ...loadoutCharacterDrugsElite(),
          ...loadoutCharacterDrugsScientific(),
        ]}
      >
        <CharacterProfileCriticals />
        <DefaultCharacterDialogs />
      </SpecificCharacter>

      <SpecificCharacter
        id={"pri_b36_monolith_sniper"}
        class={"pri_b36_monolith_sniper"}
        name={GENERATE_STALKER_NAME}
        icon={profileIcon.ui_inGame2_monolit_2}
        community={communities.monolith}
        mechanicMode={true}
        rank={80}
        soundConfig={"characters_voice\\human_02\\monolith\\"}
        supplies={[
          ...loadoutSvd(),
          ...loadoutColt1911(true),
          ...loadoutF1Grenades(),
          ...loadoutCharacterItemsWithoutDetector(),
          ...loadoutCharacterFood(),
          ...loadoutCharacterDrugsExtended(),
        ]}
      >
        <CharacterProfileCriticals />
      </SpecificCharacter>

      <SpecificCharacter
        id={"pri_b36_monolith_master_hiding_place"}
        class={"pri_b36_monolith_master_hiding_place"}
        name={GENERATE_STALKER_NAME}
        icon={profileIcon.ui_inGame2_monolit_3}
        community={communities.monolith}
        mechanicMode={true}
        rank={60}
        soundConfig={"characters_voice\\human_02\\monolith\\"}
        supplies={[
          { section: questItems.pri_b36_monolith_hiding_place_pda },
          ...loadoutProtecta(true),
          ...loadoutDesertEagle(true),
          ...loadoutF1Grenades(),
          ...loadoutF1Grenades(),
          ...loadoutCharacterItemsWithoutDetector(),
          ...loadoutCharacterFood(),
          ...loadoutCharacterDrugsAdvanced(),
        ]}
      >
        <CharacterProfileCriticals />
      </SpecificCharacter>

      <SpecificCharacter
        id={"pri_b36_monolith_marine_sniper"}
        class={"pri_b36_monolith_marine_sniper"}
        name={GENERATE_STALKER_NAME}
        icon={profileIcon.ui_inGame2_monolit_3}
        community={communities.monolith}
        mechanicMode={true}
        rank={80}
        soundConfig={"characters_voice\\human_02\\monolith\\"}
        supplies={[
          ...loadoutVintorez(true),
          ...loadoutColt1911(true),
          ...loadoutF1Grenades(),
          ...loadoutCharacterItemsWithoutDetector(),
          ...loadoutCharacterFood(),
          ...loadoutCharacterDrugsAdvanced(),
        ]}
      >
        <CharacterProfileCriticals />
      </SpecificCharacter>

      <SpecificCharacter
        id={"pri_b305_strelok"}
        class={"pri_b305_strelok"}
        name={"pri_b305_strelok_name"}
        icon={"ui_inGame2_Strelok"}
        community={communities.stalker}
        mechanicMode={true}
        rank={100}
        soundConfig={"characters_voice\\human_02\\stalker\\"}
        visual={"actors\\stalker_neutral\\stalker_neutral_nauchniy_face_2"}
        supplies={[
          ...loadoutDetectorElite(),
          ...loadoutBinocular(),
          ...loadoutTorch(),
          ...loadoutAk74u(true),
          ...loadoutColt1911(true),
          ...loadoutCharacterFoodWithoutAlcohol(),
          ...loadoutCharacterDrugsElite(),
          ...loadoutCharacterDrugsScientific(),
          ...loadoutCharacterDrugsMilitary(),
        ]}
      >
        <CharacterProfileCriticals />
        <StartDialog>pri_b305_strelok_dialog</StartDialog>
        <ActorDialog>pri_b305_strelok_about_information</ActorDialog>
        <ActorDialog>pri_b305_strelok_about_station</ActorDialog>
        <ActorDialog>pri_b305_strelok_about_base</ActorDialog>
        <ActorDialog>pri_b305_strelok_note</ActorDialog>
        <ActorDialog>actor_break_dialog</ActorDialog>
      </SpecificCharacter>

      <SpecificCharacter
        id={"pri_a28_evac_com"}
        class={"pri_a28_evac_com"}
        name={"pri_a28_evac_com_name"}
        icon={profileIcon.ui_inGame2_Soldier_2}
        community={communities.army}
        mechanicMode={true}
        rank={50}
        soundConfig={"characters_voice\\human_02\\military\\"}
        supplies={[
          ...loadoutAbakan({ ap: true, scope: true }),
          ...loadoutFort(true),
          ...loadoutF1Grenades(),
          ...loadoutCharacterItemsWithoutDetector(),
          ...loadoutCharacterFoodWithoutAlcohol(),
          ...loadoutCharacterDrugsElite(),
          ...loadoutCharacterDrugsMilitary(),
        ]}
      >
        <CharacterProfileCriticals />
        <ActorDialog>actor_break_dialog</ActorDialog>
      </SpecificCharacter>

      <SpecificCharacter
        id={"sim_default_stalker_pri_a16"}
        class={"sim_default_stalker_pri_a16"}
        name={GENERATE_STALKER_NAME}
        icon={profileIcon.ui_inGame2_neutral_nauchniy}
        community={communities.stalker}
        mechanicMode={true}
        rank={60}
        moneyMin={5000}
        moneyMax={10000}
        soundConfig={"characters_voice\\human_03\\stalker\\"}
        supplies={[
          ...loadoutVintorez(true),
          ...loadoutSig220({ ap: true }),
          ...loadoutF1Grenades(4),
          ...loadoutCharacterItems3(),
          ...loadoutCharacterFood(),
          ...loadoutCharacterDrugsElite(),
          ...loadoutCharacterDrugsScientific(),
          ...loadoutCharacterSellWeapons(),
        ]}
      >
        <CharacterProfileCriticals />
        <DefaultCharacterDialogsNoGuide />
      </SpecificCharacter>
    </xml>
  );
}
