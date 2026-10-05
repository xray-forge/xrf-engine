import { game } from "xray16";
import { Time } from "xray16/alias";
import { Nillable, TDuration } from "xray16/lib";

import type { Squad } from "@/engine/core/objects/squad/Squad";
import { ESquadActionType, ISquadAction } from "@/engine/core/objects/squad/squad_types";
import { squadConfig } from "@/engine/core/objects/squad/SquadConfig";

/**
 * Implement alife action to stay on target.
 */
export class SquadStayOnTargetAction implements ISquadAction {
  public readonly type: ESquadActionType = ESquadActionType.STAY_ON_TARGET;
  public readonly squad: Squad; // Squad performing stay target action.

  public actionStartTime: Nillable<Time> = null;
  public actionIdleTime: TDuration = math.random(squadConfig.STAY_POINT_IDLE_MIN, squadConfig.STAY_POINT_IDLE_MAX);

  public constructor(squad: Squad) {
    this.squad = squad;
  }

  /**
   * Stay on target, initialize action.
   */
  public initialize(isUnderSimulation?: boolean): void {
    this.actionStartTime = game.get_game_time();
  }

  /**
   * Generic cleanup method.
   */
  public finalize(): void {}

  /**
   * Generic update tick.
   * When online the squad does not stay on target and finishes immediately so it
   * re-evaluates its action; under simulation it stays until the idle time has elapsed.
   *
   * @param isUnderSimulation - Whether the squad is under offline simulation.
   * @returns Whether the stay-on-target action is finished.
   */
  public update(isUnderSimulation: boolean): boolean {
    if (isUnderSimulation) {
      return game.get_game_time().diffSec(this.actionStartTime as Time) > this.actionIdleTime;
    }

    return true;
  }

  /**
   * @returns Remaining duration to stay on target.
   */
  public getStayIdleDuration(): TDuration {
    return this.actionStartTime ? this.actionIdleTime - game.get_game_time().diffSec(this.actionStartTime) : 0;
  }
}
