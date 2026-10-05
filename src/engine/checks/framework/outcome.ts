/**
 * Headline verdict of one flow invocation.
 *
 * Free of game dependencies, so the MCP server reads the verdicts the endpoint answers with in the same terms.
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
