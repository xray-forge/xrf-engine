# [XRF](../../../) / ENGINE / CHECKS

In-game flow checks for behavior unit tests cannot cover, including Lua, INI parsing, tasks, and engine bindings.
They are built into gamedata on demand.

A flow (`*.flow.ts`) observes quest progress without changing it. It verifies reached steps, stops at the first pending
step, and stores progress in the actor save. Load an earlier save to run a flow again.

## Writing flows

Flow files have no exports and import from `@/engine/checks/framework`.

- `requires` declares the starting level and state.
- Ordered `step` calls describe progression. Each needs `reached`; `verify`, `travel`, and `handOff` are optional.

`travel` runs only for a step that is not reached yet, and the step is tested again on arrival. It never runs for a
reached step, so it cannot undo what the game did to reach it, such as a scene moving the actor. It is also deferred
while a scene holds the actor, as a fade with the UI disabled does, since the scene releases the actor only where it
plays.

The task manager closes tasks and pays `reward_money` on its next update, after the dialog or logic that finished them.
Observe that in a step of its own, after the step reached by the portion, rather than in the same `verify`.

`reached` must observe something the game actually sets. A predicate naming a portion nothing gives would stall the walk
forever, so a step that is not reached while a later one is gets reported and walked past rather than waited on.

## Commands

```text
npm run cli checks list
npm run cli checks build
npm run cli checks clean
npm run typecheck:checks
```

Run a built flow in the game console:

```text
run_script flow_<name>
```

Use the `mixed` or `release` engine variant with a loaded level.

## Output

Every reported line goes to the game console, the engine log, and `$logs$\xrf_checks.log`. That file is truncated once
per game session and appended thereafter, with a banner per invocation.
