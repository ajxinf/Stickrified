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


---

# R21: visual-ref7, character motion (2026-11-16)

Study of `assets/visual-ref7.mp4` (65 s, 1080x1920, 30 fps; a strange-true-history short about an inventor, his
eight-dragon earthquake jar and a laughing court). Private study material: craft only, never its story, characters
or shots. The user's brief: "Character animation is one of my biggest priorities. Our characters should not feel
stiff, robotic, weightless, or like they're simply switching between static poses."

**Method.** Contact sheets every 0.5 s (all 130 timeline points), then 15 Hz strips (every 2nd frame, 1.6 s each)
at 14 character moments: the ball placed in the dragon (0.0 s), the alarm and point (3.9 s), the court laughing
(5.4 s), the banquet laugh (22.4 s), the emperor's verdict (24.0 s), the gate (27.0 s), dragging the jar uphill
(29.6 s), waking at night (33.0 s), all eight balls (34.6 s), the run to the gates (37.2 s), the guards' taunt (40.5 s),
the walk back (43.7 s), the morning (45.8 s). Then the same strips of our ep 2 (`out/trapped-in-this-world/final.mp4`:
the street two-shot 9.6 s, Gary's line 13.0 s, the jar pitch 31.8 s, the bait 43.4 s, the snatch 46.4 s). Evidence
strips: `docs/style/r21/` (ref7_*.jpg, ep2_laugh.jpg, motion_test_*.jpg).

## 1. What visual-ref7 does well (with the moments)

**Whole bodies act; the face is only the top of it.**
- *Laugh* (5.4-7.0 s): the emperor's face goes frown -> 2-frame squint -> big grin while his whole body rocks
  side to side about +-12-15 deg; his head rocks with it a beat later; the guards turn their heads to each other
  first, then laugh and one leans INTO the emperor (bodies touch). At the banquet (22.4-24.0 s) heads bob out of
  phase, and on "even harder" one guest tips back off the bench in a ~70 deg arc, legs up, still laughing on the floor.
- *Alarm and point* (3.9-5.1 s): mouth open on "falls" while the ball drops (drawn 2-3 times along its path at
  4.03-4.10 s: a smear); a closed-eye frame (4.30 s) before ring eyes; a sweat drop arrives (4.57 s); then the
  ANTICIPATION: arms drop and the eyes shut for 2 frames (4.70 s), and the arm whips up on an arc into a point over
  his head in ~4 frames (4.77-4.90 s) with radial speed lines and the camera rolling with him; the body leans into
  the point and the head tilts after it.
- *Verdict* (24.0-25.6 s): the emperor's laughing-crying face resets to deadpan through a closed-eye frame, then the
  whole body slowly leans ~10 deg over ~20 frames while he talks; brows and mouth change on each syllable.
- *Effort* (29.6-31.2 s): dragging the cart uphill, the inventor leans ~25-30 deg into the rope, small slow steps;
  the cart lurches on the slope. Effort is shown by the body angle, not by the face.
- *Talk* (40.5-42.0 s): the guard's arm sways out on "Hey", his head tilts per phrase, blinks mid-sentence; the second
  guard leans on the parapet with a hand on it (contact with the set), squints and smirks.
- *Walk* (43.7-45.3 s): a dejected walk toward the truck-back camera: the body rolls +-5 deg from foot to foot every
  ~8 frames, the head counters a beat later, the lantern swings behind the hand. Cast shadows of posts cross the road
  and pass over him.
- *Sleep and wake* (33.0-34.6 s): the sleeping head bobs slowly with the breath while "Z"s rise in sequence; the
  ball falls with gravity spacing (slow at the top, fast at the bottom) into the frog; one eye peeks open.

**Presentation.** Every second a new picture: CU, insert, wide, and back; push-ins with a slow creep on every
held shot; foreground wipes (the jar passes the lens at 5.23-5.37 s to move from the inventor to the throne);
dissolves for time (22.47 s, 29.67 s); a time-of-day colour script (warm hall, pink sunset hill, blue moonlight,
golden morning); cross-section of the earth at the end (62-64.5 s). All of this is already in our kit and skill
(R13, R20); the gap is the bodies.

## 2. Gap analysis: our characters against the reference

Strips of ep 2 against ref7, same 15 Hz sampling:

| What | visual-ref7 | Ours before R21 (ep 2) | Gap |
|---|---|---|---|
| Laugh | whole body rocks +-12-15 deg, head lags, bounce; neighbours lean on each other | "you" laughs on "Nobody leaves before the end, kid" (13.0-14.6 s): the face swaps grin/squint, the body is a statue (sway < 1 deg) | **Critical**: emotion lives only in the face |
| Talking | head tilts per phrase, an arm beat on the stressed word | Gary's line: mouth moves, head and body still | High |
| Pose changes | anticipation (arms drop, eyes shut, 2 f), arc, overshoot, the head arrives last | `blendPose`: 4-frame smoothstep, every part arrives together, hands slide on straight lines | High |
| Walk | +-5 deg weight roll, the head counters a beat late, a heel-strike settle, props swing | +-2.5 deg sway about the hips, head fixed to the body, no contact settle | Medium |
| Effort | 25-30 deg lean into a load | no forward lean; prop-carrying walks are normal walks | Medium (rule; profile `sway` already leans) |
| Fear/shock | jump, sweat, shrink, tremble | `reactSquash` only (4 frames, ~8 %) | High |
| Contact | hands on walls, people leaning on people | characters stand apart | Medium (staging rule) |
| Emphasis | speed lines on the biggest physical beat; smears on fast props | none | Low-medium |
| Listener life | eye darts, blinks, slow tilts | `alive()` (R20) already does this | none |

The ep 2 pipeline never used the R15 acting layer (`act()`) at all (only the pilot did), so whatever the kit offers
must be the default path, not an opt-in.

## 3. Implemented (kit, all future videos)

| File | Change |
|---|---|
| `kit/toon/acting.ts` | **`perform(state, F, seed, exprAt(...))`**: every expression brings its body (EMOTES: laughing rocks +-11 deg with the head 1 rad behind and a bounce at twice the rate; crying shakes the shoulders at 4.5 Hz; shocked jumps 32 px, stretches and hunches; scared/nervous shrink and tremble; sad/tired droop; proud/smug lift the chest; scheming/sneaky hunch and rock; angry leans in and shakes; 21 of 24 faces covered). Emotions crossfade over 8 frames from the previous one; a speaking character (`fx.talk`) nods on its open syllables. Never touches the arms, so held props stay in the hands. Phase-shifted per character (no lockstep). |
| `kit/toon/cast.ts` | `exprAt` also returns `since` and `prev` (feeds `perform`). |
| `kit/toon/poses.ts` | `moveCurve` (3-frame anticipation the other way, move over 5 frames to an 8 % overshoot, settle over 5), `movePose` (separate progress for body, arms +1 f and head +2 f: overlapping action; hands travel on arcs; extrapolation clamped where it must be), `blendPose` now arcs the hands, `poseAt` uses all of it (default ease 5). `walkPose`: sway 2.5 -> 4.5 deg, the head counters a beat late, a bob dip and a 2 % settle on every heel strike, bigger arm swing. |
| `kit/toon/SpeedLines.tsx` | Radial speed-line overlay redrawn on twos, fading out; for the 1-3 biggest physical beats. |
| `kit/toon/poses.test.mjs`, `acting.test.mjs` | Self-checks: anticipation, overshoot, no frame-to-frame snap, hands on arcs, walk weight; perform rocks a laugh, ramps between emotions without snapping, never moves hands, nods while talking. |
| `src/MotionTest.tsx` (`MotionTest`) | 11 s locked two-shot: walk-in, point, Gary talks, both laugh, Gary goes deadpan, shock, sad. Rendered with the old kit and the new one: `out/_motion-test/before_after.mp4` (left before, right after). |
| `.claude/skills/toon-world-short/SKILL.md` | "Bodies act, not just faces (R21)": `perform` in every `st()`, `movePose` for hand-made timelines, effort leans, contact, speed lines. |

**Measured on the motion test (strips `docs/style/r21/motion_test_*.jpg`).** Before: both characters stand upright
through the laugh with only the faces changing (frame-to-frame body motion ~0). After: both rock out of phase, heads
lagging, Gary's cap swinging with his head; the shock jumps and hunches under speed lines; the point arcs up toward
Gary instead of sliding. The first after-render used a +-7 deg laugh and it read as a sway at medium-shot size, so
the laugh, shock and excited bounce were raised (laugh +-11 deg). QA layer 1 passes on both renders.

**Kept from our identity**: thin even ink, cream heads, pill torsos, stick limbs, dot hands, the painted world. No
new character drawing, no squash beyond ~3 %, no anime-style faces.

## 4. Not done, and why

- **Prop follow-through on hanging props** (the ref's lantern swing): the card renderer has no per-frame velocity for
  a held prop; it needs a `swing` channel on the pose. Small, worth doing when a video carries a lantern or bag.
- **Smear frames** on fast props (the ref's ball drawn 2-3 times): a `toss()` trail option; not built yet.
- **A real body pitch in front view** (leaning toward the lens): front-view cards only have `lean` (head toward the
  lens); a true pitch needs the 3/4 view. Effort leans therefore use profile views (`sway` = forward lean).
- **Falling over** (the banquet guest): needs a whole-card rotation about the feet (`Character` rotates only in yaw).
  A `topple` angle on CharState is the way; not built.
- Ep 2 (`trapped-in-this-world`) is not wired to `perform` and was not re-rendered; the kit-wide changes (walk,
  arcs, poseAt timing) reach it, and the zombie pilot, only if they are rendered again. The pilot is not to be
  regenerated.


---

# R21b: why our frames looked cheap next to the refs (2026-11-16)

User: "the new visuals look kind of cheap compared to the references (all visual ref)". Method: full-resolution
frames of all seven refs beside ours (same shot types), then `scripts/richness.py` on every ref and on ep 2.

| | refs 1-7 | ep 2 cut 4 (before) | ep 2 cut 3 + R21b (stills) |
|---|---|---|---|
| crisp (Laplacian) | 8.5-21.6 | **5.9** | 13.6 |
| edges (detail / ink density) | .050-.093 | **.048** | .127 |
| hue entropy | 2.0-2.7 | 2.15 | 2.6 |
| warm share of colour | .15-.77 | **.89** | .78 |

At 1:1 our ink and faces are as crisp as the refs (`docs/style/r21` crops); the cheapness was everything around them:
1. **Mushy sets**: the lens blur presets (9 px medium, 11 px close-up) wiped every background to colour blobs, while
   every ref keeps its set readable behind the character (ref7 25.3 s: the fleur-de-lis wallpaper and tufted throne are
   sharp behind the emperor). Fix (kit): `DOF.medium` 4 px, `DOF.closeup` 5 px.
2. **Haze**: bloom .5 plus halation glowed the whole warm frame. Fix (kit): bloom .32.
3. **One colour**: the sunset key, pink sky, peach fog and red brick made 89 % of all colour warm; the refs set warm
   light against blue/green/yellow local colour (ref6's sunset street hangs blue/yellow/red bunting). Fix: cooler
   sunset shade and fog (kit `LIGHTS.sunset`), many-coloured set dressing (ep 2: bunting between the lamps).
4. **Big plain faces**: our "faces big" habit filled frames with a white head; the refs mostly shoot mediums with the
   set around the character, close-ups only on punches. Rule: head at most ~35 % of the frame width except the 1-3
   biggest reactions.
5. **Sparse small detail**: the refs carry trims, patterns, signs and clutter everywhere; ours had large plain
   surfaces. Rule: every set gets small many-coloured detail at several distances (flags, signs, posters, plants).
Not fixed yet: bespoke ornate props (the refs' thrones, jars, machines are modelled pieces; our sets are kit boxes).

# R24: visual-ref8 + visual-ref9, the primary references (2026-11-21)

User: ref8/9 are now the primary references and win over refs 1-7 where they conflict. `assets/visual-ref8.mp4`
(63.6 s, day/dusk, WWII bomber hangar) and `visual-ref9.mp4` (59.1 s, night camp, tent interior). Private study
material: craft only. Frames and sheets: `docs/style/r24/` (`ref8_sheet.jpg`, `ref9_sheet.jpg` every 2 s;
`cu_compare.jpg`, `group_compare.jpg`; motion strips `ref8_motion_16.jpg`, `ref9_motion_27.jpg` at 6 fps;
`ours_vs_ref9.jpg`).

## What they do
| Area | ref8 / ref9 | Ours before R24 | Kit change |
|---|---|---|---|
| Heads | big cream discs, a little wider than tall (H/W ~.85-.95), bold dark-brown outline ~2-2.5 % of head width, soft grey crescent + scene light on the shadow side | H/W .92-1.02 | `headBlob` H/W .88-.98 |
| Faces | small dot/dash eyes or whites+pupils for shock, heavy tapered brows that carry the emotion, toothy grins, moustaches/goatees; sweat drops | matches (R22 face library) | none |
| Bodies | bean/pill torsos 0.6-0.9 head widths, thin black stick legs 1.2-1.8 HH, tiny dark hands; 3.1-3.8 HH overall | 3.4-3.7 HH, in range | none (measured, not changed) |
| Costume | dense pattern: lamellar armour as rows of dots, kimono stripes, belts with buckles, badges, pockets, rivets | wardrobe.ts patterns | rule in skill |
| Motion | full-body acting: deep squats with knees folding outward to pick things up (ref9 27.0-27.6 s), leaning carries (ref8 16-18 s), whole-body rock on a laugh, a prop shaken beside the head; holds of 1-2 s between big moves | legs shortened when the hip dropped (no knee) | leg IK in `drawPerson` (legs keep their length, knees fold); `crouch`, `pickup`, `strain` poses |
| World | softly lit 3D, **no outlines on the world**; finish comes from light (sun shafts, bloom, warm practical pools), AO, cool haze, glints and particles | 4 px world ink on every silhouette and crease | world ink 2.6 -> 1.6 px at 45 % opacity (`INK.opacity`) |
| Ground | dirt with grass tufts and dry-grass fields at every edge (ref9), painted floor markings and hazard stripes (ref8) | flat single-colour fills | `grassTufts` (kit build/ground.ts) |
| Sets | dense, story-specific clutter at several depths: chalkboards with text, gauges, carts, crates, lanterns, banners, patterned rugs, shelves of mugs | varies per video | rule in skill |
| Colour | calmer, more natural colour: colourfulness .18-.21, hue entropy 1.4-1.65, sat .37-.39; day luma .52, night .26 | colourfulness .28-.37 | grade saturation x .87 (`SAT_K`); richness ranges widened to include ref8/9 |
| Camera | still % 22-32, drift p50 2.3-4.7 px/f, p95 27-50: real holds, then motivated moves | same rules (R11/R13) | none |

## Not done (needs a render or the user's taste)
- Lit texture detail on hero props (rivets, worn paint) and sun shafts in big interiors are per-video set work
  (`lightShafts`, `paint.ts`); no kit default changed.
- No episode was re-rendered (user: improve the pipeline, not old videos). The kit changes apply to every future
  render, including re-renders of old episodes.

# R26: all seven primary refs (visual-ref6, 8, 9, 10, 11, 12, video-standard), 2026-11-21

Sheets every 3 s: `docs/style/r26/<ref>_sheet.jpg`; half-res details `detail_a.jpg` / `detail_b.jpg`; ours (R25 preview)
`ours_r25_sheet.jpg`; side-by-sides `sbs_r25_vs_ref9.jpg`, `look_r26_vs_refs.jpg` (R26 look test over ref8/ref9).

**Frame rate (measured, not assumed):** all seven are 30 fps files, and the motion inside is 30p too: on synthetic 24p
controls (ref8 resampled 24->30 by pulldown and by blending) the 5-frame cadence detector reads 18-24x and 9x its
median; every ref reads 1-3x, and none repeats frames in motion (0-1 per video). Nothing in them is 24 fps.

| Category | Refs (which) | Ours (R25) | Change |
|---|---|---|---|
| Ground | soft large tonal shapes, real relief, pebbles/leaves as geometry (ref9, ref10 gravel, ref12 grass) | photo sand with luma-derived bump: pixel-sized speckle, "TV static" at 1-3 m | **done**: real normal + ARM maps (Poly Haven) for every photo texture; the luma bump stays only as a fallback |
| Props | modelled, bevelled, textured: barrels with hoops, stools, crates, lanterns, a locomotive with gold trim (ref9, ref10, standard) | box-built from Kit primitives (blocks) | **done** (kit): `model()` loads CC0 glTF with their own maps through the world shader; 8 beach props downloaded |
| Set density | dozens of props and extras at 3+ depths, banners, signs, fires (ref9 24-36 s, ref6 saloon) | 2-5 objects per frame, empty ground (edges .042 vs refs .050-.100) | per shot plan: dress every frame at 3 depths |
| Light | one directional key (moon/sun) + warm practical pools that fall off into dark, cool far air (ref9); raking sun + bloom (ref8, ref10, ref12) | even fill, every surface the same brightness at night | partly: navy darks; pools exist but are weak; next: stronger lantern/fire pools, darker surround |
| Night colour | navy darks, warm only in pools, moon disc + lit cloud bank (ref9) | magenta shadow tint (lavender sand), sky floor near black (CRUSH f2073, f2305) | **done**: `moonlit` grade shadows navy; dark sky floor lifted to navy |
| Dusk sky | deep blue down to a thin peach band, pink cloud streaks (ref8 45 s) | (new) mauve wash: blue + peach blended over 30 deg, golden grade x2.08 | **done** (partly): `horizonBand` preset value (thin band), `sunset` grade, thin clouds; still more violet than ref8 |
| Framing | heads 15-30 % of width; deep sets; characters at different depths (ref9, ref11, standard) | heads ~50 % in many shots; empty sand/sky frames ("Twenty.", "stick.", "No wave.") | rule kept (<= 35 %); look test frames at ~30 %; shot plan rebuild applies it |
| Characters | same 2D card family as ours: cream heads, thin dark outline, pill torsos, stick limbs; costume pattern; a back view exists (ref8 46 s) | matches (R22-R24 kit); back view exists | none needed; chair is still a flat card (should be a model) |
| Overlays | infographic chips in world space (ref10 "1 TON", "$0", hill progress map) | stamp cards | stamps removed (user); world-space chips are a candidate for the explainer beats |
| Camera | holds then motivated moves, DOF on CUs, motion blur on fast moves (all) | same rules | none |
| Render | 1080x1920, crisp 10-26, sharp edges, bloom on practicals | 1080 stills crisp 8-14 | none (720p preview exaggerated the softness: 5.4) |

## R26 kit changes (all episodes inherit them)
- `kit/toon/shade.ts`: normal maps (three's derivative tangent frame, no tangents needed) and Poly Haven ARM maps (AO darkens
  the ambient, G = roughness) in the real-look shader; `toonMaterial({ normalMap, normalScale, arm })`.
- `kit/toon/build/photo.ts`: `photo(name)` also loads `<name>_nor` / `<name>_arm` listed in `public/tex/maps.json`.
- `kit/toon/build/models.ts`: `model(id, { part, height, scale, tint, glow, collider })`: CC0 glTF props, QA collider hull
  from `public/models/index.json` (boxes through the full node hierarchy), frame waits on load.
- `scripts/polyhaven.py tex|model <id>`: downloads (no repeats), originals in `assets/`, served copies in `public/`.
- `kit/toon/world.tsx` + `lights.ts`: `horizonBand` (sky horizon blend height, default .5 = unchanged).
- `kit/toon/grade.ts`: `moonlit` shadows navy.
- `kit/toon/guard.tsx`: `Plan.xfades` (dissolves drawn by extending the outgoing shot reach plan.json; R25 f1370 POP).

# R27: outside comparison of Episode 4 vs the three newest refs, 2026-11-21

Source: `docs/style/r27/REPORT.md` (the user's ChatGPT comparison of moon-disappeared-tonight vs Ref1-3). Scope set by the
report: **shared systems and future episodes only; no existing episode re-rendered or modified.** Validated on the new
test composition `LookTestR27` (`src/videos/_look-test-r27`) and on the moon preflight stills already on disk.
`r27/water_before_after.jpg`: test still without / with the water sky reflection, and the new costume detail.

| Finding (report §) | Priority | System | Status |
|---|---|---|---|
| Held shots with no visible action (§5) | P0 | guard "Static hold" (2 s without a face, gesture, move, prop or reframe); preflight framing flags (frozen shot, same framing across a cut); skill: `// does:` per shot | **done**. Moon stills: flags A2 (hill crowd, 2.4 s frozen), O1, P2 and the deliberate L1-L3 match cuts |
| Foreground prop over the protagonist (§6, §4) | P0 | guard "Subject covered" (5 face rays vs colliders and posed story props, held ones included) | **done** |
| Too much empty sky, small figures (§6) | P0 | guard "Empty sky" (non-wide: plain sky stays above the third grid row) | **done** |
| Even lighting, lamps that light nothing (§2) | P0 | skill: one lighting line per scene in build.ts, every practical in frame throws a pool | rule **done**; kit falloff unchanged (the test fire pool reads; no evidence for a global change) |
| Thin environments, flat surfaces (§1, §3) | P0/P1 | skill: material list per scene, `mottle` on large surfaces, mid-scale construction first; R26 photo maps + models | rule **done**; per episode |
| Water as flat bands (§1) | P1 | kit `build/water.ts` (frame-driven ripple normals) + `toonMaterial({ reflect })` Fresnel sky reflection | **done** |
| Generic costumes (§4) | P1 | kit `wardrobe.ts` `pocket`, `seams`; skill: one construction detail per speaking role | **done** |
| Story props without close beats or effects (§8) | P1 | skill rule | **done** (rule) |
| Captions over the named object (§9) | P2 | existing "Caption vs face", "Text in frame"; preflight checklist | unchanged (already covered) |
| Wide crowds frozen (§5) | P2 | "Static hold" covers it; skill rule | **done** |

Not done: a global practical-falloff change (needs a night episode to judge, not a test scene), a second fine ripple
octave for water seen from under 2 m, a guard check for depth layers (richness.py edges already gates density).
