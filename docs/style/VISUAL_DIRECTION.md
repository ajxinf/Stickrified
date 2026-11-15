# Visual direction R20: what visual-ref1-6 do that we don't (2026-11-15)

Study of `assets/visual-ref1.mp4` … `visual-ref6.mp4` (private study material: craft only, never their stories, characters,
jokes or shots; never upload them). Method, all six videos:
- contact sheets every 0.5 s (every frame of the timeline seen at 2 Hz) and **consecutive-frame strips** (every 2nd frame,
  1.6 s) at walks, reactions, throws, whips and idle holds, so the animation was judged moving, not as stills;
- per-frame optical flow on all six and on our pilot (`final.mp4`): a similarity fit = camera motion, the residual =
  character/world animation; plus colour, luma and cut measurements (`scripts/ref_compare.py`).
Earlier notes on refs 1-3 (`docs/style/r14/notes_visual_refs.md`) still hold; refs 4-6 were new.

## 1. Measured

| | R1 | R2 | R3 | R4 | R5 | R6 | pilot |
|---|---|---|---|---|---|---|---|
| length s | 58 | 63 | 64 | 41 | 78 | 61 | 81 |
| camera px/f p50 / p90 | 3.2 / 45 | 3.2 / 43 | 11 / 64 | 6.0 / 42 | 3.6 / 35 | 2.4 / 36 | 4.0 / 34 |
| camera still % / longest hold f | 9 / 24 | 10 / 37 | 4 / 15 | 4 / 22 | 10 / 38 | 6 / 25 | 2 / 10 |
| frames with local animation % | 69 | 69 | 87 | 88 | 72 | 81 | 76 |
| dead frames (no camera, no animation) % | 6.2 | 6.9 | 2.8 | 2.9 | 6.6 | 2.5 | 2.4 |
| saturation mean | .45 | .44 | .48 | .45 | .51 | .46 | **.36** |
| colourfulness | .34 | .26 | .31 | .31 | .26 | .28 | **.24** |
| luma mean / p5 | .52/.11 | .42/.07 | .49/.16 | .54/.21 | .37/.05 | .40/.12 | .44/.13 |

**Finding: the gap is not the amount of motion.** Our camera and animation volumes sit inside the references' range
(we even have fewer dead frames). The pilot's camera is never truly still: 2 % vs 4-10 %, longest hold 10 f vs 15-38. The
gap is in what the frames look like, and in how the motion is shaped.

## 2. Each reference, what it does well

**R1 (lottery clerk, interiors + moonlit fantasy).** One continuous camera move replaces cuts: medium -> dive over the
shoulder to the ticket -> macro with the scanner as a blurred foreground block -> whip back to the face. Reactions are
*ladders*: neutral -> (closed-eye frame) -> ring eyes + sweat -> eyes slide sideways -> sly, ~0.3 s a step, each swap
passing through a blink (strip `r1_react_ladder`). Over-the-shoulder reverses with the other head as a huge dark soft mass.
Shape-match dissolves (round can -> round iris -> moon). Lighting tells time: one bare bulb at night, a sunrise flare as a
transition.

**R2 (scratchcard scheme).** Props emit light onto the character (gold glow / green stink re-light the face). A thrown
guy flies in an arc and lands; his box lands *after him*, tumbling, then a plant drops out: overlapping action with
settle (strip `r2_throw`). Golden-hour lobby: window-frame shadows lie across the floor as long diagonal bars. Wide after
macro = rhythm of scale. Data shown on props (glowing digits) instead of overlays.

**R3 (pirate cannons).** Object-follow camera (ride the cannonball between ships); 3D splinters that keep falling and stay
as set dressing; flat painted smoke clouds as frame-filling wipes, drawn in the house style; time-lapse by light in a
locked wide. Highest motion of the six (camera p50 11 px/f): it is the action short.

**R4 (pardon seller, new).** Brightest and most saturated (luma .54): a storybook village with **crisp cast shadows
everywhere** (awnings, fences, characters), a forest with **soft light shafts and haze** through the trunks, a sunset
ending with **long fence shadows raking across the ground** under a purple sky. Foreground-object wipes (a tree trunk, a
sword blade whose reflection shows the priest's sweating face, a coin flipped at the lens). Face fills red bottom-up with
steam puffs while the arm swings (strip `r4_scream`). A glowing crack runs along the ground and lights it.

**R5 (memory shop, new).** The most *lit* video: low-key night city in blue with warm practicals, **wet pavement mirroring
the shop windows**, rain streaks, light shafts under a bridge. **Heads take the light hard**: warm-lit half and cool-blue
half on the same face, a face in a sunbeam goes orange, a face in a hospital room goes lavender. Strong DOF (backgrounds
mush in CUs), a fast camera dive with a rack focus from face to object (strip `r5_open_face`). Idle holds stay alive with
**head tilts, eye darts and blinks** while the camera trucks (strip `r5_bench_idle`).

**R6 (six-shooter, new).** The richest materials: polished saloon floor with highlights, a chrome revolver with real
specular, a glass x-ray cutaway; bottle shelves full of warm lit bottles as background density; bokeh from lanterns.
Same character, same pose, three different worlds behind it in one cross-dissolving montage (day / snow / rain night).
**Whip pans with heavy directional blur** (4-6 frames) between characters. A ground-level camera with blurred grass tufts
in the foreground; the hat flies off on the gunshot, spins, and lands back on the head ~30 frames later (follow-through,
strip `r6_footshot`). Long sunlit shadows from bunting and posts across a desert street.

**Shared by all six:** inked flat characters in a painted 3D world (our family); crisp *directional* light with visible
cast shadows; saturated colour (sat .44-.51); 8-10 frame dissolves between places, hard cuts and whips inside one; faces
change on the word; at least one foreground layer in most mediums. **Unique:** R3's object-follow and painted smoke wipes,
R5's wet reflections and two-colour faces, R6's specular props and world-swap montage, R4's light shafts and foreground
wipes, R1's expression ladders and shape-match dissolves, R2's prop-emitted light.

## 3. Gap analysis

| Category | Reference technique (refs) | Ours (pilot + kit before R20) | Gap | Change | Priority |
|---|---|---|---|---|---|
| Lighting | Low sun **rakes across** the set; long, crisp cast shadows of posts, people, buildings break the ground into warm/cool blocks (R2, R4, R6) | Golden/dawn/dusk keys come from **behind the street**: at el 7-12 the near row shades the whole street; frames read one flat colour | No value structure; "flat" | `LIGHTS.sunset`: az -32, el 26 (cross-street shadow reach ~1.1x building height), warm lit / plum shade | Critical |
| Colour | Saturated, clean darks, backgrounds stay in colour (all) | Sat .36 vs .44-.51; **diorama haze from 14 m up to .75** bleaches the mid/background to peach; `accent` mute greys other hues | Milky, pastel, "washed" | Haze from 24 m, max .4 (kit-wide); `sunset` grade (exposure 1.25, cool shadows / warm highs); measured sat .49-.60 on the test | Critical |
| Rendering | Bright practicals glow (all); **wet / polished floors mirror lights** (R5, R6) | Matte everything except a sun highlight on metal | No reflections; floors dead | `gloss` in the toon shader (lamp streaks + narrow sun glare), `StreetOpts.gloss` | High |
| Atmosphere | Soft light shafts in dusty air (R4 forest, R5 underpass, R6 window) | Banned ("read as stage spotlights") | No air in backlit wides | `lightShafts()`: faint, wide, painted, axial billboards (strength .1-.25) | Medium |
| Character animation | A head turn **slides the whole face** across the head (R5, R6, R1) | `look` moved only the pupils, 2 units; face fixed | Turns don't read; heads look pasted | Face cluster slides 22-26 % of the head radius with `look`; eyes close up as they turn | Critical |
| Character animation | Idle heads alive: eye darts, slow tilts, blinks (R5 bench, R6 porch) | Breathing + hand fidgets; eyes static | Listeners freeze | `alive()`: seeded glances eased over 3 f + slow ±4° tilt | High |
| Expressions | Swaps go through a closed-eye frame; ladders of 3-5 faces (R1, R2, R5) | Instant swaps | Pops | `exprAt()`: 2-frame blink on every change | Medium |
| Secondary motion | Thrown things arc, land after the body, bounce lower, settle (R2 box, R3 mug, R6 hat) | Props appear/vanish or slide | Physics reads as cut-out | `toss()` (arc, eased spin, bounces), tested | High |
| Camera | Whip pans with directional blur (R6), rack focus (R5), object-led macro (R1, R3) | Whips exist (`whips`); DOF fixed per shot | No focus pulls | Shots may pass a per-frame `Dof` (focus racks); used in the test | Medium |
| Camera | Real holds 15-38 f between moves (R1, R2, R5) | Longest still run 10 f: constant creep | Restless | Use `creep` with k ≤ .05 on dialogue holds (no kit change; already allowed up to 60 f) | Medium |
| Composition | Foreground layer in most mediums (shoulder, globe, barrel, grass) (all) | ~1/3 of shots | — | Kept; the test uses fg in 5 of 8 shots | Medium |
| Materials | Specular metal/glass hero props (R6) | Matte primitives | Props look cheap in macros | Hero props: chrome/gold `spec` .8-.9, detail rings and screws at macro scale (the test's machine) | Medium |
| Environment | Dense, specific sets; background activity (all) | Good density; birds, smoke, dust exist | small | Kept | Low |

**Not adopted:** R6's near-realistic PBR saloon (our identity is the painted, inked world); R5's fully blue-tinted heads
(the user's cast redesign keeps cream heads; the scene tint still reaches them through `char.tint`/practicals);
photoreal particles (R3 shows painted smoke works better in this style); R6's world-swap montage (story-specific, no kit
change needed).

## 4. Direction (implementable)

**Characters.** Keep the 2026-11-15 cast exactly (thin even ink, cream imperfect-circle heads, small wide-set features,
pill torso, stick limbs, dot hands). Acting rules: every turn of the head uses `pose.look` (the face slides);
listeners run through `alive(pose, F, seed, gazes)` with gazes at what they'd look at; expression timelines use
`exprAt` (2-frame blink per swap) and come in ladders of 2-4 faces on big beats; reactions keep `reactSquash`.

**Light.** One readable key per scene that leaves 30-60 % of the frame in shadow *with shapes* (cast shadows), never a
uniform shade. Exterior golden hour = `sunset` (raking, el ~26). Night = practicals + `gloss` on wet ground. Faces take the
scene tint; heads stay readable.

**Colour.** Target sat .44-.52, colourfulness ≥ .26, luma .40-.52, p5 .05-.18. Haze only beyond ~24 m, max .4. No grade
exposure above ~1.4 on sunlit frames.

**Atmosphere.** Shafts only where a strong light enters a dusty or smoky volume (backlit wides, a window into a dark
room), strength ≤ .25; motes (`Dust`) in the same light.

**Materials.** World stays painted and matte; *hero props* get `spec` .6-.9 and macro detail (bezels, screws, labels);
floors after rain or wax get `gloss` .3-.6.

**Camera.** Shot sizes vary every cut (wide → MS → macro → MCU → whip → FS → payoff → CU); a foreground layer in half
the shots; one focus pull per scene; whips for eyeline jumps; impact kicks on hits; real holds on reactions.

**Animation.** Things that are thrown use `toss`; bodies anticipate (wind-up 15-20 f), hit, overshoot, settle; objects
hit by force rock and decay (damped sine).

## 5. Implementation (R20)

| File | Change |
|---|---|
| `kit/toon/face.ts` | Face slides with the head turn (`look`), eyes close up as they turn |
| `kit/toon/poses.ts` | `alive()` idle glances + tilt |
| `kit/toon/cast.ts` | `exprAt()` expression timeline with swap blinks |
| `kit/toon/physics.ts` + `physics.test.mjs` | `toss()` arc/spin/bounce/settle; self-check |
| `kit/toon/shade.ts` | `gloss` (practical streaks + narrow sun glare); diorama haze from 24 m, max .4 |
| `kit/toon/build/ground.ts`, `build/street.tsx` | `groundMaterial(…, gloss)`, `StreetOpts.gloss` |
| `kit/toon/glow.ts` | `lightShafts()` |
| `kit/toon/lights.ts` | `LIGHTS.sunset` |
| `kit/toon/grade.ts` | `GRADE.sunset` |
| `src/videos/_visual-test/Video.tsx`, `src/Root.tsx` | the 20 s test (`VisualTest`): gumball machine prop (coin, crank, lid, 84 burst balls), 8 shots |

Kit-wide side effects (pilot not re-rendered): haze is lighter in every video; face slide affects every turned head.

The test render and its assessment: `docs/style/VISUAL_TEST_R20.md`.
