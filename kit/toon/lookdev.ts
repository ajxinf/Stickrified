import { getInputProps } from "remotion";

/**
 * Look-development lab (2026-11-15 art-direction study): render the same shots under candidate directions without
 * touching production. Pass `{"lookdev": "<mode>"}` as input props (`stills.mjs --props`). Default "hybrid" = A+B, the approved
 * production look (user decision 2026-11-15); "base" = the pre-A+B look.
 *   diorama  space and air: painted ambient occlusion in the scene's shade colour + stronger aerial depth haze
 *   lit      light on the drawings: cards shade as soft pillows between their ink lines (key wrap + backlight rim)
 *   paper    tangible cut-outs: card curl, a cut-paper border, paper grain
 *   hybrid   diorama + lit
 *   real     R25 (user 2026-11-21): 2D cards in a REALISTIC 3D world like visual-ref8/9: soft physical light (Lambert,
 *            sky/ground ambient, GGX-like highlights, relief from the textures), pooled practicals, soft clouds, no
 *            world ink; plus AO, haze and lit cards. The production default.
 */
export type LookMode = "base" | "diorama" | "lit" | "paper" | "hybrid" | "real";

export const LOOKDEV: LookMode = (() => {
  try {
    return ((getInputProps() as { lookdev?: LookMode }).lookdev ?? "real") as LookMode;
  } catch {
    return "real";
  }
})();

export const LOOK_FEATURES = {
  ao: LOOKDEV === "diorama" || LOOKDEV === "hybrid" || LOOKDEV === "real",
  haze: LOOKDEV === "diorama" || LOOKDEV === "hybrid" || LOOKDEV === "real",
  litCards: LOOKDEV === "lit" || LOOKDEV === "hybrid" || LOOKDEV === "real",
  real: LOOKDEV === "real",
  paper: LOOKDEV === "paper",
};
