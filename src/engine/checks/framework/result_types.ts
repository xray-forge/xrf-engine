/**
 * Headline verdict of one flow invocation.
 *
 * This module is free of game dependencies, so the MCP server reads what the endpoint answers in the same terms.
 *
 * @inline
 */
export enum EFlowOutcome {
  /** Every step is reached, and no assertion failed during the walk. */
  COMPLETE = "COMPLETE",
  /** The walk stopped at a step the world has not reached yet. */
  WAITING = "WAITING",
  /** An assertion failed in this invocation, or earlier in a walk that is now complete. */
  FAIL = "FAIL",
  /** A fresh walk whose starting state is not met. */
  BLOCKED = "BLOCKED",
  /** The environment cannot host the flow, such as another level being loaded. */
  SKIP = "SKIP",
}

/**
 * How far a step's travel moved the actor during one flow invocation.
 *
 * @inline
 */
export enum EFlowTravel {
  /** No travel ran: every step observed was reached, travel was not allowed, or a scene held the actor. */
  NONE = "NONE",
  /** A travel ran on the loaded level. */
  ON_LEVEL = "ON_LEVEL",
  /** A travel started a jump to another level, so the game is silent until that level greets. */
  TO_LEVEL = "TO_LEVEL",
}
