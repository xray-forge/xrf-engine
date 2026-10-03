import { JSXNode, JSXXML } from "jsx-xml";

/**
 * Create the advanced video options menu section UI.
 *
 * @returns Rendered advanced video options section component.
 */
export function OptionsVideoAdvanced(): JSXNode {
  return (
    <video_adv>
      <scroll_v
        x={"-4"}
        y={"0"}
        width={"360"}
        height={"320"}
        right_ident={"0"}
        left_ident={"0"}
        top_indent={"0"}
        bottom_indent={"0"}
        vert_interval={"0"}
        always_show_scroll={"0"}
      />

      <templ_item width={"360"} height={"30"} />

      <cap_fov x={"16"} y={"3"} width={"108"} height={"24"}>
        <text r={"170"} g={"170"} b={"170"} font={"letterica16"} align={"r"} vert_align={"c"}>
          ui_mm_fov
        </text>
      </cap_fov>
      <track_fov x={"144"} y={"5"} width={"160"} height={"20"} min={"55.0"} max={"115.0"} step={"1.0"}>
        <options_item entry={"fov"} group={"mm_opt_gameplay"} />
        <output_wnd x={"165"} y={"0"} width={"20"} height={"20"} format={"%.0f"}>
          <text r={"170"} g={"170"} b={"170"} font={"letterica16"} align={"r"} vert_align={"c"}>
            0
          </text>
        </output_wnd>
      </track_fov>

      <cap_hud_fov x={"16"} y={"3"} width={"108"} height={"24"}>
        <text r={"170"} g={"170"} b={"170"} font={"letterica16"} align={"r"} vert_align={"c"}>
          ui_mm_hud_fov
        </text>
      </cap_hud_fov>
      <track_hud_fov x={"144"} y={"5"} width={"160"} height={"20"} min={"0.40"} max={"1"} step={"0.01"}>
        <options_item entry={"hud_fov"} group={"mm_opt_gameplay"} />
        <output_wnd x={"165"} y={"0"} width={"20"} height={"20"} format={"%.2f"}>
          <text r={"170"} g={"170"} b={"170"} font={"letterica16"} align={"r"} vert_align={"c"}>
            0
          </text>
        </output_wnd>
      </track_hud_fov>

      <cap_fps_limit x={"16"} y={"3"} width={"108"} height={"24"}>
        <text r={"170"} g={"170"} b={"170"} font={"letterica16"} align={"r"} vert_align={"c"}>
          ui_mm_fps_limit
        </text>
      </cap_fps_limit>

      <track_fps_limit x={"144"} y={"5"} width={"160"} height={"20"} min={"30"} max={"501"} step={"1"} is_integer={"1"}>
        <options_item entry={"rs_fps_limit"} group={"mm_opt_video"} />
        <output_wnd x={"165"} y={"0"} width={"20"} height={"20"}>
          <text r={"170"} g={"170"} b={"170"} font={"letterica16"} align={"r"} vert_align={"c"}></text>
        </output_wnd>
      </track_fps_limit>

      <cap_fps_limit_in_menu x={"16"} y={"3"} width={"108"} height={"24"}>
        <text r={"170"} g={"170"} b={"170"} font={"letterica16"} align={"r"} vert_align={"c"}>
          ui_mm_fps_limit_in_menu
        </text>
      </cap_fps_limit_in_menu>

      <track_fps_limit_in_menu
        x={"144"}
        y={"5"}
        width={"160"}
        height={"20"}
        min={"30"}
        max={"501"}
        step={"1"}
        is_integer={"1"}
      >
        <options_item entry={"rs_fps_limit_in_menu"} group={"mm_opt_video"} />
        <output_wnd x={"165"} y={"0"} width={"20"} height={"20"}>
          <text r={"170"} g={"170"} b={"170"} font={"letterica16"} align={"r"} vert_align={"c"}></text>
        </output_wnd>
      </track_fps_limit_in_menu>

      <cap_vis_dist x={"16"} y={"3"} width={"108"} height={"24"}>
        <text r={"170"} g={"170"} b={"170"} font={"letterica16"} align={"r"} vert_align={"c"}>
          ui_mm_vis_distance
        </text>
      </cap_vis_dist>
      <track_vis_dist x={"144"} y={"6"} width={"188"} height={"16"} step={"0.1"}>
        <options_item entry={"rs_vis_distance"} group={"mm_opt_video_adv"} />
      </track_vis_dist>

      <cap_geometry_lod x={"16"} y={"3"} width={"108"} height={"24"}>
        <text r={"170"} g={"170"} b={"170"} font={"letterica16"} align={"r"} vert_align={"c"}>
          ui_mm_geometry_lod
        </text>
      </cap_geometry_lod>
      <track_geometry_lod x={"144"} y={"6"} width={"188"} height={"16"} step={"0.1"}>
        <options_item entry={"r__geometry_lod"} group={"mm_opt_video_adv"} />
      </track_geometry_lod>

      <cap_detail_density x={"16"} y={"3"} width={"108"} height={"24"}>
        <text r={"170"} g={"170"} b={"170"} font={"letterica16"} align={"r"} vert_align={"c"}>
          ui_mm_detail_density
        </text>
      </cap_detail_density>
      <track_detail_density x={"144"} y={"6"} width={"188"} height={"16"} step={0.02} min={0.1} max={0.99} invert={1}>
        <options_item entry={"r__detail_density"} group={"mm_opt_video_adv"} depend={"vid"} />
      </track_detail_density>

      <cap_detail_height x={"16"} y={"3"} width={"108"} height={"24"}>
        <text r={"170"} g={"170"} b={"170"} font={"letterica16"} align={"r"} vert_align={"c"}>
          ui_mm_detail_height
        </text>
      </cap_detail_height>
      <track_detail_height x={"144"} y={"6"} width={"188"} height={"16"} step={0.1} min={1} max={2}>
        <options_item entry={"r__detail_height"} group={"mm_opt_video_adv"} depend={"vid"} />
      </track_detail_height>

      <cap_detail_radius x={"16"} y={"3"} width={"108"} height={"24"}>
        <text r={"170"} g={"170"} b={"170"} font={"letterica16"} align={"r"} vert_align={"c"}>
          ui_mm_detail_radius
        </text>
      </cap_detail_radius>
      <track_detail_radius x={"144"} y={"5"} width={"160"} height={"20"} step={1} min={50} max={300} is_integer={1}>
        <options_item entry={"r__detail_radius"} group={"mm_opt_video_adv"} depend={"vid"} />
        <output_wnd x={"165"} y={"0"} width={"20"} height={"20"}>
          <text r={"170"} g={"170"} b={"170"} font={"letterica16"} align={"r"} vert_align={"c"}></text>
        </output_wnd>
      </track_detail_radius>

      <cap_texture_lod x={"16"} y={"3"} width={"108"} height={"24"}>
        <text r={"170"} g={"170"} b={"170"} font={"letterica16"} align={"r"} vert_align={"c"}>
          ui_mm_texture_quality
        </text>
      </cap_texture_lod>
      <track_texture_lod x={"144"} y={"6"} width={"188"} height={"16"} invert={"1"} step={"1"} is_integer={"1"}>
        <options_item entry={"texture_lod"} group={"mm_opt_video_adv"} depend={"restart"} />
      </track_texture_lod>

      <cap_aniso x={"16"} y={"3"} width={"108"} height={"24"}>
        <text r={"170"} g={"170"} b={"170"} font={"letterica16"} align={"r"} vert_align={"c"}>
          ui_mm_anisotropic
        </text>
      </cap_aniso>
      <track_aniso x={"144"} y={"6"} width={"188"} height={"16"} step={"1"} is_integer={"1"}>
        <options_item entry={"r__tf_aniso"} group={"mm_opt_video_adv"} />
      </track_aniso>

      <cap_ssample x={"16"} y={"3"} width={"108"} height={"24"}>
        <text r={"170"} g={"170"} b={"170"} font={"letterica16"} align={"r"} vert_align={"c"}>
          ui_mm_supersample
        </text>
      </cap_ssample>
      <track_ssample x={"144"} y={"6"} width={"188"} height={"16"} step={"1"} is_integer={"1"}>
        <options_item entry={"r__supersample"} group={"mm_opt_video_adv"} depend={"vid"} />
      </track_ssample>
      <combo_ssample x={"144"} y={"0"} width={"188"} height={"20"} list_length={"4"} always_show_scroll={"0"}>
        <options_item entry={"r3_msaa"} group={"mm_opt_video_adv"} depend={"vid"} />
        <list_font r={"170"} g={"170"} b={"170"} font={"letterica16"} />
        <text_color>
          <e r={"170"} g={"170"} b={"170"} />
          <d r={"70"} g={"70"} b={"70"} />
        </text_color>
      </combo_ssample>

      <cap_r2_sun x={"16"} y={"3"} width={"108"} height={"24"}>
        <text r={"170"} g={"170"} b={"170"} font={"letterica16"} align={"r"} vert_align={"c"}>
          ui_mm_r2_sun
        </text>
      </cap_r2_sun>
      <check_r2_sun x={"133"} y={"0"} width={"35"} stretch={"1"} height={"29"}>
        <texture>ui_inGame2_checkbox</texture>
        <options_item entry={"r2_sun"} group={"mm_opt_video"} />
      </check_r2_sun>

      <cap_r2_sun_details x={"16"} y={"3"} width={"108"} height={"24"}>
        <text r={"170"} g={"170"} b={"170"} font={"letterica16"} align={"r"} vert_align={"c"}>
          ui_mm_r2_sun_details
        </text>
      </cap_r2_sun_details>
      <check_r2_sun_details x={"133"} y={"0"} width={"35"} stretch={"1"} height={"29"}>
        <texture>ui_inGame2_checkbox</texture>
        <options_item entry={"r2_sun_details"} group={"mm_opt_video"} />
      </check_r2_sun_details>

      <cap_r1_detail_textures x={"16"} y={"3"} width={"108"} height={"24"}>
        <text r={"170"} g={"170"} b={"170"} font={"letterica16"} align={"r"} vert_align={"c"}>
          ui_mm_r1_detail_textures
        </text>
      </cap_r1_detail_textures>
      <check_r1_detail_textures x={"133"} y={"0"} width={"35"} stretch={"1"} height={"29"}>
        <texture>ui_inGame2_checkbox</texture>
        <options_item entry={"r1_detail_textures"} group={"mm_opt_video"} />
      </check_r1_detail_textures>

      <cap_r2_detail_bump x={"16"} y={"3"} width={"108"} height={"24"}>
        <text r={"170"} g={"170"} b={"170"} font={"letterica16"} align={"r"} vert_align={"c"}>
          ui_mm_r2_detail_bump
        </text>
      </cap_r2_detail_bump>
      <check_r2_detail_bump x={"133"} y={"0"} width={"35"} stretch={"1"} height={"29"}>
        <texture>ui_inGame2_checkbox</texture>
        <options_item entry={"r2_detail_bump"} group={"mm_opt_video"} />
      </check_r2_detail_bump>

      <cap_r2_steep_parallax x={"16"} y={"3"} width={"108"} height={"24"}>
        <text r={"170"} g={"170"} b={"170"} font={"letterica16"} align={"r"} vert_align={"c"}>
          ui_mm_r2_steep_parallax
        </text>
      </cap_r2_steep_parallax>
      <check_r2_steep_parallax x={"133"} y={"0"} width={"35"} stretch={"1"} height={"29"}>
        <texture>ui_inGame2_checkbox</texture>
        <options_item entry={"r2_steep_parallax"} group={"mm_opt_video"} />
      </check_r2_steep_parallax>

      <cap_r2_smap_size x={"16"} y={"3"} width={"108"} height={"24"}>
        <text r={"170"} g={"170"} b={"170"} font={"letterica16"} align={"r"} vert_align={"c"}>
          ui_mm_r2_smap_size
        </text>
      </cap_r2_smap_size>
      <list_r2_smap_size x={"144"} y={"0"} width={"188"} height={"20"} list_length={"8"}>
        <options_item entry={"r2_smap_size"} group={"mm_opt_video"} depend={"restart"} />
        <list_font r={"170"} g={"170"} b={"170"} font={"letterica16"} />
        <text_color>
          <e r={"170"} g={"170"} b={"170"} />
          <d r={"70"} g={"70"} b={"70"} />
        </text_color>
      </list_r2_smap_size>

      <cap_r2_sun_quality x={"16"} y={"3"} width={"108"} height={"24"}>
        <text r={"170"} g={"170"} b={"170"} font={"letterica16"} align={"r"} vert_align={"c"}>
          ui_mm_r2_sun_quality
        </text>
      </cap_r2_sun_quality>
      <list_r2_sun_quality x={"144"} y={"0"} width={"188"} height={"20"} list_length={"3"}>
        <options_item entry={"r2_sun_quality"} group={"mm_opt_video"} />
        <list_font r={"170"} g={"170"} b={"170"} font={"letterica16"} />
        <text_color>
          <e r={"170"} g={"170"} b={"170"} />
          <d r={"70"} g={"70"} b={"70"} />
        </text_color>
      </list_r2_sun_quality>

      <cap_r3_dynamic_wet_surfaces x={"16"} y={"3"} width={"108"} height={"24"}>
        <text r={"170"} g={"170"} b={"170"} font={"letterica16"} align={"r"} vert_align={"c"}>
          ui_mm_r3_dynamic_wet_surfaces
        </text>
      </cap_r3_dynamic_wet_surfaces>
      <check_r3_dynamic_wet_surfaces x={"133"} y={"0"} width={"35"} stretch={"1"} height={"29"}>
        <texture>ui_inGame2_checkbox</texture>
        <options_item entry={"r3_dynamic_wet_surfaces"} group={"mm_opt_video"} />
      </check_r3_dynamic_wet_surfaces>

      <cap_r3_dynamic_wet_surfaces x={"16"} y={"3"} width={"108"} height={"24"}>
        <text r={"170"} g={"170"} b={"170"} font={"letterica16"} align={"r"} vert_align={"c"}>
          ui_mm_r3_dynamic_wet_surfaces
        </text>
      </cap_r3_dynamic_wet_surfaces>
      <check_r3_dynamic_wet_surfaces x={"133"} y={"0"} width={"35"} stretch={"1"} height={"29"}>
        <texture>ui_inGame2_checkbox</texture>
        <options_item entry={"r3_dynamic_wet_surfaces"} group={"mm_opt_video"} />
      </check_r3_dynamic_wet_surfaces>

      <cap_r3_dynamic_wet_surfaces_near x={"16"} y={"3"} width={"108"} height={"24"}>
        <text r={"170"} g={"170"} b={"170"} font={"letterica16"} align={"r"} vert_align={"c"}>
          ui_mm_r3_dynamic_wet_surfaces_near
        </text>
      </cap_r3_dynamic_wet_surfaces_near>
      <track_r3_dynamic_wet_surfaces_near x={"144"} y={"6"} width={"188"} height={"16"}>
        <options_item entry={"r3_dynamic_wet_surfaces_near"} group={"mm_opt_video"} depend={"runtime"} />
      </track_r3_dynamic_wet_surfaces_near>

      <cap_r3_dynamic_wet_surfaces_far x={"16"} y={"3"} width={"108"} height={"24"}>
        <text r={"170"} g={"170"} b={"170"} font={"letterica16"} align={"r"} vert_align={"c"}>
          ui_mm_r3_dynamic_wet_surfaces_far
        </text>
      </cap_r3_dynamic_wet_surfaces_far>
      <track_r3_dynamic_wet_surfaces_far x={"144"} y={"6"} width={"188"} height={"16"}>
        <options_item entry={"r3_dynamic_wet_surfaces_far"} group={"mm_opt_video"} depend={"runtime"} />
      </track_r3_dynamic_wet_surfaces_far>

      <cap_r3_dynamic_wet_surfaces_sm_res x={"16"} y={"3"} width={"108"} height={"24"}>
        <text r={"170"} g={"170"} b={"170"} font={"letterica16"} align={"r"} vert_align={"c"}>
          ui_mm_r3_dynamic_wet_surfaces_sm_res
        </text>
      </cap_r3_dynamic_wet_surfaces_sm_res>
      <track_r3_dynamic_wet_surfaces_sm_res x={"144"} y={"6"} width={"188"} height={"16"} step={"16"} is_integer={"1"}>
        <options_item entry={"r3_dynamic_wet_surfaces_sm_res"} group={"mm_opt_video"} depend={"runtime"} />
      </track_r3_dynamic_wet_surfaces_sm_res>

      <cap_r3_volumetric_smoke x={"16"} y={"3"} width={"108"} height={"24"}>
        <text r={"170"} g={"170"} b={"170"} font={"letterica16"} align={"r"} vert_align={"c"}>
          ui_mm_r3_volumetric_smoke
        </text>
      </cap_r3_volumetric_smoke>
      <check_r3_volumetric_smoke x={"133"} y={"0"} width={"35"} stretch={"1"} height={"29"}>
        <texture>ui_inGame2_checkbox</texture>
        <options_item entry={"r3_volumetric_smoke"} group={"mm_opt_video"} />
      </check_r3_volumetric_smoke>

      <cap_light_distance x={"16"} y={"3"} width={"108"} height={"24"}>
        <text r={"170"} g={"170"} b={"170"} font={"letterica16"} align={"r"} vert_align={"c"}>
          ui_mm_light_distance
        </text>
      </cap_light_distance>
      <track_light_distance x={"144"} y={"6"} width={"188"} height={"16"}>
        <options_item entry={"r2_slight_fade"} group={"mm_opt_video_adv"} />
      </track_light_distance>

      <cap_npc_torch x={"16"} y={"3"} width={"108"} height={"24"}>
        <text r={"170"} g={"170"} b={"170"} font={"letterica16"} align={"r"} vert_align={"c"}>
          ui_mm_npc_torch
        </text>
      </cap_npc_torch>
      <check_npc_torch x={"133"} y={"0"} width={"35"} stretch={"1"} height={"29"}>
        <texture>ui_inGame2_checkbox</texture>
        <options_item entry={"ai_use_torch_dynamic_lights"} group={"mm_opt_video_adv"} />
      </check_npc_torch>

      <cap_particles_distance x={"16"} y={"3"} width={"108"} height={"24"}>
        <text r={"170"} g={"170"} b={"170"} font={"letterica16"} align={"r"} vert_align={"c"}>
          ui_mm_sun_quality
        </text>
      </cap_particles_distance>
      <track_particles_distance x={"144"} y={"6"} width={"188"} height={"16"} step={"0.1"}>
        <options_item entry={"r2_ls_squality"} group={"mm_opt_video_adv"} />
      </track_particles_distance>

      <cap_vsync x={"16"} y={"3"} width={"108"} height={"24"}>
        <text r={"170"} g={"170"} b={"170"} font={"letterica16"} align={"r"} vert_align={"c"}>
          ui_mm_vsync
        </text>
      </cap_vsync>
      <check_vsync x={"133"} y={"0"} width={"35"} stretch={"1"} height={"29"}>
        <texture>ui_inGame2_checkbox</texture>
        <options_item entry={"rs_v_sync"} group={"mm_opt_video_adv"} depend={"vid"} />
      </check_vsync>

      <cap_sun_shafts x={"16"} y={"3"} width={"108"} height={"24"}>
        <text r={"170"} g={"170"} b={"170"} font={"letterica16"} align={"r"} vert_align={"c"}>
          ui_mm_sun_shafts
        </text>
      </cap_sun_shafts>
      <combo_sun_shafts x={"144"} y={"0"} width={"188"} height={"20"} always_show_scroll={"1"}>
        <options_item entry={"r2_sun_shafts"} group={"mm_opt_video"} depend={"vid"} />
        <list_font r={"170"} g={"170"} b={"170"} font={"letterica16"} />
        <text_color>
          <e r={"170"} g={"170"} b={"170"} />
          <d r={"70"} g={"70"} b={"70"} />
        </text_color>
      </combo_sun_shafts>

      <cap_ao x={"16"} y={"3"} width={"108"} height={"76"}>
        <text r={"170"} g={"170"} b={"170"} font={"letterica16"} align={"r"} vert_align={"c"}>
          ui_mm_ssao_text
        </text>
      </cap_ao>
      <radio_tab_ao_options x={"144"} y={"0"} width={"108"} height={"101"} radio={"1"}>
        <options_item entry={"r2_ssao_mode"} group={"mm_opt_video"} depend={"restart"} />
        <button x={"-8"} y={"0"} width={"37"} height={"28"} id={"disabled"} stretch={"1"}>
          <text font={"letterica16"} vert_align={"c"} x={"29"} y={"3"} align={"l"}>
            st_opt_off
          </text>
          <text_color>
            <e r={"170"} g={"170"} b={"170"} />
            <d r={"70"} g={"70"} b={"70"} />
          </text_color>
        </button>
        <button x={"-8"} y={"25"} width={"37"} height={"28"} id={"default"} stretch={"1"}>
          <text font={"letterica16"} vert_align={"c"} x={"29"} y={"3"} align={"l"}>
            ui_mm_ssao
          </text>
          <text_color>
            <e r={"170"} g={"170"} b={"170"} />
            <d r={"70"} g={"70"} b={"70"} />
          </text_color>
        </button>
        <button x={"-8"} y={"50"} width={"37"} height={"28"} id={"hdao"} stretch={"1"}>
          <text font={"letterica16"} vert_align={"c"} x={"29"} y={"3"} align={"l"}>
            ui_mm_hdao
          </text>
          <text_color>
            <e r={"170"} g={"170"} b={"170"} />
            <d r={"70"} g={"70"} b={"70"} />
          </text_color>
        </button>
        <button x={"-8"} y={"75"} width={"37"} height={"28"} id={"hbao"} stretch={"1"}>
          <text font={"letterica16"} vert_align={"c"} x={"29"} y={"3"} align={"l"}>
            ui_mm_hbao
          </text>
          <text_color>
            <e r={"170"} g={"170"} b={"170"} />
            <d r={"70"} g={"70"} b={"70"} />
          </text_color>
        </button>
      </radio_tab_ao_options>

      <cap_ssao x={"16"} y={"3"} width={"108"} height={"24"}>
        <text r={"170"} g={"170"} b={"170"} font={"letterica16"} align={"r"} vert_align={"c"}>
          ui_mm_ssao_quality
        </text>
      </cap_ssao>
      <combo_ssao x={"144"} y={"0"} width={"188"} height={"20"} always_show_scroll={"1"}>
        <options_item entry={"r2_ssao"} group={"mm_opt_video"} depend={"restart"} />
        <list_font r={"170"} g={"170"} b={"170"} font={"letterica16"} />
        <text_color>
          <e r={"170"} g={"170"} b={"170"} />
          <d r={"70"} g={"70"} b={"70"} />
        </text_color>
      </combo_ssao>

      <cap_soft_water x={"16"} y={"3"} width={"108"} height={"24"}>
        <text r={"170"} g={"170"} b={"170"} font={"letterica16"} align={"r"} vert_align={"c"}>
          ui_mm_soft_water
        </text>
      </cap_soft_water>
      <check_soft_water x={"133"} y={"0"} width={"35"} stretch={"1"} height={"29"}>
        <texture>ui_inGame2_checkbox</texture>
        <options_item entry={"r2_soft_water"} group={"mm_opt_video_adv"} depend={"vid"} />
      </check_soft_water>

      <cap_soft_particles x={"16"} y={"3"} width={"108"} height={"24"}>
        <text r={"170"} g={"170"} b={"170"} font={"letterica16"} align={"r"} vert_align={"c"}>
          ui_mm_soft_particles
        </text>
      </cap_soft_particles>
      <check_soft_particles x={"133"} y={"0"} width={"35"} stretch={"1"} height={"29"}>
        <texture>ui_inGame2_checkbox</texture>
        <options_item entry={"r2_soft_particles"} group={"mm_opt_video_adv"} depend={"vid"} />
      </check_soft_particles>

      <cap_dof x={"16"} y={"3"} width={"108"} height={"24"}>
        <text r={"170"} g={"170"} b={"170"} font={"letterica16"} align={"r"} vert_align={"c"}>
          ui_mm_dof
        </text>
      </cap_dof>
      <check_dof x={"133"} y={"0"} width={"35"} stretch={"1"} height={"29"}>
        <texture>ui_inGame2_checkbox</texture>
        <options_item entry={"r2_dof_enable"} group={"mm_opt_video_adv"} depend={"vid"} />
      </check_dof>

      <cap_volumetric_light x={"16"} y={"3"} width={"108"} height={"24"}>
        <text r={"170"} g={"170"} b={"170"} font={"letterica16"} align={"r"} vert_align={"c"}>
          ui_mm_volumetric_light
        </text>
      </cap_volumetric_light>
      <check_volumetric_light x={"133"} y={"0"} width={"35"} stretch={"1"} height={"29"}>
        <texture>ui_inGame2_checkbox</texture>
        <options_item entry={"r2_volumetric_lights"} group={"mm_opt_video_adv"} depend={"vid"} />
      </check_volumetric_light>

      <cap_r3_msaa_alphatest x={"16"} y={"3"} width={"108"} height={"24"}>
        <text r={"170"} g={"170"} b={"170"} font={"letterica16"} align={"r"} vert_align={"c"}>
          ui_mm_msaa_alphatest
        </text>
      </cap_r3_msaa_alphatest>
      <combo_r3_msaa_alphatest x={"144"} y={"0"} width={"188"} height={"20"} always_show_scroll={"1"}>
        <options_item entry={"r3_msaa_alphatest"} group={"mm_opt_video"} depend={"restart"} />
        <list_font r={"170"} g={"170"} b={"170"} font={"letterica16"} />
        <text_color>
          <e r={"170"} g={"170"} b={"170"} />
          <d r={"70"} g={"70"} b={"70"} />
        </text_color>
      </combo_r3_msaa_alphatest>

      <cap_r3_msaa_opt x={"16"} y={"3"} width={"108"} height={"24"}>
        <text r={"170"} g={"170"} b={"170"} font={"letterica16"} align={"r"} vert_align={"c"}>
          ui_mm_r3_DX10_1
        </text>
      </cap_r3_msaa_opt>
      <check_r3_msaa_opt x={"133"} y={"0"} width={"35"} stretch={"1"} height={"29"}>
        <texture>ui_inGame2_checkbox</texture>
        <options_item entry={"r3_msaa_opt"} group={"mm_opt_video_adv"} depend={"vid"} />
      </check_r3_msaa_opt>

      <cap_r4_tessellation x={"16"} y={"3"} width={"108"} height={"24"}>
        <text r={"170"} g={"170"} b={"170"} font={"letterica16"} align={"r"} vert_align={"c"}>
          ui_mm_r4_enable_tessellation
        </text>
      </cap_r4_tessellation>
      <check_r4_tessellation x={"133"} y={"0"} width={"35"} stretch={"1"} height={"29"}>
        <texture>ui_inGame2_checkbox</texture>
        <options_item entry={"r4_enable_tessellation"} group={"mm_opt_video_adv"} depend={"vid"} />
      </check_r4_tessellation>

      <btn_to_simply x={"270"} y={"322"} width={"86"} height={"24"} stretch={"1"}>
        <text align={"c"} font={"letterica16"}>
          ui_mm_simply
        </text>
        <texture>ui_inGame2_button</texture>
        <text_color>
          <e r={"210"} g={"210"} b={"210"} />
        </text_color>
      </btn_to_simply>

      <cap_always_active x={"16"} y={"3"} width={"108"} height={"24"}>
        <text r={"170"} g={"170"} b={"170"} font={"letterica16"} align={"r"} vert_align={"c"}>
          ui_mm_always_active
        </text>
      </cap_always_active>
      <check_always_active x={"133"} y={"0"} width={"35"} stretch={"1"} height={"29"}>
        <texture>ui_inGame2_checkbox</texture>
        <options_item entry={"rs_always_active"} group={"mm_opt_video_adv"} is_integer={"1"} />
      </check_always_active>
    </video_adv>
  );
}
