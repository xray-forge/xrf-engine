import {
  CScriptXmlInit,
  CUICheckButton,
  CUIComboBox,
  CUIScrollView,
  CUIStatic,
  CUITabControl,
  CUITrackBar,
  CUIWindow,
  LuabindClass,
} from "xray16";
import { create2dVector, TCoordinate, TName } from "xray16/lib";

import { Options } from "@/engine/core/ui/menu/options/Options";
import {
  preconditionOnly1mode,
  preconditionOnly25andLessModeVisible,
  preconditionOnly25andMoreMode,
  preconditionOnly2aAndMoreMode,
  preconditionOnly2andMoreMode,
  preconditionOnly3andMoreMode,
  preconditionOnly3andMoreModeVisible,
  preconditionOnly4andMoreMode,
} from "@/engine/core/ui/menu/options/options_preconditions";

/**
 * Advanced section from video option menu.
 */
@LuabindClass()
export class OptionsVideoAdvanced extends CUIWindow {
  public scrollView!: CUIScrollView;

  public constructor() {
    super();
    this.SetWindowName(this.__name);
  }

  public initialize(x: TCoordinate, y: TCoordinate, xml: CScriptXmlInit, owner: Options): void {
    this.SetWndPos(create2dVector(x, y));
    this.SetWndSize(create2dVector(738, 416));
    this.SetAutoDelete(true);

    this.scrollView = xml.InitScrollView("video_adv:scroll_v", this);

    this.createTrackBar(xml, this.scrollView, "video_adv:cap_fov", "video_adv:track_fov");
    this.createTrackBar(xml, this.scrollView, "video_adv:cap_hud_fov", "video_adv:track_hud_fov");
    this.createTrackBar(xml, this.scrollView, "video_adv:cap_fps_limit", "video_adv:track_fps_limit");
    this.createTrackBar(xml, this.scrollView, "video_adv:cap_fps_limit_in_menu", "video_adv:track_fps_limit_in_menu");
    this.createTrackBar(xml, this.scrollView, "video_adv:cap_vis_dist", "video_adv:track_vis_dist");
    this.createTrackBar(xml, this.scrollView, "video_adv:cap_geometry_lod", "video_adv:track_geometry_lod");

    const textureLod: CUIStatic = xml.InitStatic("video_adv:templ_item", this.scrollView);

    xml.InitStatic("video_adv:cap_texture_lod", textureLod);
    owner.uiTextureLodTrackBar = xml.InitTrackBar("video_adv:track_texture_lod", textureLod);

    this.createTrackBar(xml, this.scrollView, "video_adv:cap_aniso", "video_adv:track_aniso");

    const sSampling: CUIStatic = xml.InitStatic("video_adv:templ_item", this.scrollView);

    xml.InitStatic("video_adv:cap_ssample", sSampling);

    const sSamplingTrack: CUITrackBar = xml.InitTrackBar("video_adv:track_ssample", sSampling);

    owner.uiSSamplingTrackBar = sSamplingTrack;
    owner.Register(sSamplingTrack, "trb_ssample");
    owner.preconditions.set(sSamplingTrack, preconditionOnly25andLessModeVisible);

    const sSamplingComboBox: CUIComboBox = xml.InitComboBox("video_adv:combo_ssample", sSampling);

    owner.uiSSamplingComboBox = sSamplingComboBox;
    owner.Register(sSamplingComboBox, "cb_ssample");
    owner.preconditions.set(sSamplingComboBox, preconditionOnly3andMoreModeVisible);

    this.createTrackBar(xml, this.scrollView, "video_adv:cap_detail_density", "video_adv:track_detail_density");
    this.createTrackBar(xml, this.scrollView, "video_adv:cap_detail_height", "video_adv:track_detail_height");
    this.createTrackBar(xml, this.scrollView, "video_adv:cap_detail_radius", "video_adv:track_detail_radius");

    const r2Sun: CUIStatic = xml.InitStatic("video_adv:templ_item", this.scrollView);

    xml.InitStatic("video_adv:cap_r2_sun", r2Sun);

    const r2SunCheck: CUIStatic = xml.InitCheck("video_adv:check_r2_sun", r2Sun);

    owner.preconditions.set(r2SunCheck, preconditionOnly2andMoreMode);

    // -- r2_sun_details			=>r2
    const grassShadow: CUIStatic = xml.InitStatic("video_adv:templ_item", this.scrollView);

    xml.InitStatic("video_adv:cap_r2_sun_details", grassShadow);

    const grassShadowCheck: CUICheckButton = xml.InitCheck("video_adv:check_r2_sun_details", grassShadow);

    owner.preconditions.set(grassShadowCheck, preconditionOnly2andMoreMode);

    const lightDistance: CUIStatic = xml.InitStatic("video_adv:templ_item", this.scrollView);

    xml.InitStatic("video_adv:cap_light_distance", lightDistance);

    const lightDistanceTrack: CUITrackBar = xml.InitTrackBar("video_adv:track_light_distance", lightDistance);

    owner.preconditions.set(lightDistanceTrack, preconditionOnly2aAndMoreMode);

    const particlesDistance: CUIStatic = xml.InitStatic("video_adv:templ_item", this.scrollView);

    xml.InitStatic("video_adv:cap_particles_distance", particlesDistance);

    const particlesDistanceTrackBar: CUITrackBar = xml.InitTrackBar(
      "video_adv:track_particles_distance",
      particlesDistance
    );

    owner.preconditions.set(particlesDistanceTrackBar, preconditionOnly2aAndMoreMode);

    const shadowMapSetting: CUIStatic = xml.InitStatic("video_adv:templ_item", this.scrollView);

    xml.InitStatic("video_adv:cap_r2_smap_size", shadowMapSetting);
    xml.InitComboBox("video_adv:list_r2_smap_size", shadowMapSetting);

    const npcTorchSetting: CUIStatic = xml.InitStatic("video_adv:templ_item", this.scrollView);

    xml.InitStatic("video_adv:cap_npc_torch", npcTorchSetting);
    xml.InitCheck("video_adv:check_npc_torch", npcTorchSetting);

    // -- r1_detail_textures	r1 only
    const detailedTextures: CUIStatic = xml.InitStatic("video_adv:templ_item", this.scrollView);

    xml.InitStatic("video_adv:cap_r1_detail_textures", detailedTextures);

    const detailedTexturesCheck: CUICheckButton = xml.InitCheck("video_adv:check_r1_detail_textures", detailedTextures);

    owner.preconditions.set(detailedTexturesCheck, preconditionOnly1mode);

    // -- r2_detail_bump			=>r2
    const detailedBump: CUIStatic = xml.InitStatic("video_adv:templ_item", this.scrollView);

    xml.InitStatic("video_adv:cap_r2_detail_bump", detailedBump);

    const detailedBumpCheck: CUICheckButton = xml.InitCheck("video_adv:check_r2_detail_bump", detailedBump);

    owner.preconditions.set(detailedBumpCheck, preconditionOnly2andMoreMode);

    // -- r2_steep_parallax		>r2
    const steepParallax: CUIStatic = xml.InitStatic("video_adv:templ_item", this.scrollView);

    xml.InitStatic("video_adv:cap_r2_steep_parallax", steepParallax);

    const steepParallaxCheck: CUICheckButton = xml.InitCheck("video_adv:check_r2_steep_parallax", steepParallax);

    owner.preconditions.set(steepParallaxCheck, preconditionOnly25andMoreMode);

    const sunQuality: CUIStatic = xml.InitStatic("video_adv:templ_item", this.scrollView);

    xml.InitStatic("video_adv:cap_r2_sun_quality", sunQuality);

    const sunQualitySelect: CUIComboBox = xml.InitComboBox("video_adv:list_r2_sun_quality", sunQuality);

    owner.preconditions.set(sunQualitySelect, preconditionOnly25andMoreMode);

    const sunShafts: CUIStatic = xml.InitStatic("video_adv:templ_item", this.scrollView);

    xml.InitStatic("video_adv:cap_sun_shafts", sunShafts);

    const sunShaftsSelect: CUIComboBox = xml.InitComboBox("video_adv:combo_sun_shafts", sunShafts);

    owner.preconditions.set(sunShaftsSelect, preconditionOnly25andMoreMode);

    const ao: CUIStatic = xml.InitStatic("video_adv:templ_item", this.scrollView);

    ao.SetWndSize(create2dVector(ao.GetWidth(), 106));
    xml.InitStatic("video_adv:cap_ao", ao);

    const aoTab: CUITabControl = xml.InitTab("video_adv:radio_tab_ao_options", ao);

    owner.preconditions.set(aoTab, preconditionOnly25andMoreMode);

    const ssao: CUIStatic = xml.InitStatic("video_adv:templ_item", this.scrollView);

    xml.InitStatic("video_adv:cap_ssao", ssao);

    const ssaoSelect: CUIComboBox = xml.InitComboBox("video_adv:combo_ssao", ssao);

    owner.preconditions.set(ssaoSelect, preconditionOnly25andMoreMode);

    const softWater: CUIStatic = xml.InitStatic("video_adv:templ_item", this.scrollView);

    xml.InitStatic("video_adv:cap_soft_water", softWater);

    const softWaterCheck: CUICheckButton = xml.InitCheck("video_adv:check_soft_water", softWater);

    owner.preconditions.set(softWaterCheck, preconditionOnly25andMoreMode);

    const softParticles: CUIStatic = xml.InitStatic("video_adv:templ_item", this.scrollView);

    xml.InitStatic("video_adv:cap_soft_particles", softParticles);

    const softParticlesCheck: CUICheckButton = xml.InitCheck("video_adv:check_soft_particles", softParticles);

    owner.preconditions.set(softParticlesCheck, preconditionOnly25andMoreMode);

    const dof: CUIStatic = xml.InitStatic("video_adv:templ_item", this.scrollView);

    xml.InitStatic("video_adv:cap_dof", dof);

    const dofCheck: CUICheckButton = xml.InitCheck("video_adv:check_dof", dof);

    owner.preconditions.set(dofCheck, preconditionOnly25andMoreMode);

    const volumetricLight: CUIStatic = xml.InitStatic("video_adv:templ_item", this.scrollView);

    xml.InitStatic("video_adv:cap_volumetric_light", volumetricLight);

    const volumetricLightCheck: CUICheckButton = xml.InitCheck("video_adv:check_volumetric_light", volumetricLight);

    owner.preconditions.set(volumetricLightCheck, preconditionOnly25andMoreMode);

    // -- r3_dynamic_wet_surfaces	>r25
    const wetSurfaces: CUIStatic = xml.InitStatic("video_adv:templ_item", this.scrollView);

    xml.InitStatic("video_adv:cap_r3_dynamic_wet_surfaces", wetSurfaces);

    const wetSurfacesCheck: CUICheckButton = xml.InitCheck("video_adv:check_r3_dynamic_wet_surfaces", wetSurfaces);

    owner.preconditions.set(wetSurfacesCheck, preconditionOnly3andMoreMode);

    /*
     *
     *  _st = xml:InitStatic("video_adv:templ_item", nil)
     *  xml:InitStatic("video_adv:cap_r3_dynamic_wet_surfaces_near", _st)
     *  ctl = xml:InitTrackBar("video_adv:track_r3_dynamic_wet_surfaces_near", _st)
     *  handler.track_r3_dyn_wet_surf_near = ctl
     *  handler:Register(ctl, "track_r3_dyn_wet_surf_near")
     *  table.insert(handler.m_preconditions, {func=mode_ge_3, control=_st})
     */

    // -- r3_volumetric_smoke		>r25
    const volumetricSmoke: CUIStatic = xml.InitStatic("video_adv:templ_item", this.scrollView);

    xml.InitStatic("video_adv:cap_r3_volumetric_smoke", volumetricSmoke);

    const volumetricSmokeCheck: CUICheckButton = xml.InitCheck("video_adv:check_r3_volumetric_smoke", volumetricSmoke);

    owner.preconditions.set(volumetricSmokeCheck, preconditionOnly3andMoreMode);

    /*    const msaaSetting: CUIStatic = xml.InitStatic("video_adv:templ_item", this.scrollView);

    xml.InitStatic("video_adv:cap_r3_msaa_opt", msaaSetting);
    xml.InitCheck("video_adv:check_r3_msaa_opt", msaaSetting);

    owner.preconditions.set(msaaSetting, preconditionOnly3Mode);*/

    const tesselationSetting: CUIStatic = xml.InitStatic("video_adv:templ_item", this.scrollView);

    xml.InitStatic("video_adv:cap_r4_tessellation", tesselationSetting);
    xml.InitCheck("video_adv:check_r4_tessellation", tesselationSetting);

    owner.preconditions.set(tesselationSetting, preconditionOnly4andMoreMode);

    const vSyncSetting: CUIStatic = xml.InitStatic("video_adv:templ_item", this.scrollView);

    xml.InitStatic("video_adv:cap_vsync", vSyncSetting);
    xml.InitCheck("video_adv:check_vsync", vSyncSetting);

    const alwaysActiveSetting: CUIStatic = xml.InitStatic("video_adv:templ_item", this.scrollView);

    xml.InitStatic("video_adv:cap_always_active", alwaysActiveSetting);
    xml.InitCheck("video_adv:check_always_active", alwaysActiveSetting);

    owner.Register(xml.Init3tButton("video_adv:btn_to_simply", this), "btn_simply_graphic");
  }

  protected createTrackBar(xml: CScriptXmlInit, base: CUIWindow, caption: TName, track: TName): void {
    const wrapper: CUIStatic = xml.InitStatic("video_adv:templ_item", base);

    xml.InitStatic(caption, wrapper);
    xml.InitTrackBar(track, wrapper);
  }
}
