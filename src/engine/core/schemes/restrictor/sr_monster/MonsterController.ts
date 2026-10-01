import { cond, game, move, patrol, sound_object } from "xray16";
import { ESoundObjectType, GameObject, ServerMonsterAbstractObject, SoundObject, Vector } from "xray16/alias";
import { copyVector, Nillable, subVectors, TCount, TIndex, TName } from "xray16/lib";
import { $isNil, $isNotNil } from "xray16/macros";

import { getManager, registry } from "@/engine/core/database";
import { SoundManager } from "@/engine/core/managers/sounds/SoundManager";
import { AbstractSchemeController } from "@/engine/core/schemes/base";
import { ISchemeMonsterState } from "@/engine/core/schemes/restrictor/sr_monster/sr_monster_types";
import {
  scriptCaptureMonster,
  scriptCommandMonster,
  scriptReleaseMonster,
  trySwitchToAnotherSection,
} from "@/engine/core/schemes/runtime";

/**
 * Controller handling monster scheme behaviour for a restrictor zone.
 * Moves a virtual sound source along a patrol path while the actor is inside the zone and spawns a monster at the end.
 */
export class MonsterController extends AbstractSchemeController<ISchemeMonsterState> {
  public isActorInside: Nillable<boolean> = null;
  public finalAction: Nillable<boolean> = null;
  public idleState: Nillable<boolean> = null;
  public pathName: Nillable<string> = null;
  public curPoint: Nillable<number> = null;
  public dir!: Vector;
  public current!: Vector;
  public target!: Vector;

  public monster: Nillable<ServerMonsterAbstractObject> = null;
  public monsterObject: Nillable<GameObject> = null;

  public soundObject: Nillable<SoundObject> = null;
  public appearSound!: SoundObject;

  public override activate(): void {
    this.isActorInside = false;

    this.state.idleEnd = 0;
    this.state.signals = new LuaTable();
    this.soundObject = null;
    this.finalAction = false;
    this.appearSound = new sound_object("monsters\\boar\\boar_swamp_appear_1");
    this.idleState = false;
    this.pathName = null;
    this.monsterObject = null;
  }

  public update(delta: number): void {
    const actor: GameObject = registry.actor;

    if (this.idleState) {
      if (this.state.idleEnd <= game.time()) {
        this.idleState = false;
      }

      return;
    }

    if ($isNil(this.isActorInside) && $isNotNil(this.state.monster)) {
      this.isActorInside = this.object.inside(actor.position());

      return;
    }

    if (this.object.inside(actor.position())) {
      if (!this.isActorInside) {
        this.onEnter();
        this.isActorInside = true;
      }
    }

    if (
      this.finalAction &&
      (!registry.objects.get(this.monster!.id) ||
        this.monsterObject!.position().distance_to(this.state.path.point(this.state.path.count() - 1)) <= 1)
    ) {
      if (registry.objects.has(this.monster!.id)) {
        scriptReleaseMonster(this.monsterObject as GameObject);
      }

      registry.simulator.release(this.monster, true);

      this.monster = null;
      this.monsterObject = null;
      this.finalAction = false;
      this.idleState = true;
      this.state.idleEnd = game.time() + this.state.idle;
      this.isActorInside = false;
      this.resetPath();

      return;
    }

    if (this.isActorInside === true && !this.monster) {
      const targetPosition: Vector = copyVector(this.current);

      targetPosition.mad(this.dir, (this.state.soundSlideVel * delta) / 1000);
      if (targetPosition.distance_to(this.current) > this.current.distance_to(this.target)) {
        this.curPoint = this.getNextPoint();
        this.setPositions();
      } else {
        this.current = copyVector(targetPosition);
      }

      this.soundObject = $isNotNil(this.state.soundObject)
        ? getManager(SoundManager).play(this.object.id(), this.state.soundObject)
        : null;

      if (this.soundObject && this.soundObject.playing()) {
        this.soundObject.set_position(this.current);
      }
    } else if (!this.monsterObject && this.monster && registry.objects.get(this.monster.id) && !this.finalAction) {
      this.monsterObject = registry.objects.get(this.monster.id).object!;

      scriptCaptureMonster(this.monsterObject, true);

      scriptCommandMonster(
        this.monsterObject,
        new move(move.run_fwd, this.state.path.point(this.state.path.count() - 1)),
        new cond(cond.move_end)
      );
      this.finalAction = true;
    }

    trySwitchToAnotherSection(this.object, this.state);
  }

  /**
   * Reset the patrol path and position the sound source when the actor enters the zone.
   */
  public onEnter(): void {
    this.resetPath();
    this.setPositions();
  }

  /**
   * Pick a patrol path from the configured path table and reset the current point to its start.
   */
  public resetPath(): void {
    this.curPoint = 0;

    const pathCount: TCount = this.state.pathTable!.length();

    if (pathCount === 1) {
      this.pathName = this.state.pathTable!.get(1);
      this.state.path = new patrol(this.pathName);

      return;
    }

    let pathNameNew: Nillable<TName> = this.pathName;

    // todo: WTF?
    while (this.pathName === pathNameNew) {
      pathNameNew = this.state.pathTable!.get(math.random(1, pathCount));
    }

    this.pathName = pathNameNew;
    this.state.path = new patrol(this.pathName!);
  }

  /**
   * Get the index of the next point on the current patrol path, wrapping back to the start at the end.
   *
   * @returns Index of the next patrol point.
   */
  public getNextPoint(): TIndex {
    if (this.curPoint! + 1 < this.state.path.count()) {
      return this.curPoint! + 1;
    } else {
      return 0;
    }
  }

  /**
   * Update the current and target positions and movement direction.
   * Spawns the monster and plays the appear sound when the path wraps.
   */
  public setPositions(): void {
    if (this.getNextPoint() === 0) {
      if (!this.monster && this.state.monster) {
        this.monster = registry.simulator.create<ServerMonsterAbstractObject>(
          this.state.monster,
          this.current,
          this.object.level_vertex_id(),
          this.object.game_vertex_id()
        );
      }

      this.appearSound.play_at_pos(registry.actor, this.current, 0, ESoundObjectType.S3D);

      if (this.soundObject) {
        this.soundObject.stop();
      }

      this.resetPath();
    }

    this.current = this.state.path.point(this.curPoint as number);
    this.target = this.state.path.point(this.getNextPoint());
    this.dir = subVectors(this.target, this.current).normalize();
  }
}
