/* eslint sort-keys-fix/sort-keys-fix: "error" */

/**
 * Todo: Probably move to xrf book and do not define here.
 *
 * DOC ref:
 *
 * CMD1(CCC_ShowMonsterInfo, "ai_monster_info");
 * CMD1(CCC_DebugFonts, "debug_fonts");
 * CMD1(CCC_TuneAttachableItem, "dbg_adjust_attachable_item");
 * CMD1(CCC_ShowAnimationStats, "ai_show_animation_stats");
 * CMD1(CCC_MainMenu, "main_menu");
 * CMD1(CCC_CleanupTasks, "dbg_cleanup_tasks");
 * CMD1(CCC_MemStats, "stat_memory");
 * CMD1(CCC_GameDifficulty, "g_game_difficulty");
 * CMD1(CCC_GameLanguage, "g_language");
 * CMD1(CCC_ALifeSave, "save"); // save game
 * CMD1(CCC_ALifeLoadFrom, "load"); // load game from ...
 * CMD1(CCC_LoadLastSave, "load_last_save"); // load last saved game from ...
 * CMD1(CCC_ClearLog, "clear_log");
 * CMD1(CCC_DemoPlay, "demo_play");
 * CMD1(CCC_DemoRecord, "demo_record");
 * CMD1(CCC_DemoRecordSetPos, "demo_set_cam_position");
 * CMD1(CCC_UIStyle, "ui_style");
 * CMD1(CCC_UIRestart, "ui_restart");
 * CMD3(CCC_Mask, "g_autopickup", &psActorFlags, AF_AUTOPICKUP);
 * CMD3(CCC_Mask, "g_dynamic_music", &psActorFlags, AF_DYNAMIC_MUSIC);
 * CMD3(CCC_Mask, "g_important_save", &psActorFlags, AF_IMPORTANT_SAVE);
 * CMD3(CCC_Mask, "g_loading_stages", &psActorFlags, AF_LOADING_STAGES);
 * CMD3(CCC_Mask, "g_always_use_attitude_sensors", &psActorFlags, AF_ALWAYS_USE_ATTITUDE_SENSORS);
 * CMD3(CCC_Mask, "cl_dynamiccrosshair", &psHUD_Flags, HUD_CROSSHAIR_DYNAMIC);
 * CMD3(CCC_Mask, "ai_use_torch_dynamic_lights", &g_uCommonFlags, flAiUseTorchDynamicLights);
 * CMD3(CCC_String, "slot_0", g_quick_use_slots[0], 32);
 * CMD3(CCC_String, "slot_1", g_quick_use_slots[1], 32);
 * CMD3(CCC_String, "slot_2", g_quick_use_slots[2], 32);
 * CMD3(CCC_String, "slot_3", g_quick_use_slots[3], 32);
 * CMD3(CCC_Mask, "g_crouch_toggle", &psActorFlags, AF_CROUCH_TOGGLE);
 * CMD3(CCC_Mask, "g_backrun", &psActorFlags, AF_RUN_BACKWARD);
 * CMD3(CCC_Mask, "g_multi_item_pickup", &psActorFlags, AF_MULTI_ITEM_PICKUP);
 * CMD3(CCC_Mask, "hud_weapon", &psHUD_Flags, HUD_WEAPON);
 * CMD3(CCC_Mask, "hud_info", &psHUD_Flags, HUD_INFO);
 * CMD3(CCC_Mask, "hud_draw", &psHUD_Flags, HUD_DRAW);
 * CMD3(CCC_Mask, "hud_crosshair", &psHUD_Flags, HUD_CROSSHAIR);
 * CMD3(CCC_Mask, "hud_crosshair_dist", &psHUD_Flags, HUD_CROSSHAIR_DIST);
 * CMD3(CCC_Mask, "hud_left_handed", &psHUD_Flags, HUD_LEFT_HANDED);
 * CMD4(CCC_Integer, "g_inv_highlight_equipped", &g_inv_highlight_equipped, 0, 1);
 * CMD4(CCC_Integer, "g_first_person_death", &g_first_person_death, 0, 1);
 * CMD4(CCC_Integer, "g_unload_ammo_after_pick_up", &g_auto_ammo_unload, 0, 1);
 * CMD4(CCC_Float, "con_sensitive", &g_console_sensitive, 0.01f, 1.0f);
 * CMD4(CCC_Integer, "wpn_aim_toggle", &b_toggle_weapon_aim, 0, 1);
 * CMD4(CCC_Integer, "g_sleep_time", &psActorSleepTime, 1, 24);
 * CMD4(CCC_Integer, "ai_use_old_vision", &g_ai_use_old_vision, 0, 1);
 * CMD4(CCC_Integer, "ai_die_in_anomaly", &g_ai_die_in_anomaly, 0, 1); //Alundaio
 * CMD4(CCC_Float, "ai_aim_predict_time", &g_aim_predict_time, 0.f, 10.f);
 * CMD4(CCC_Integer, "ai_aim_use_smooth_aim", &g_ai_aim_use_smooth_aim, 0, 1);
 * CMD4(CCC_Float, "ai_aim_min_speed", &g_ai_aim_min_speed, 0.f, 10.f * PI);
 * CMD4(CCC_Float, "ai_aim_min_angle", &g_ai_aim_min_angle, 0.f, 10.f * PI);
 * CMD4(CCC_Float, "ai_aim_max_angle", &g_ai_aim_max_angle, 0.f, 10.f * PI);
 * CMD4(CCC_Integer, "keypress_on_start", &g_keypress_on_start, 0, 1);
 * CMD4(CCC_Float, "hud_fov", &psHUD_FOV, 0.1f, 1.0f);
 * CMD4(CCC_Float, "fov", &g_fov, 5.0f, 180.0f);
 *
 * #ifndef MASTER_GOLD
 * CMD1(CCC_StartTimeSingle, "start_time_single");
 * CMD1(CCC_ALifeTimeFactor, "al_time_factor"); // set time factor
 * CMD1(CCC_ALifeSwitchDistance, "al_switch_distance"); // set switch distance
 * CMD1(CCC_ALifeProcessTime, "al_process_time"); // set process time
 * CMD1(CCC_ALifeObjectsPerUpdate, "al_objects_per_update"); // set process time
 * CMD1(CCC_ALifeSwitchFactor, "al_switch_factor"); // set switch factor
 * CMD1(CCC_JumpToLevel, "jump_to_level");
 * CMD1(CCC_ToggleNoClip, "g_no_clip");
 * CMD1(CCC_Spawn, "g_spawn");
 * CMD1(CCC_Script, "run_script");
 * CMD1(CCC_ScriptCommand, "run_string");
 * CMD1(CCC_TimeFactor, "time_factor");
 * CMD1(CCC_SetWeather, "set_weather");
 * CMD3(CCC_Mask, "ai_ignore_actor", &psAI_Flags, aiIgnoreActor);
 * CMD3(CCC_Mask, "mt_ai_vision", &g_mt_config, mtAiVision);
 * CMD3(CCC_Mask, "mt_level_path", &g_mt_config, mtLevelPath);
 * CMD3(CCC_Mask, "mt_detail_path", &g_mt_config, mtDetailPath);
 * CMD3(CCC_Mask, "mt_object_handler", &g_mt_config, mtObjectHandler);
 * CMD3(CCC_Mask, "mt_sound_player", &g_mt_config, mtSoundPlayer);
 * CMD3(CCC_Mask, "mt_bullets", &g_mt_config, mtBullets);
 * CMD3(CCC_Mask, "mt_script_gc", &g_mt_config, mtLUA_GC);
 * CMD3(CCC_Mask, "mt_level_sounds", &g_mt_config, mtLevelSounds);
 * CMD3(CCC_Mask, "mt_alife", &g_mt_config, mtALife);
 * CMD3(CCC_Mask, "mt_map", &g_mt_config, mtMap);
 * CMD3(CCC_Mask, "ai_obstacles_avoiding", &psAI_Flags, aiObstaclesAvoiding);
 * CMD3(CCC_Mask, "ai_obstacles_avoiding_static", &psAI_Flags, aiObstaclesAvoidingStatic);
 * CMD3(CCC_Mask, "ai_use_smart_covers", &psAI_Flags, aiUseSmartCovers);
 * CMD3(CCC_Mask, "ai_use_smart_covers_animation_slots", &psAI_Flags, (u32)aiUseSmartCoversAnimationSlot);
 * CMD3(CCC_Mask, "lua_debug", &g_LuaDebug, 1);
 * CMD3(CCC_Mask, "g_god", &psActorFlags, AF_GODMODE);
 * CMD3(CCC_Mask, "g_unlimitedammo", &psActorFlags, AF_UNLIMITEDAMMO);
 * CMD3(CCC_Mask, "g_use_tracers", &psActorFlags, AF_USE_TRACERS);
 * CMD4(CCC_TimeFactorSingle, "time_factor_single", &g_fTimeFactor, 0.f, 1000.0f);
 * CMD4(CCC_Vector3, "psp_cam_offset", &CCameraLook2::m_cam_offset, Fvector().set(-1000, -1000, -1000),
 * CMD4(CCC_Float, "ai_smart_factor", &g_smart_cover_factor, 0.f, 1000000.f);
 * #endif // MASTER_GOLD
 *
 * #ifdef DEBUG
 * CMD1(CCC_Crash, "crash");
 * CMD1(CCC_DumpObjects, "dump_all_objects");
 * CMD1(CCC_DumpModelBones, "debug_dump_model_bones");
 * CMD1(CCC_DrawGameGraphAll, "ai_draw_game_graph_all");
 * CMD1(CCC_DrawGameGraphCurrent, "ai_draw_game_graph_current_level");
 * CMD1(CCC_DrawGameGraphLevel, "ai_draw_game_graph_level");
 * CMD1(CCC_PHFps, "ph_frequency");
 * CMD1(CCC_PHIterations, "ph_iterations");
 * CMD1(CCC_InvUpgradesHierarchy, "inv_upgrades_hierarchy");
 * CMD1(CCC_InvUpgradesCurItem, "inv_upgrades_cur_item");
 * CMD1(CCC_InvDropAllItems, "inv_drop_all_items");
 * CMD1(CCC_ShowSmartCastStats, "show_smart_cast_stats");
 * CMD1(CCC_ClearSmartCastStats, "clear_smart_cast_stats");
 * CMD1(CCC_DumpInfos, "dump_infos");
 * CMD1(CCC_DumpTasks, "dump_tasks");
 * CMD1(CCC_DumpMap, "dump_map");
 * CMD1(CCC_DumpCreatures, "dump_creatures");
 * CMD1(CCC_DbgVar, "dbg_var");
 * CMD1(CCC_DbgPhTrackObj, "dbg_track_obj");
 * CMD1(CCC_DBGDrawCashedClear, "dbg_ph_cashed_clear");
 * CMD1(CCC_PHGravity, "ph_gravity");
 * CMD1(CCC_ALifePath, "al_path"); // build path
 * CMD3(CCC_String, "stalker_death_anim", dbg_stalker_death_anim, 32);
 * CMD3(CCC_Mask, "dbg_draw_actor_alive", &dbg_net_Draw_Flags, dbg_draw_actor_alive);
 * CMD3(CCC_Mask, "dbg_draw_actor_dead", &dbg_net_Draw_Flags, dbg_draw_actor_dead);
 * CMD3(CCC_Mask, "dbg_draw_customzone", &dbg_net_Draw_Flags, dbg_draw_customzone);
 * CMD3(CCC_Mask, "dbg_draw_teamzone", &dbg_net_Draw_Flags, dbg_draw_teamzone);
 * CMD3(CCC_Mask, "dbg_draw_invitem", &dbg_net_Draw_Flags, dbg_draw_invitem);
 * CMD3(CCC_Mask, "dbg_draw_actor_phys", &dbg_net_Draw_Flags, dbg_draw_actor_phys);
 * CMD3(CCC_Mask, "dbg_draw_customdetector", &dbg_net_Draw_Flags, dbg_draw_customdetector);
 * CMD3(CCC_Mask, "dbg_destroy", &dbg_net_Draw_Flags, dbg_destroy);
 * CMD3(CCC_Mask, "dbg_draw_autopickupbox", &dbg_net_Draw_Flags, dbg_draw_autopickupbox);
 * CMD3(CCC_Mask, "dbg_draw_rp", &dbg_net_Draw_Flags, dbg_draw_rp);
 * CMD3(CCC_Mask, "dbg_draw_climbable", &dbg_net_Draw_Flags, dbg_draw_climbable);
 * CMD3(CCC_Mask, "dbg_draw_skeleton", &dbg_net_Draw_Flags, dbg_draw_skeleton);
 * CMD3(CCC_Mask, "dbg_draw_ph_contacts", &ph_dbg_draw_mask, phDbgDrawContacts);
 * CMD3(CCC_Mask, "dbg_draw_ph_enabled_aabbs", &ph_dbg_draw_mask, phDbgDrawEnabledAABBS);
 * CMD3(CCC_Mask, "dbg_draw_ph_intersected_tries", &ph_dbg_draw_mask, phDBgDrawIntersectedTries);
 * CMD3(CCC_Mask, "dbg_draw_ph_saved_tries", &ph_dbg_draw_mask, phDbgDrawSavedTries);
 * CMD3(CCC_Mask, "dbg_draw_ph_tri_trace", &ph_dbg_draw_mask, phDbgDrawTriTrace);
 * CMD3(CCC_Mask, "dbg_draw_ph_positive_tries", &ph_dbg_draw_mask, phDBgDrawPositiveTries);
 * CMD3(CCC_Mask, "dbg_draw_ph_negative_tries", &ph_dbg_draw_mask, phDBgDrawNegativeTries);
 * CMD3(CCC_Mask, "dbg_draw_ph_tri_test_aabb", &ph_dbg_draw_mask, phDbgDrawTriTestAABB);
 * CMD3(CCC_Mask, "dbg_draw_ph_tries_changes_sign", &ph_dbg_draw_mask, phDBgDrawTriesChangesSign);
 * CMD3(CCC_Mask, "dbg_draw_ph_tri_point", &ph_dbg_draw_mask, phDbgDrawTriPoint);
 * CMD3(CCC_Mask, "dbg_draw_ph_explosion_position", &ph_dbg_draw_mask, phDbgDrawExplosionPos);
 * CMD3(CCC_Mask, "dbg_draw_ph_statistics", &ph_dbg_draw_mask, phDbgDrawObjectStatistics);
 * CMD3(CCC_Mask, "dbg_draw_ph_mass_centres", &ph_dbg_draw_mask, phDbgDrawMassCenters);
 * CMD3(CCC_Mask, "dbg_draw_ph_death_boxes", &ph_dbg_draw_mask, phDbgDrawDeathActivationBox);
 * CMD3(CCC_Mask, "dbg_draw_ph_cashed_tries_stats", &ph_dbg_draw_mask, phDbgDrawCashedTriesStat);
 * CMD3(CCC_Mask, "dbg_draw_ph_car_dynamics", &ph_dbg_draw_mask, phDbgDrawCarDynamics);
 * CMD3(CCC_Mask, "dbg_draw_ph_car_plots", &ph_dbg_draw_mask, phDbgDrawCarPlots);
 * CMD3(CCC_Mask, "dbg_ph_ladder", &ph_dbg_draw_mask, phDbgLadder);
 * CMD3(CCC_Mask, "dbg_draw_ph_explosions", &ph_dbg_draw_mask, phDbgDrawExplosions);
 * CMD3(CCC_Mask, "dbg_draw_car_plots_all_trans", &ph_dbg_draw_mask, phDbgDrawCarAllTrnsm);
 * CMD3(CCC_Mask, "dbg_draw_ph_zbuffer_disable", &ph_dbg_draw_mask, phDbgDrawZDisable);
 * CMD3(CCC_Mask, "dbg_ph_obj_collision_damage", &ph_dbg_draw_mask, phDbgDispObjCollisionDammage);
 * CMD3(CCC_Mask, "dbg_ph_ik", &ph_dbg_draw_mask, phDbgIK);
 * CMD3(CCC_Mask, "dbg_ph_ik_off", &ph_dbg_draw_mask1, phDbgIKOff);
 * CMD3(CCC_Mask, "dbg_draw_ph_ik_goal", &ph_dbg_draw_mask, phDbgDrawIKGoal);
 * CMD3(CCC_Mask, "dbg_ph_ik_limits", &ph_dbg_draw_mask, phDbgIKLimits);
 * CMD3(CCC_Mask, "dbg_ph_character_control", &ph_dbg_draw_mask, phDbgCharacterControl);
 * CMD3(CCC_Mask, "dbg_draw_ph_ray_motions", &ph_dbg_draw_mask, phDbgDrawRayMotions);
 * CMD3(CCC_Mask, "dbg_ph_actor_restriction", &ph_dbg_draw_mask1, ph_m1_DbgActorRestriction);
 * CMD3(CCC_Mask, "dbg_draw_ph_ik_limits", &ph_dbg_draw_mask1, phDbgDrawIKLimits);
 * CMD3(CCC_Mask, "dbg_draw_ph_ik_predict", &ph_dbg_draw_mask1, phDbgDrawIKPredict);
 * CMD3(CCC_Mask, "dbg_draw_ph_ik_collision", &ph_dbg_draw_mask1, phDbgDrawIKCollision);
 * CMD3(CCC_Mask, "dbg_draw_ph_ik_shift_object", &ph_dbg_draw_mask1, phDbgDrawIKSHiftObject);
 * CMD3(CCC_Mask, "dbg_draw_ph_ik_blending", &ph_dbg_draw_mask1, phDbgDrawIKBlending);
 * CMD3(CCC_Mask, "dbg_track_obj_blends_bp_0", &dbg_track_obj_flags, dbg_track_obj_blends_bp_0);
 * CMD3(CCC_Mask, "dbg_track_obj_blends_bp_1", &dbg_track_obj_flags, dbg_track_obj_blends_bp_1);
 * CMD3(CCC_Mask, "dbg_track_obj_blends_bp_2", &dbg_track_obj_flags, dbg_track_obj_blends_bp_2);
 * CMD3(CCC_Mask, "dbg_track_obj_blends_bp_3", &dbg_track_obj_flags, dbg_track_obj_blends_bp_3);
 * CMD3(CCC_Mask, "dbg_track_obj_blends_motion_name", &dbg_track_obj_flags, dbg_track_obj_blends_motion_name);
 * CMD3(CCC_Mask, "dbg_track_obj_blends_time", &dbg_track_obj_flags, dbg_track_obj_blends_time);
 * CMD3(CCC_Mask, "dbg_track_obj_blends_ammount", &dbg_track_obj_flags, dbg_track_obj_blends_ammount);
 * CMD3(CCC_Mask, "dbg_track_obj_blends_mix_params", &dbg_track_obj_flags, dbg_track_obj_blends_mix_params);
 * CMD3(CCC_Mask, "dbg_track_obj_blends_flags", &dbg_track_obj_flags, dbg_track_obj_blends_flags);
 * CMD3(CCC_Mask, "dbg_track_obj_blends_state", &dbg_track_obj_flags, dbg_track_obj_blends_state);
 * CMD3(CCC_Mask, "dbg_track_obj_blends_dump", &dbg_track_obj_flags, dbg_track_obj_blends_dump);
 * CMD3(CCC_Mask, "ai_debug", &psAI_Flags, aiDebug);
 * CMD3(CCC_Mask, "ai_stats", &psAI_Flags, aiStats);
 * CMD3(CCC_Mask, "ai_draw_game_graph", &psAI_Flags, aiDrawGameGraph);
 * CMD3(CCC_Mask, "ai_draw_game_graph_stalkers", &psAI_Flags, aiDrawGameGraphStalkers);
 * CMD3(CCC_Mask, "ai_draw_game_graph_objects", &psAI_Flags, aiDrawGameGraphObjects);
 * CMD3(CCC_Mask, "ai_draw_game_graph_real_pos", &psAI_Flags, aiDrawGameGraphRealPos);
 * CMD3(CCC_Mask, "ai_draw_visibility_rays", &psAI_Flags, aiDrawVisibilityRays);
 * CMD3(CCC_Mask, "ai_animation_stats", &psAI_Flags, aiAnimationStats);
 * CMD4(CCC_Integer, "death_anim_debug", &death_anim_debug, FALSE, TRUE);
 * CMD4(CCC_Integer, "death_anim_velocity", &b_death_anim_velocity, FALSE, TRUE);
 * CMD4(CCC_Integer, "dbg_imotion_draw_velocity", &dbg_imotion_draw_velocity, FALSE, TRUE);
 * CMD4(CCC_Integer, "dbg_imotion_collide_debug", &dbg_imotion_collide_debug, FALSE, TRUE);
 * CMD4(CCC_Integer, "dbg_imotion_draw_skeleton", &dbg_imotion_draw_skeleton, FALSE, TRUE);
 * CMD4(CCC_Float, "dbg_imotion_draw_velocity_scale", &dbg_imotion_draw_velocity_scale, 0.0001f, 100.0f);
 * CMD4(CCC_Integer, "show_wnd_rect_all", &g_show_wnd_rect2, 0, 1);
 * CMD4(CCC_Integer, "dbg_show_ani_info", &g_ShowAnimationInfo, 0, 1);
 * CMD4(CCC_Integer, "dbg_dump_physics_step", &ph_console::g_bDebugDumpPhysicsStep, 0, 1);
 * CMD4(CCC_Integer, "inv_upgrades_log", &g_upgrades_log, 0, 1);
 * CMD4(CCC_Integer, "dbg_bones_snd_player", &dbg_moving_bones_snd_player, FALSE, TRUE);
 * CMD4(CCC_Float, "ai_smart_cover_animation_speed_factor", &g_smart_cover_animation_speed_factor, .1f, 10.f);
 * CMD4(CCC_Float, "air_resistance_epsilon", &air_resistance_epsilon, .0f, 1.f);
 * CMD4(CCC_Float, "g_bullet_time_factor", &g_bullet_time_factor, 0.f, 10.f);
 * CMD4(CCC_Integer, "ai_debug_doors", &g_debug_doors, 0, 1);
 * CMD4(CCC_Integer, "ai_dbg_sight", &g_ai_dbg_sight, 0, 1);
 * CMD4(CCC_Float, "dbg_ph_vel_collid_damage_to_display", &dbg_vel_collid_damage_to_display, 0.f, 1000.f);
 * CMD4(CCC_DbgBullets, "dbg_draw_bullet_hit", &g_bDrawBulletHit, 0, 1);
 * CMD4(CCC_Integer, "dbg_draw_fb_crosshair", &g_bDrawFirstBulletCrosshair, 0, 1);
 * CMD4(CCC_Integer, "dbg_draw_character_bones", &dbg_draw_character_bones, FALSE, TRUE);
 * CMD4(CCC_Integer, "dbg_draw_character_physics", &dbg_draw_character_physics, FALSE, TRUE);
 * CMD4(CCC_Integer, "dbg_draw_character_binds", &dbg_draw_character_binds, FALSE, TRUE);
 * CMD4(CCC_Integer, "dbg_draw_character_physics_pones", &dbg_draw_character_physics_pones, FALSE, TRUE);
 * CMD4(CCC_Integer, "ik_cam_shift", &ik_cam_shift, FALSE, TRUE);
 * CMD4(CCC_Float, "ik_cam_shift_tolerance", &ik_cam_shift_tolerance, 0.f, 2.f);
 * CMD4(CCC_Float, "ik_cam_shift_speed", &ik_cam_shift_speed, 0.f, 1.f);
 * CMD4(CCC_Float, "ik_cam_shift_interpolation", &ik_cam_shift_interpolation, 1.f, 10.f);
 * CMD4(CCC_Integer, "dbg_draw_doors", &dbg_draw_doors, FALSE, TRUE);
 * CMD4(CCC_Integer, "dbg_draw_ragdoll_spawn", &dbg_draw_ragdoll_spawn, FALSE, TRUE);
 * CMD4(CCC_Integer, "debug_step_info", &debug_step_info, FALSE, TRUE);
 * CMD4(CCC_Integer, "debug_step_info_load", &debug_step_info_load, FALSE, TRUE);
 * CMD4(CCC_Integer, "debug_character_material_load", &debug_character_material_load, FALSE, TRUE);
 * CMD4(CCC_Integer, "dbg_draw_camera_collision", &dbg_draw_camera_collision, FALSE, TRUE);
 * CMD4(CCC_FloatBlock, "camera_collision_character_shift_z", &camera_collision_character_shift_z, 0.f, 1.f);
 * CMD4(CCC_FloatBlock, "camera_collision_character_skin_depth", &camera_collision_character_skin_depth, 0.f, 1.f);
 * CMD4(CCC_Integer, "dbg_draw_animation_movement_controller", &dbg_draw_animation_movement_controller, FALSE, TRUE);
 * CMD4(CCC_Integer, "string_table_error_msg", &CStringTable::m_bWriteErrorsToLog, 0, 1);
 * CMD4(CCC_FloatBlock, "dbg_text_height_scale", &dbg_text_height_scale, 0.2f, 5.f);
 * CMD4(CCC_FloatBlock, "ph_timefactor", &phTimefactor, 0.000001f, 1000.f);
 * CMD4(CCC_FloatBlock, "ph_break_common_factor", &ph_console::phBreakCommonFactor, 0.f, 1000000000.f);
 * CMD4(CCC_FloatBlock, "ph_rigid_break_weapon_factor", &ph_console::phRigidBreakWeaponFactor, 0.f, 1000000000.f);
 * CMD4(CCC_Integer, "ph_tri_clear_disable_count", &ph_console::ph_tri_clear_disable_count, 0, 255);
 * CMD4(CCC_FloatBlock, "ph_tri_query_ex_aabb_rate", &ph_console::ph_tri_query_ex_aabb_rate, 1.01f, 3.f);
 * CMD4(CCC_Integer, "lua_gcstep", &psLUA_GCSTEP, 1, 1000);
 * CMD4(CCC_Float, "hit_anims_power", &ghit_anims_params.power_factor, 0.0f, 100.0f);
 * CMD4(CCC_Float, "hit_anims_rotational_power", &ghit_anims_params.rotational_power_factor, 0.0f, 100.0f);
 * CMD4(CCC_Float, "hit_anims_side_sensitivity_threshold", &ghit_anims_params.side_sensitivity_threshold, 0.0f, 10.0f);
 * CMD4(CCC_Float, "hit_anims_channel_factor", &ghit_anims_params.anim_channel_factor, 0.0f, 100.0f);
 * CMD4(CCC_Float, "hit_anims_block_blend", &ghit_anims_params.block_blend, 0.f, 1.f);
 * CMD4(CCC_Float, "hit_anims_reduce_blend", &ghit_anims_params.reduce_blend, 0.f, 1.f);
 * CMD4(CCC_Float, "hit_anims_reduce_blend_factor", &ghit_anims_params.reduce_power_factor, 0.0f, 1.0f);
 * CMD4(CCC_Integer, "hit_anims_tune", &tune_hit_anims, 0, 1);
 * CMD4(CCC_Integer, "ai_dbg_inactive_time", &g_AI_inactive_time, 0, 1000000);
 * CMD_RADIOGROUPMASK2("dbg_ph_ai_always_phmove", &ph_dbg_draw_mask, phDbgAlwaysUseAiPhMove,
 *   "dbg_ph_ai_never_phmove",&ph_dbg_draw_mask, phDbgNeverUseAiPhMove).
 *
 * #endif // DEBUG
 */
/**
 * IO cmd.
 *
 * CMD1(CCC_Help, "help");
 * CMD1(CCC_Quit, "quit");
 * CMD1(CCC_Start, "start");
 * CMD1(CCC_HideConsole, "hide");
 * CMD1(CCC_Disconnect, "disconnect");
 * CMD1(CCC_SaveCFG, "cfg_save");
 * CMD1(CCC_LoadCFG, "cfg_load");
 * CMD1(CCC_Fullscreen, "rs_fullscreen");
 * CMD1(CCC_Refresh60hz, "rs_refresh_60hz");
 * CMD1(CCC_CenterScreen, "center_screen");
 * CMD1(CCC_renderer, "renderer");
 * CMD1(CCC_soundDevice, "snd_device");
 * CMD1(CCC_ExclusiveMode, "input_exclusive_mode");
 * CMD1(CCC_VidMonitor, "vid_monitor");
 * CMD1(CCC_VidMode, "vid_mode");
 * CMD1(CCC_VidWindowMode, "vid_window_mode");
 * CMD1(CCC_VID_Reset, "vid_restart");
 * CMD1(CCC_SND_Restart, "snd_restart");
 * CMD2(CCC_Float, "cam_inert", &psCamInert);
 * CMD2(CCC_Float, "cam_slide_inert", &psCamSlideInert);
 * CMD2(CCC_Float, "snd_volume_eff", &psSoundVEffects);
 * CMD2(CCC_Float, "snd_volume_music", &psSoundVMusic);
 * CMD2(CCC_Gamma, "rs_c_gamma", &ps_gamma);
 * CMD2(CCC_Gamma, "rs_c_brightness", &ps_brightness);
 * CMD2(CCC_Gamma, "rs_c_contrast", &ps_contrast);
 * CMD3(CCC_Mask, "rs_always_active", &psDeviceFlags, rsAlwaysActive);
 * CMD3(CCC_Mask, "rs_v_sync", &psDeviceFlags, rsVSync);
 * CMD3(CCC_Mask, "rs_stats", &psDeviceFlags, rsStatistic);
 * CMD3(CCC_Mask, "rs_fps", &psDeviceFlags, rsShowFPS);
 * CMD3(CCC_Mask, "rs_fps_graph", &psDeviceFlags, rsShowFPSGraph);
 * CMD3(CCC_Mask, "rs_cam_pos", &psDeviceFlags, rsCameraPos);
 * CMD3(CCC_Mask, "snd_acceleration", &psSoundFlags, ss_Hardware);
 * CMD3(CCC_Mask, "snd_efx", &psSoundFlags, ss_EFX);
 * CMD3(CCC_Token, "snd_precache_all", &psSoundPrecacheAll, snd_precache_all_token);
 * CMD3(CCC_Mask, "mouse_invert", &psMouseInvert, 1);
 * CMD3(CCC_Mask, "gamepad_invert_y", &psControllerInvertY, 1);
 * CMD3(CCC_ControllerSensorEnable, "gamepad_sensors_enable", &psControllerEnableSensors, 1);
 * CMD4(CCC_Integer, "snd_targets", &psSoundTargets, 4, 256);
 * CMD4(CCC_Integer, "snd_cache_size", &psSoundCacheSizeMB, 4, 64);
 * CMD4(CCC_Float, "mouse_sens", &psMouseSens, 0.001f, 0.6f);
 * CMD4(CCC_Float, "gamepad_stick_sens", &psControllerStickSens, 0.001f, 0.6f);
 * CMD4(CCC_Float, "gamepad_stick_deadzone", &psControllerStickDeadZone, 1.f, 35.f);
 * CMD4(CCC_Float, "gamepad_sensor_sens", &psControllerSensorSens, 0.01f, 3.f);
 * CMD4(CCC_Float, "gamepad_sensor_deadzone", &psControllerSensorDeadZone, 0.001f, 1.f);
 * CMD4(CCC_Integer, "net_dbg_dump_export_obj", &g_Dump_Export_Obj, 0, 1);
 * CMD4(CCC_Integer, "net_dbg_dump_import_obj", &g_Dump_Import_Obj, 0, 1);
 * CMD4(CCC_Integer, "sv_console_update_rate", &g_svTextConsoleUpdateRate, 1, 100);
 * CMD4(CCC_Integer, "sv_dedicated_server_update_rate", &g_svDedicateServerUpdateReate, 1, 1000);
 * CMD4(CCC_Integer, "r__supersample", &ps_r__Supersample, 1, 4);
 * CMD4(CCC_Integer, "r__wallmarks_on_skeleton", &ps_r__WallmarksOnSkeleton, 0, 1);
 * CMD4(CCC_Float, "rs_vis_distance", &psVisDistance, 0.4f, 1.5f);
 * CMD4(CCC_Integer, "texture_lod", &psTextureLOD, 0, 4);
 * CMD4(CCC_Integer, "net_dedicated_sleep", &psNET_DedicatedSleep, 0, 64);
 *
 * #ifndef MASTER_GOLD
 * CMD3(CCC_Mask, "rs_detail", &psDeviceFlags, rsDrawDetails);
 * CMD3(CCC_Mask, "rs_render_statics", &psDeviceFlags, rsDrawStatic);
 * CMD3(CCC_Mask, "rs_render_dynamics", &psDeviceFlags, rsDrawDynamic);
 * CMD3(CCC_Mask, "rs_render_particles", &psDeviceFlags, rsDrawParticles);
 * CMD3(CCC_Mask, "rs_wireframe", &psDeviceFlags, rsWireframe);
 * #endif
 *
 * #ifdef DEBUG
 * CMD3(CCC_Mask, "snd_stats", &g_stats_flags, st_sound);
 * CMD3(CCC_Mask, "snd_stats_min_dist", &g_stats_flags, st_sound_min_dist);
 * CMD3(CCC_Mask, "snd_stats_max_dist", &g_stats_flags, st_sound_max_dist);
 * CMD3(CCC_Mask, "snd_stats_ai_dist", &g_stats_flags, st_sound_ai_dist);
 * CMD3(CCC_Mask, "snd_stats_info_name", &g_stats_flags, st_sound_info_name);
 * CMD3(CCC_Mask, "snd_stats_info_object", &g_stats_flags, st_sound_info_object);
 * CMD4(CCC_Integer, "error_line_count", &g_ErrorLineCount, 6, 1024);
 * CMD1(CCC_DumpOpenFiles, "dump_open_files");
 * CMD4(CCC_Integer, "debug_destroy", &debug_destroy, 0, 1);
 * CMD4(CCC_Integer, "debug_show_red_text", &g_bShowRedText, 0, 1);
 * CMD3(CCC_Token, "vid_bpp", &psDeviceMode.BitsPerPixel, vid_bpp_token);
 * CMD3(CCC_Mask, "rs_occ_draw", &psDeviceFlags, rsOcclusionDraw);
 * CMD3(CCC_Mask, "mt_particles", &psDeviceFlags, mtParticles);
 * CMD1(CCC_DbgStrCheck, "dbg_str_check");
 * CMD1(CCC_DbgStrDump, "dbg_str_dump");
 * CMD3(CCC_Mask, "mt_sound", &psDeviceFlags, mtSound);
 * CMD3(CCC_Mask, "mt_physics", &psDeviceFlags, mtPhysics);
 * CMD3(CCC_Mask, "mt_network", &psDeviceFlags, mtNetwork);
 * CMD1(CCC_E_Dump, "e_list");
 * CMD1(CCC_E_Signal, "e_signal");
 * CMD3(CCC_Mask, "rs_clear_bb", &psDeviceFlags, rsClearBB);
 * #endif
 * }.
 *
 * @inline
 */
export const consoleCommands = {
  ai_dbg_alife: "ai_dbg_alife",
  ai_dbg_anim: "ai_dbg_anim",
  ai_dbg_brain: "ai_dbg_brain",
  ai_dbg_cover: "ai_dbg_cover",
  ai_dbg_destroy: "ai_dbg_destroy",
  ai_dbg_dialogs: "ai_dbg_dialogs",
  ai_dbg_frustum: "ai_dbg_frustum",
  ai_dbg_funcs: "ai_dbg_funcs",
  ai_dbg_goap: "ai_dbg_goap",
  ai_dbg_goap_object: "ai_dbg_goap_object",
  ai_dbg_goap_script: "ai_dbg_goap_script",
  ai_dbg_infoportion: "ai_dbg_infoportion",
  ai_dbg_monster: "ai_dbg_monster",
  ai_dbg_motion: "ai_dbg_motion",
  ai_dbg_node: "ai_dbg_node",
  ai_dbg_serialize: "ai_dbg_serialize",
  ai_dbg_stalker: "ai_dbg_stalker",
  ai_dbg_vision: "ai_dbg_vision",
  cdkey: "cdkey",
  /**
   * Save options changes.
   */
  cfg_save: "cfg_save",
  /**
   * Check game updates.
   */
  check_for_updates: "check_for_updates",
  /**
   * Todo: ???
   */
  cl_mpdemosave: "cl_mpdemosave",
  dbg_destroy: "dbg_destroy",
  dbg_draw_actor_alive: "dbg_draw_actor_alive",
  dbg_draw_actor_dead: "dbg_draw_actor_dead",
  dbg_draw_actor_phys: "dbg_draw_actor_phys",
  dbg_draw_autopickupbox: "dbg_draw_autopickupbox",
  dbg_draw_bullet_hit: "dbg_draw_bullet_hit",
  dbg_draw_climbable: "dbg_draw_climbable",
  dbg_draw_customzone: "dbg_draw_customzone",
  dbg_draw_invitem: "dbg_draw_invitem",
  dbg_draw_ph_cashed_tries_stats: "dbg_draw_ph_cashed_tries_stats",
  dbg_draw_ph_contacts: "dbg_draw_ph_contacts",
  dbg_draw_ph_death_boxes: "dbg_draw_ph_death_boxes",
  dbg_draw_ph_enabled_aabbs: "dbg_draw_ph_enabled_aabbs",
  dbg_draw_ph_explosion_position: "dbg_draw_ph_explosion_position",
  dbg_draw_ph_explosions: "dbg_draw_ph_explosions",
  dbg_draw_ph_hit_anims: "dbg_draw_ph_hit_anims",
  dbg_draw_ph_hit_app_pos: "dbg_draw_ph_hit_app_pos",
  dbg_draw_ph_ik_goal: "dbg_draw_ph_ik_goal",
  dbg_draw_ph_ik_limits: "dbg_draw_ph_ik_limits",
  dbg_draw_ph_intersected_tries: "dbg_draw_ph_intersected_tries",
  dbg_draw_ph_mass_centres: "dbg_draw_ph_mass_centres",
  dbg_draw_ph_negative_tries: "dbg_draw_ph_negative_tries",
  dbg_draw_ph_positive_tries: "dbg_draw_ph_positive_tries",
  dbg_draw_ph_ray_motions: "dbg_draw_ph_ray_motions",
  dbg_draw_ph_saved_tries: "dbg_draw_ph_saved_tries",
  dbg_draw_ph_statistics: "dbg_draw_ph_statistics",
  dbg_draw_ph_tri_point: "dbg_draw_ph_tri_point",
  dbg_draw_ph_tri_test_aabb: "dbg_draw_ph_tri_test_aabb",
  dbg_draw_ph_tri_trace: "dbg_draw_ph_tri_trace",
  dbg_draw_ph_tries_changes_sign: "dbg_draw_ph_tries_changes_sign",
  dbg_draw_ph_zbuffer_disable: "dbg_draw_ph_zbuffer_disable",
  dbg_draw_rp: "dbg_draw_rp",
  dbg_draw_skeleton: "dbg_draw_skeleton",
  dbg_draw_teamzone: "dbg_draw_teamzone",
  dbg_dump_physics_step: "dbg_dump_physics_step",
  dbg_ph_actor_restriction: "dbg_ph_actor_restriction",
  dbg_ph_ai_always_phmove: "dbg_ph_ai_always_phmove",
  dbg_ph_ai_never_phmove: "dbg_ph_ai_never_phmove",
  dbg_ph_character_control: "dbg_ph_character_control",
  dbg_ph_ik: "dbg_ph_ik",
  dbg_ph_ik_limits: "dbg_ph_ik_limits",
  dbg_ph_ik_off: "dbg_ph_ik_off",
  dbg_ph_ladder: "dbg_ph_ladder",
  dbg_ph_obj_collision_damage: "dbg_ph_obj_collision_damage",
  default_controls: "default_controls",
  /**
   * Disconnect from server / game session.
   */
  disconnect: "disconnect",
  flush: "flush",
  g_always_run: "g_always_run",
  g_autopickup: "g_autopickup",
  /**
   * Set game difficulty.
   * Second param - diffuculty value.
   */
  g_game_difficulty: "g_game_difficulty",
  /**
   * Debug commands.
   */
  g_god: "g_god",
  g_unlimitedammo: "g_unlimitedammo",
  hud_crosshair: "hud_crosshair",
  hud_crosshair_dist: "hud_crosshair_dist",
  hud_draw: "hud_draw",
  hud_info: "hud_info",
  hud_weapon: "hud_weapon",
  /**
   * Load save.
   */
  load: "load",
  /**
   * Load last save.
   */
  load_last_save: "load_last_save",
  /**
   * Toggle main menu.
   * Second param - on / off.
   */
  main_menu: "main_menu",
  /**
   * Quit from game.
   */
  quit: "quit",
  /**
   * Create game save.
   */
  save: "save",
  show_wnd_rect_all: "show_wnd_rect_all",
  slot_0: "slot_0",
  slot_1: "slot_1",
  slot_2: "slot_2",
  slot_3: "slot_3",
  /**
   * Todo: ???
   */
  snd_volume_eff: "snd_volume_eff",
  /**
   * Todo: ???
   */
  snd_volume_music: "snd_volume_music",
  /**
   * Todo: ???
   */
  start: "start",
  wpn_aim_toggle: "wpn_aim_toggle",
} as const;

/**
 * Type describing set of available console commands.
 */
export type TConsoleCommands = typeof consoleCommands;

/**
 * Script type definition enumeration possible command names const.
 */
export type TConsoleCommand = TConsoleCommands[keyof TConsoleCommands];
