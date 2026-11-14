import { getInputProps } from "remotion";

/**
 * Look-development lab (2026-11-15 art-direction study): render the same shots under candidate directions without
 * touching production. Pass `{"lookdev": "<mode>"}` as input props (`stills.mjs --props`). Default "base" = today.
 *   diorama  space and air: painted ambient occlusion in the scene's shade colour + stronger aerial depth haze
 *   lit      light on the drawings: cards shade as soft pillows between their ink lines (key wrap + backlight rim)
 *   paper    tangible cut-outs: card curl, a cut-paper border, paper grain
 *   hybrid   diorama + lit
 */
export type LookMode = "base" | "diorama" | "lit" | "paper" | "hybrid";

export const LOOKDEV: LookMode = (() => {
  try {
    return ((getInputProps() as { lookdev?: LookMode }).lookdev ?? "base") as LookMode;
  } catch {
    return "base";
  }
})();

export const LOOK_FEATURES = {
  ao: LOOKDEV === "diorama" || LOOKDEV === "hybrid",
  haze: LOOKDEV === "diorama" || LOOKDEV === "hybrid",
  litCards: LOOKDEV === "lit" || LOOKDEV === "hybrid",
  paper: LOOKDEV === "paper",
};
