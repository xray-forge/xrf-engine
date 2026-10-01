import type { TDuration, TName, TNumberId, TProbability, TRate } from "xray16/lib";

/**
 * Psy effects of a zone, added up over all the zones the actor is in.
 */
export interface IPsyZoneEffects {
  // Mumble sound and post process intensity added by the zone.
  intensity: TRate;
  // Post process played while inside, none when `nil`.
  postprocess: TName;
  hitIntensity: TRate;
  phantomProb: TProbability;
  muteSoundThreshold: TRate;
  // Effects below are taken from the zone entered last.
  noStatic: boolean;
  noMumble: boolean;
  // Hit type, chemical burn for `chemical` and telepathic otherwise.
  hitType: TName;
  hitFreq: TDuration;
}

/**
 * Descriptor of a post-process effector applied by the psy antenna.
 */
export interface IPsyPostProcessDescriptor {
  // Intensity added up by the zones the actor is in, the current one approaching it.
  intensityBase: TRate;
  intensity: TRate;
  id: TNumberId;
}
