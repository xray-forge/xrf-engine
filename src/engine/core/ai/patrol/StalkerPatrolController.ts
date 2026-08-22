import { callback, move, patrol, time_global } from "xray16";
import { EGameObjectPath, Flags32, GameObject, Patrol } from "xray16/alias";
import {
  abort,
  assert,
  isObjectAtTerminalWaypoint,
  isObjectAtWaypoint,
  LuaArray,
  Nillable,
  TDistance,
  TDuration,
  TIndex,
  TName,
  TNumberId,
  TTimestamp,
} from "xray16/lib";
import { $filename, $isNil, $isNotNil } from "xray16/macros";

import { isPatrolTeamSynchronized } from "@/engine/core/ai/patrol/patrol_utils";
import { patrolConfig } from "@/engine/core/ai/patrol/PatrolConfig";
import {
  EStalkerState,
  EWaypointArrivalType,
  IPatrolCallbackDescriptor,
  IPatrolSuggestedState,
} from "@/engine/core/animation/types";
import { registry, setStalkerState } from "@/engine/core/database";
import { IWaypointData, parseConditionsList, pickSectionFromCondList, TConditionList } from "@/engine/core/ini";
import { setObjectActiveSchemeSignal } from "@/engine/core/schemes/runtime";
import { LuaLogger } from "@/engine/core/utils/logging";
import { choosePatrolWaypointByFlags } from "@/engine/core/utils/patrol";

const logger: LuaLogger = new LuaLogger($filename, { file: "ai_state" });

/**
 * Controller handling patrol movement for one stalker object.
 *
 * The stalker binder owns this controller for the object's lifetime. Patrol-related schemes reset and reuse it to
 * control movement, waypoint animations, and team synchronization.
 *
 * See {@link https://xray-forge.github.io/xrf-book/script_engine/patrols.html patrols system}.
 */
export class StalkerPatrolController {
  public readonly object: GameObject;
  public team: Nillable<TName> = null;

  public suggestedStates: Nillable<IPatrolSuggestedState> = null;
  public currentStateMoving!: EStalkerState;
  public currentStateStanding!: EStalkerState;

  // Descriptor of callback to call on waypoint update emit.
  public patrolCallbackDescriptor: Nillable<IPatrolCallbackDescriptor> = null;
  public retvalAfterRotation: Nillable<number> = null;

  // Next timestamp to check synchronization of run-walk-sprint state.
  public keepStateUntil: TTimestamp = 0;
  public patrolWaitTime: Nillable<TDuration> = null;

  public lastWalkPointIndex: Nillable<TIndex> = null; // last active point of walk patrol
  public lastLookPointIndex: Nillable<TIndex> = null; // last active point of look patrol
  public synchronizationSignal: Nillable<TName> = null; // signal to set when team is synchronized
  public synchronizationSignalTimeout: TTimestamp = 0; // timestamp to block sync check for some time

  public canUseGetCurrentPointIndex: boolean = false;
  public currentPointInitAt: TTimestamp = 0;
  public currentPointIndex: Nillable<TIndex> = null;

  public walkUntil: TTimestamp = 0; // Delay to switch patrols smoothly.
  public runUntil: TTimestamp = 0; // Delay to switch patrols smoothly.

  public patrolWalk: Nillable<Patrol> = null;
  public patrolWalkName: Nillable<TName> = null;
  public patrolWalkWaypoints!: LuaArray<IWaypointData>;
  public patrolLook: Nillable<Patrol> = null;
  public patrolLookName: Nillable<TName> = null;
  public patrolLookWaypoints: Nillable<LuaArray<IWaypointData>> = null;

  public defaultStateStanding!: TConditionList;
  public defaultStateMoving1!: TConditionList;
  public defaultStateMoving2!: TConditionList;
  public defaultStateMoving3!: TConditionList;

  public constructor(object: GameObject) {
    this.object = object;
  }

  /**
   * Initialize the controller and register its binder-lifetime waypoint callback.
   *
   * @returns Initialized controller reference.
   */
  public initialize(): StalkerPatrolController {
    logger.info("Initialize patrol controller for: '%s'", this.object.name());

    this.object.set_callback(callback.patrol_path_in_point, this.onWalkWaypoint, this);

    return this;
  }

  /**
   * Reset the active patrol state.
   *
   * Re-initializes walk and look patrols, suggested states, team synchronization and callbacks, then re-runs setup.
   *
   * @param walkPathName - Name of the walk patrol path.
   * @param walkPathWaypoints - Parsed waypoint descriptors of the walk patrol.
   * @param lookPathName - Optional name of the look patrol path.
   * @param lookPathWaypoints - Optional parsed waypoint descriptors of the look patrol.
   * @param patrolTeam - Optional name of the patrol team used for synchronization.
   * @param patrolSuggestedStates - Optional suggested standing and moving states for the patrol.
   * @param patrolCallbackDescriptor - Optional descriptor of the callback fired on waypoint arrival.
   */
  public reset(
    walkPathName: TName,
    walkPathWaypoints: LuaArray<IWaypointData>,
    lookPathName: Nillable<TName> = null,
    lookPathWaypoints: Nillable<LuaArray<IWaypointData>> = null,
    patrolTeam: Nillable<TName> = null,
    patrolSuggestedStates: Nillable<IPatrolSuggestedState>,
    patrolCallbackDescriptor: Nillable<IPatrolCallbackDescriptor> = null
  ): void {
    logger.info(
      "Reset patrol controller for: '%s', walk - '%s' look - '%s', team - '%s'",
      this.object.name(),
      walkPathName,
      lookPathName,
      patrolTeam
    );

    const now: TTimestamp = time_global();

    this.patrolWaitTime = patrolConfig.DEFAULT_PATROL_WAIT_TIME;
    this.suggestedStates = patrolSuggestedStates;

    this.defaultStateStanding = parseConditionsList(
      patrolSuggestedStates?.standing ?? patrolConfig.DEFAULT_PATROL_STATE_STANDING
    );
    this.defaultStateMoving1 = parseConditionsList(
      patrolSuggestedStates?.moving ?? patrolConfig.DEFAULT_PATROL_STATE_MOVING
    );
    this.defaultStateMoving2 = parseConditionsList(
      patrolSuggestedStates?.moving ?? patrolConfig.DEFAULT_PATROL_STATE_MOVING
    );
    this.defaultStateMoving3 = parseConditionsList(
      patrolSuggestedStates?.moving ?? patrolConfig.DEFAULT_PATROL_STATE_MOVING
    );

    this.synchronizationSignalTimeout = now + 1000;
    this.synchronizationSignal = null;

    this.patrolCallbackDescriptor = patrolCallbackDescriptor;

    // Remove stale synchronization state before joining another team.
    if (patrolTeam !== this.team && $isNotNil(this.team)) {
      patrolConfig.PATROL_TEAMS.get(this.team)?.delete(this.object.id());
    }

    this.team = patrolTeam;

    // Every reset starts a new synchronization cycle, including when the team did not change.
    if ($isNotNil(this.team)) {
      let state: Nillable<LuaTable<TNumberId, boolean>> = patrolConfig.PATROL_TEAMS.get(this.team);

      if ($isNil(state)) {
        state = new LuaTable();
        patrolConfig.PATROL_TEAMS.set(this.team, state);
      }

      state.set(this.object.id(), false);
    }

    this.currentStateStanding = pickSectionFromCondList(registry.actor, this.object, this.defaultStateStanding)!;
    this.currentStateMoving = pickSectionFromCondList(registry.actor, this.object, this.defaultStateMoving1)!;

    // Reset patrol - use new patrol that should be fully re-initialized:
    if (this.patrolWalkName !== walkPathName || this.patrolLookName !== lookPathName) {
      this.patrolWalkName = walkPathName;
      this.patrolWalk = new patrol(walkPathName);
      if (!this.patrolWalk) {
        abort("object '%s': unable to find path_walk '%s' on the map", this.object.name(), walkPathName);
      }

      if (!walkPathWaypoints) {
        abort(
          "object '%s': path_walk ('%s') field was supplied, but path_walk_info field is null",
          this.object.name(),
          walkPathName
        );
      }

      this.patrolWalkWaypoints = walkPathWaypoints!;

      if (lookPathName) {
        if (!lookPathWaypoints) {
          abort(
            "object '%s': path_look ('%s') field was supplied, but path_look_info field is null",
            this.object.name(),
            lookPathName
          );
        }

        this.patrolLook = new patrol(lookPathName);

        if (!this.patrolLook) {
          abort("object '%s': unable to find path_look '%s' on the map", this.object.name(), lookPathName);
        }
      } else {
        this.patrolLook = null;
      }

      this.patrolLookName = lookPathName;
      this.patrolLookWaypoints = lookPathWaypoints;

      this.canUseGetCurrentPointIndex = false;
      this.walkUntil = now + patrolConfig.WALK_STATE_DURATION;
      this.runUntil = now + patrolConfig.WALK_STATE_DURATION + patrolConfig.RUN_STATE_DURATION;
      this.keepStateUntil = now;

      this.retvalAfterRotation = null;
      this.currentPointIndex = null;
      this.lastWalkPointIndex = null;
      this.lastLookPointIndex = null;

      // Reset previous patrols.
      this.object.patrol_path_make_inactual();
    }

    // Perform movement update based on current paths.
    this.setup();
  }

  /**
   * Stop the active patrol route and release the controller from team synchronization.
   *
   * The waypoint callback remains registered because the binder-owned controller is reused by later patrol schemes.
   */
  public finalize(): void {
    logger.info(
      "Finalize patrol controller for: '%s', walk '%s' look '%s' , team '%s'",
      this.object.name(),
      this.patrolWalkName,
      this.patrolLookName,
      this.team
    );

    if (this.team) {
      patrolConfig.PATROL_TEAMS.get(this.team).delete(this.object.id());
    }

    this.object.set_path_type(EGameObjectPath.LEVEL_PATH);
  }

  /**
   * Activate patrol path movement for the object and start moving from the current or nearest point.
   *
   * Switches the object to patrol path type and either notifies logics if already at a terminal point or applies the
   * current moving state to continue patrolling.
   */
  public setup(): void {
    this.object.set_path_type(EGameObjectPath.PATROL_PATH);
    this.object.set_detail_path_type(move.line);

    if ($isNotNil(this.currentPointIndex)) {
      this.object.set_start_point(this.currentPointIndex);
      this.object.set_patrol_path(this.patrolWalkName as TName, patrol.next, patrol.continue, true);
    } else {
      this.object.set_patrol_path(this.patrolWalkName as TName, patrol.nearest, patrol.continue, true);
    }

    const [isTerminalPoint, terminalPointIndex] = isObjectAtTerminalWaypoint(this.object, this.patrolWalk as Patrol);

    if (isTerminalPoint) {
      this.onWalkWaypoint(this.object, null, terminalPointIndex);
    } else {
      setStalkerState(this.object, this.currentStateMoving);
    }
  }

  /**
   * Handle game object update tick.
   */
  public update(): void {
    const now: TTimestamp = time_global();

    // If sync is needed and time passed, check state and write signal when should.
    if (this.synchronizationSignal && now >= this.synchronizationSignalTimeout && isPatrolTeamSynchronized(this.team)) {
      setObjectActiveSchemeSignal(this.object, this.synchronizationSignal);
      this.synchronizationSignal = null; // Reset.
    }

    // todo: explain.
    if (this.canUseGetCurrentPointIndex && $isNil(this.lastWalkPointIndex) && now >= this.keepStateUntil) {
      this.keepStateUntil = now + patrolConfig.KEEP_STATE_DURATION;

      const distance: TDistance = this.object
        .position()
        .distance_to_sqr(this.patrolWalk!.point(this.currentPointIndex as TIndex));

      if (distance <= patrolConfig.DISTANCE_TO_WALK_SQR || now < this.walkUntil) {
        this.currentStateMoving = pickSectionFromCondList(registry.actor, this.object, this.defaultStateMoving1)!;
      } else if (distance <= patrolConfig.DISTANCE_TO_RUN_SQR || now < this.runUntil) {
        this.currentStateMoving = pickSectionFromCondList(registry.actor, this.object, this.defaultStateMoving2)!;
      } else {
        this.currentStateMoving = pickSectionFromCondList(registry.actor, this.object, this.defaultStateMoving3)!;
      }

      setStalkerState(this.object, this.currentStateMoving);
    }
  }

  /**
   * Handle animation update on some path_look point.
   * Fired on timeout or when animation is finished.
   */
  public onAnimationEnd(): void {
    logger.info("Animation end for: '%s' at '%s'", this.object.name(), this.lastLookPointIndex);

    // No active scheme for logics update, just skip update.
    if ($isNil(registry.objects.get(this.object.id()).activeScheme)) {
      return;
    }

    const signalOnTime: Nillable<TName> = this.patrolLookWaypoints!.get(this.lastLookPointIndex!)
      .sigtm as Nillable<TName>;

    // Animation is finished, have signal to set -> set it for activeScheme.
    if (signalOnTime) {
      setObjectActiveSchemeSignal(this.object, signalOnTime);
    }

    // Animation is finished, currently on terminal waypoint -> notify logics about finally reaching the point.
    if ($isNotNil(this.lastWalkPointIndex) && (this.patrolWalk as Patrol).terminal(this.lastWalkPointIndex)) {
      if (isObjectAtWaypoint(this.object, this.patrolWalk!, this.lastWalkPointIndex)) {
        return this.onWalkWaypoint(this.object, null, this.lastWalkPointIndex);
      }

      this.reset(
        this.patrolWalkName as TName,
        this.patrolWalkWaypoints,
        this.patrolLookName,
        this.patrolLookWaypoints,
        this.team,
        this.suggestedStates,
        this.patrolCallbackDescriptor
      );
    } else {
      // Update movement state and continue patrolling.
      setStalkerState(this.object, this.currentStateMoving);

      // Still have to reach final point, no way to synchronize before it.
      assert(
        !this.patrolLookWaypoints!.get(this.lastLookPointIndex!).syn,
        "Object '%s': path_walk '%s': syn flag used on non-terminal waypoint.",
        this.object.name(),
        this.patrolWalkName
      );
    }
  }

  /**
   * Handle animation turn end and starting to correctly animate.
   * Usually means that look point reached and prepared, animation just starting and required signals emit.
   * Sync requirement may block signals emitting for a while.
   */
  public onAnimationTurnEnd(): void {
    logger.info("Animation turn end for: '%s' at '%s'", this.object.name(), this.lastLookPointIndex);

    const waypoint: IWaypointData = this.patrolLookWaypoints!.get(this.lastLookPointIndex as TIndex);

    // Sync is required, wait for others.
    if (waypoint.syn) {
      this.synchronizationSignal = waypoint.sig as Nillable<TName>;

      // Assert that `syn` signal is set.
      assert(
        this.synchronizationSignal,
        "Object '%s': path_look '%s': syn flag used without sig flag.",
        this.object.name(),
        this.patrolLookName
      );

      // Mark current object as synchronized.
      if (this.team) {
        patrolConfig.PATROL_TEAMS.get(this.team).set(this.object.id(), true);
      }
    } else {
      // Emit turn signal since not blocked by sync.
      setObjectActiveSchemeSignal(this.object, waypoint.sig ? waypoint.sig : "turn_end");
    }

    if ($isNotNil(this.retvalAfterRotation)) {
      assert(
        this.patrolCallbackDescriptor,
        "Object '%s': path_look '%s': ret flag is set, but callback function wasn't registered in move_mgr.reset()",
        this.object.name(),
        this.patrolLookName
      );

      setStalkerState(this.object, this.currentStateStanding);

      assert(
        this.patrolCallbackDescriptor,
        "object '%s': path_look '%s': ret flag is set, but callback function wasn't registered in move_mgr.reset()",
        this.object.name(),
        this.patrolLookName
      );

      if (
        this.patrolCallbackDescriptor.callback.call(
          this.patrolCallbackDescriptor.context,
          EWaypointArrivalType.AFTER_ANIMATION_TURN,
          this.retvalAfterRotation,
          this.lastWalkPointIndex as TIndex
        )
      ) {
        // Nothing to do here.
        return;
      } else {
        setStalkerState(
          this.object,
          this.currentStateStanding,
          { context: this, callback: this.onAnimationEnd, turnEndCallback: this.onAnimationTurnEnd },
          this.patrolWaitTime,
          { lookPosition: (this.patrolLook as Patrol).point(this.lastLookPointIndex as TIndex), lookObjectId: null }
        );
      }
    }
  }

  /**
   * Handle reaching `walk` waypoint of patrol.
   *
   * Updates the current moving state, fires the arrival callback and emits configured signals, then either continues
   * moving or delegates to the look waypoint handler depending on waypoint flags and stop probability.
   *
   * @param object - Game object reaching the waypoint.
   * @param actionType - Type of the patrol action reported by the engine.
   * @param index - Index of the reached walk waypoint.
   */
  public onWalkWaypoint(object: GameObject, actionType: Nillable<number>, index: Nillable<TIndex>): void {
    logger.info(
      "Waypoint `walk`: '%s' action '%s', '%s' -> '%s'",
      this.object.name(),
      actionType,
      this.lastWalkPointIndex,
      index
    );

    // Patrol point is out of bounds.
    if (index === -1 || $isNil(index)) {
      return;
    }

    this.lastWalkPointIndex = index;

    logger.info("Walk index set: '%s' -> '%s'", this.object.name(), index);

    this.currentStateMoving = pickSectionFromCondList(
      registry.actor,
      this.object,
      this.patrolWalkWaypoints.get(index).a ?? this.defaultStateMoving1
    )!;

    const retv = this.patrolWalkWaypoints.get(index).ret;

    if (retv) {
      const retvNum: Nillable<number> = tonumber(retv) as Nillable<number>;

      if (!this.patrolCallbackDescriptor) {
        abort(
          "object '%s': path_walk '%s': ret flag is set, but callback function wasn't registered in move_mgr:reset()",
          this.object.name(),
          this.patrolWalkName
        );
      }

      if (
        this.patrolCallbackDescriptor.callback.call(
          this.patrolCallbackDescriptor.context,
          EWaypointArrivalType.BEFORE_ANIMATION_TURN,
          retvNum,
          index
        )
      ) {
        return;
      }
    }

    const sig: Nillable<TName> = this.patrolWalkWaypoints.get(index).sig;

    // todo: Always set signal path end on terminal points?
    if (sig) {
      // Set reach signal if override provided.
      setObjectActiveSchemeSignal(this.object, sig);
    } else if (index === this.patrolWalkWaypoints.length() - 1) {
      // Set path end if terminal point and no override provided.
      setObjectActiveSchemeSignal(this.object, "path_end");
    }

    const stopProbability = this.patrolWalkWaypoints.get(index).p;

    // Not looking right now OR have probability to stop, check against random chance:
    if (!this.patrolLook || (stopProbability && tonumber(stopProbability)! < math.random(1, 100))) {
      return setStalkerState(this.object, this.currentStateMoving);
    }

    const flags: Flags32 = this.patrolWalkWaypoints.get(index).flags;

    // Search for check??? todo: probably means that should not search for any look point here.
    if (flags.get() === 0) {
      return setStalkerState(this.object, this.currentStateMoving);
    } else {
      this.onLookWaypoint(object, actionType, index, flags);
    }
  }

  /**
   * Handle reaching `look` waypoint of patrol.
   *
   * Selects the matching look point by flags, applies the standing state, computes the wait time and rotation return
   * value, then drives the object to stand and look at the chosen point.
   *
   * @param object - Game object reaching the waypoint.
   * @param actionType - Type of the patrol action reported by the engine.
   * @param index - Index of the corresponding walk waypoint.
   * @param flags - Flags used to select the matching look point.
   */
  public onLookWaypoint(
    object: GameObject,
    actionType: Nillable<number>,
    index: Nillable<TIndex>,
    flags: Flags32
  ): void {
    const [lookPointIndex] = choosePatrolWaypointByFlags(this.patrolLook as Patrol, this.patrolLookWaypoints!, flags);

    logger.info(
      "Waypoint `look`: '%s' action '%s', '%s' -> '%s', selected '%s'",
      this.object.name(),
      actionType,
      this.lastWalkPointIndex,
      index,
      lookPointIndex
    );

    if ($isNil(lookPointIndex)) {
      abort(
        "Object '%s': path_walk '%s', index.ts %d: cannot find corresponding point(s) on path_look '%s'.",
        this.object.name(),
        this.patrolWalkName,
        index,
        this.patrolLookName
      );
    }

    this.currentStateStanding = pickSectionFromCondList(
      registry.actor,
      this.object,
      this.patrolLookWaypoints!.get(lookPointIndex).a ?? this.defaultStateStanding
    )!;

    const suggestedWaitTime = this.patrolLookWaypoints!.get(lookPointIndex).t;

    if (suggestedWaitTime) {
      if (suggestedWaitTime === "*") {
        this.patrolWaitTime = null;
      } else {
        const waitTime: TDuration = tonumber(suggestedWaitTime)!;

        if (waitTime !== 0 && (waitTime < 1000 || waitTime > 45000)) {
          abort(
            "Object '%s': path_look '%s': flag 't': incorrect time specified " +
              "(* or number in interval [1000, 45000] is expected)",
            this.object.name(),
            this.patrolLookName
          );
        }

        this.patrolWaitTime = waitTime;
      }
    } else {
      this.patrolWaitTime = patrolConfig.DEFAULT_PATROL_WAIT_TIME;
    }

    const retVal: Nillable<string> = this.patrolLookWaypoints!.get(lookPointIndex).ret;

    this.retvalAfterRotation = retVal ? (tonumber(retVal) as number) : null;

    logger.info("Look index set: '%s' -> '%s'", this.object.name(), lookPointIndex);

    this.lastLookPointIndex = lookPointIndex;

    setStalkerState(
      this.object,
      this.currentStateStanding,
      { context: this, callback: this.onAnimationEnd, turnEndCallback: this.onAnimationTurnEnd },
      this.patrolWaitTime,
      { lookPosition: (this.patrolLook as Patrol).point(this.lastLookPointIndex as TIndex), lookObjectId: null }
    );

    this.update();
  }

  /**
   * Handle object extrapolate callback.
   *
   * @param object - Target object callback is called for.
   * @param pointIndex - Index of extrapolate point.
   */
  public onExtrapolate(object: GameObject, pointIndex: TIndex): void {
    this.canUseGetCurrentPointIndex = true;
    this.currentPointInitAt = time_global();
    this.currentPointIndex = this.object.get_current_point_index();

    logger.info(
      "Extrapolate patrol point for: '%s' at '%s' | '%s'",
      this.object.name(),
      this.currentPointIndex,
      pointIndex
    );
  }
}
