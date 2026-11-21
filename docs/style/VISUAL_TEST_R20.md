# R20 visual test: assessment (2026-11-15)

Video: `out/_visual-test/visual-test-r20.mp4` (git-ignored; re-render with
`node scripts/render.mjs VisualTest out/_visual-test/visual-test-r20.mp4`, ~4 min). Composition `VisualTest`,
source `src/videos/_visual-test/Video.tsx`. 20 s, 1080x1920, 30 fps, **no audio** (visual test only). Frames:
`docs/style/frames/r20/`. Direction and gap analysis: `VISUAL_DIRECTION.md`.

The gag: sunset on a wet cobbled high street. You walk up to a gumball machine, flip in your coin, turn the crank:
nothing. The old man by the lamp laughs. You kick it, the lid pops, 84 gumballs burst out round you.

| Shot | Frames | What it demonstrates |
|---|---|---|
| S1 establish | 0-110 | Low crane over wet cobbles past a blurred barrel; raking sun, sunlit/shaded ground blocks, sunlit facades, lit shopfronts, birds, dust |
| S2 walk-in | 110-200 | Dolly back ahead of you; face slides on the glance, `exprAt` determined -> sneaky -> smug, profile turn to the machine (eyeline cut) |
| S3 coin macro | 200-262 | Hero prop at macro scale (chrome/gold spec, bezel, screws, 1¢ label); the coin `toss`es into the slot, the crank turns, tilt to the chute |
| S4 reaction | 262-352 | Over the globe (soft colourful foreground); focus rack globe -> face; ladder smug -> confused (eyes to the chute) -> sweat -> angry + squash; knock; eye dart right |
| S5 whip | 352-410 | Whip pan (motion blur) to the old man: laughing, pointing, mouth flapping, boater |
| S6 kick | 410-470 | Low profile: lunge, wind-up lean, kick with reach, hit shake, the machine rocks and settles (damped) |
| S7 burst | 470-546 | Lid pops and lands; gumballs arc, bounce and roll toward the lens; you spin round ring-eyed with a "!" and blink into a grin |
| S8 grin | 546-600 | Punch-in CU: grin -> smug; gumballs still settling |

## Measured (same scripts as the references)

| | refs R1-R6 | pilot | **test** |
|---|---|---|---|
| saturation mean | .44-.51 | .36 | **.52** |
| colourfulness | .26-.34 | .24 | **.35** |
| luma mean | .37-.54 | .44 | **.46** |
| still frames % | 7-15 | 4 | **5.8** |
| motion p50 | .015-.036 | .024 | **.016** |
| dead frames % | 2.5-6.9 | 2.4 | **0** |
| QA layer 1 | | | **pass** (only "intended" terrace joins) |

## What improved (judged on the moving video, not the numbers)
- **Light has shape.** The pilot's frames were one flat colour; here sunlit facades sit against plum shade, shadows lie
  across the cobbles, the far end of the street keeps its colour and the lit shopfronts glow. This was the largest single
  gap with refs 2, 4 and 6, and it is closed for this kind of scene.
- **Characters act between the beats.** Head turns read (the face slides), eyes dart before the whip, faces change
  through blinks in ladders, listeners tilt and glance.
- **Physics with follow-through.** Coin, lid and gumballs arc, land late, bounce lower and settle; the machine rocks
  and decays. This matches R2/R3/R6 and the pilot had none of it.
- **Cinematography.** 8 shot sizes and angles in 20 s (low crane, dolly, macro, OTS + rack, whip, low profile, burst
  wide, punch-in CU), foreground layers in 5 shots, a focus pull, a whip, an impact shake.
- **Materials.** The hero prop reads as polished metal and glass at macro scale (R6's lesson) without leaving the
  painted world.

## What still falls short (honest)
1. **Colour slightly over the reference band** (sat .52 vs ≤ .51, colourfulness .35 vs ≤ .34). The sunset grade can
   come down ~5 % more; the pink-violet sky reads a little sweet next to R4/R6.
2. **The camera never fully holds** (0.2 % static frames; refs 4-10 %, holds of 15-38 f). Every shot glides. Add 15-25 f
   true holds on reaction beats (S4 after "angry", S8 last second).
3. **The kick is the weakest beat.** It now reaches and the machine rocks, but the leg is a stick lift. The R6 hop has a
   squash on contact, a foot-hurts beat and a dust puff. Next: a contact puff/ring at the foot, a 2-frame impact frame,
   and a hop back.
4. **Shot S1 shows your back for 3.7 s.** It is fine for an establishing shot, but the refs introduce the face sooner.
   Cut S1 to ~2.5 s.
5. **Light shafts barely show.** At the strength I allowed (.16) and with this sun angle they are nearly invisible. They need a
   backlit shot or a dark interior to earn their place. Not tested in a scene that suits them.
6. **Wet-ground gloss is subtle.** It reads on the cobbles in S1 but would only really sing at night with practicals
   (R5). Untested at night.
7. **No sound.** A real Short would carry a bed, the coin clink, the crank ratchet and the burst; out of scope for this
   visual test.
8. **Characters' cream heads in shade go lavender** (S6), which suits the scene tint but makes faces less warm than
   R5/R6 heads under practicals. Consider a small warm bounce on cards in sunset light.

## Next
Apply the R20 kit to the next episode (it is kit-wide: haze, face slide). Run `video-qa` on it. Fix 2 and 3 above in
the kit (a `hold()` camera helper; a contact-puff effect for hits).

## R21 (user feedback, same day): lights stealing focus, characters "still kinda cheap"
Video: `out/_visual-test/visual-test-r21.mp4`. Close-ups of refs 1, 2, 5, 6 next to ours showed four cheap cues:
1. **Outline** ~1.2 % of the head width, brown, plum at sunset; refs 2-3 %, near-black. Now `LINE` .8, `INK` #1c1414,
   sunset `charInk` #1c1220.
2. **Features** at 0.7 scale: dot eyes and a dash mouth on a big blank head. Now `FEAT` 1.0.
3. **Head shading**: a hard light/shade line across the face (lit-cards terminator). Now a soft form shade
   (smoothstep .12-.8, depth .42).
4. **Hair** near-black under scene light: a flat helmet, strands invisible. Lifted two value steps (#664430).
Light: sunset key softened (lit 1.42/.94/.58), lamps 1.3, lit windows/lamp glass x .4 (`LightPreset.glow`, kit-wide
option, default 1 = night), characters keep .93 of their light in shade, halation .12, and every character shot has a
subject `pool` (the grade darkens away from the face). Measured: luma .40, sat .51, colourfulness .32 (all inside
the refs' band now), still frames 6 %.
Still open from the R20 list: true camera holds, a kick contact effect, S1 length.
