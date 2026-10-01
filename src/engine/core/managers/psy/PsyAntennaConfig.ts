export const psyAntennaConfig = {
  // Phantoms spawned around the actor, ahead of them within the field of view in degrees.
  PHANTOM_MAX_COUNT: 8,
  PHANTOM_SPAWN_RADIUS: 30,
  PHANTOM_FOV: 45,
  // Milliseconds before the first phantom spawn roll, and between the next ones.
  PHANTOM_FIRST_IDLE_MIN: 2_000,
  PHANTOM_FIRST_IDLE_MAX: 5_000,
  PHANTOM_IDLE_MIN: 5_000,
  PHANTOM_IDLE_MAX: 10_000,
  // Psy hit power at full hit intensity.
  HIT_AMPLITUDE: 1,
  // Intensity change per 100 ms, as current intensities approach the ones zones set.
  INTENSITY_INERTIA: 0.05,
  // Post process effectors take ids upwards from this one.
  POSTPROCESS_BASE_ID: 1_500,
};
