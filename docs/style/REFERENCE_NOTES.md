# Reference study — measured numbers (2026-11-11)

Four 9:16 reference shorts (30–65 s, 30 fps, 5,711 frames total) were measured frame by frame with OpenCV
(optical-flow camera motion, colour, sharpness, vignette, caption timing) and reviewed visually on contact sheets
(every 10th frame) and every-frame strips around transitions and gags.

The videos are **private study material**: they live only in `assets/references/` on the laptop (git-ignored). Never
upload, publish or send them, never copy their stories, characters, jokes or shots, and never name their channels.
We take the craft (numbers below), not the content.

| | R1 (65 s) | R2 (65 s) | R3 (30 s) | R4 (31 s) |
|---|---|---|---|---|
| World look | near-realistic lit 3D | saturated painted 3D, light ink | hand-inked painted 3D | hand-inked painted 3D |
| Characters | 2D cards, skin heads, some volume shading | white round heads, stick limbs | white/pale round heads, stick limbs | same as R3 |
| Luma median / p5 | .40 / .08 | .51 / .17 | .43 / .12 | .39 / .11 |
| Chroma C* p90 | 37 | 57 | 68 | 61 |
| Corner/centre luma (vignette) | .93 | .84 | .54 | .89 |
| Still frames / longest still | 3 % / 11 f | 5 % / 14 f | 8 % / 14 f | 4 % / 7 f |
| Caption changes per s / median hold | 2.2 / 13 f | 3.0 / 10 f | 2.9 / 10 f | 2.8 / 10 f |
| Loudness / true peak | −14.2 LUFS / −0.8 | −14.2 / −1.6 | −17.3 / −4.7 | −17.0 / −4.5 |

R3 and R4 are parts 1 and 2 of one story: part 1 ends mid-sentence on a cliffhanger, part 2 opens by repeating
part 1's last line over its last shot.

## Camera (all four, valid frames only)
- Translation at 1080 wide: median 2.9 px/f, p75 11, p90 26, p99 59 (fast follow moves).
- Scale change: |zoom| median 0.5 %/f, p90 2.6 %/f. Push-in on 65 % of frames, pull-out on 26 %.
- Roll: p95 0.25–1.2 °/f (arcs and orbits around characters, slow banking).
- The camera is almost never still: holds always drift, push or arc.
- Fast moves are continuous follows (tilt down with a falling character, tilt up to reveal sky), not cuts.

## Transitions
- Main transition: a **crossfade of ~10 frames** (measured 394→404 in R3) between two moving shots; the caption
  switches to the next word mid-dissolve.
- Hard cuts for punch close-ups, reaction inserts and object close-ups.
- Big jumps (place or era): fly-through or fast pull-out with strong motion blur streaks, or a white-wash dissolve.
- About one new shot every 3–5 s, with continuous camera motion inside each shot.

## Characters
- Flat 2D cards with thick near-black outlines, stick limbs, ink-dot or mitten hands; big round heads (h/w ≈ 1.0).
- Faces: dot eyes, heavy angled brows, small mouths; shock = ring eyes; extras = sweat drop, steam puffs,
  colour fill over the face (rises bottom to top over ~8 f on the word).
- Expression swaps are instant (on the word); bodies hold still poses with small bob/lean.
- Cards take the scene light: window light shafts cross faces, night scenes tint faces blue, lamps warm them.

## World and light
- Strong colour script per scene: dusk pink→violet skies, deep blue nights with warm practical lights, hot orange
  desert under cobalt sky, warm wooden interiors.
- Practical lights glow (bloom), volumetric light shafts through windows, falling snow or dust particles.
- Hand-inked worlds: dark brown-black outlines on every edge, painted fills with visible strokes and grain.
- Depth of field: close-ups and mediums soften the background clearly; wides stay sharp.

## Captions
- White bold rounded sans, dark outline plus a soft drop shadow, 1–2 words at a time, centred at y ≈ 0.70 of the
  frame height, cap height ≈ 0.035 of the width (font size ≈ 60 px at 1080 wide), punctuation kept, no pop animation.

## Storytelling craft seen
- Cold open on the most absurd image of the story, on the first word.
- Every key phrase is shown literally (a metaphor becomes a picture: "like climbing a mountain" → a staircase up a
  mountain).
- Ends on the last word with no outro; endings loop or hand off to a part 2.

---

# Story study: R5, R6, R7 (2026-11-12)

Three more 9:16 shorts (67 / 63 / 62 s, 30 fps), same private rules as above. Each was studied on contact sheets
(every 15th frame) and with its full script, read word by word off the burned-in captions (caption band every 6th
frame). Transcripts: `assets/references/transcripts/` (git-ignored, never commit). All three are "how one clever
person beat a problem" stories: a siege weapon, a roller-coaster loop, an insurance scam caught on camera.

**Why we studied them:** our first three scripts read as lists of separate jokes. These three tell one story.

## Measured script numbers
| | R5 | R6 | R7 | our drafts (before) |
|---|---|---|---|---|
| Words / pace | 235 / 3.5 w/s | 239 / 3.8 w/s | 236 / 3.8 w/s | 246-255 / 3.1 w/s |
| Sentences, mean / max words | 17, 13.8 / 31 | 19, 12.6 / 25 | 20, 11.8 / 24 | longer, many 20+ |
| Words of 8+ letters | 6.8 % | 1.7 % | 4.7 % | "investigators", "personality", "experienced" |
| "But" + "So" + "Then" | 5 | 9 | 7 | mostly "Day N," list openers |
| Hook length | 7 words | 7 words | 6 words | 10-20 words |
| Names, dates, places spoken | none | none | none | year, city, regiment |

## The story engine (all three)
1. **Sentence 1 is a strange action, not a premise**, 6-9 words, no context: someone drills holes / bends a loop /
   slams the brakes. The viewer's "why?" is the hook. (The title asks the question; the narration starts doing.)
2. **Sentence 2 answers "why" with stakes** ("because an army is marching straight for his fort") but keeps the
   *how* secret.
3. **A causal chain, never a list.** Each sentence happens because of the last one, joined by But / So / Then /
   That night / The next morning / Eventually / Until. Time words mark only big jumps (2-3 per video).
4. **An opponent and a doubter.** An army, a rival, an insurance company pushes back; a side character says the
   viewer's doubt out loud in one short, funny line of dialogue. The hero answers with silence or one word.
5. **Weird preparation, mystery protected.** The hero does 3-4 odd things in a row that make no sense yet, each
   stranger than the last ("But it gets weirder"), and protects them oddly (slaps a hand away, lies on the cart in
   the rain). The trick is never named, not even at the end.
6. **A setback at night**: rain, a rival's sabotage, a phone call. The colour script goes dark with it.
7. **Stretch the tension** right before the payoff: repetition ("closer and closer and closer"), one sensory detail
   (close enough to see teeth), "But it's too late."
8. **Payoff in plain physical steps**, one picture per step; when the reason is not obvious, one "You see," and an
   everyday analogy in its own mini-scene (a car taking a hairpin at 5 vs 60 mph).
9. **Everything pays off**: the opening number comes back, the rival's own trick ruins him, the quiet victim's
   little box was a camera.
10. **Last line 4-8 words, ending on the punch word**, over the winner's smug face. No moral, no outro.

## Where the peak lands (measured by word position)
| | R5 | R6 | R7 | our 2nd drafts |
|---|---|---|---|---|
| Climax starts | 73 % (lights the rope) | 58 % (ride starts), resolved at ~95 % | 86 % (points to the box) | 43-55 % |
| After the climax | the chain reaction itself, then 1 line | the explanation told mid-ride, then the rival's crash | 2 lines | aftermath, lecture, epilogue |

The references explain *during* the danger (R6 explains loop physics while the cart is climbing), and each has a
late reversal (sabotage that saves him, the victim's camera). Rules: "The back half" in the stickrified-script skill.

## All references, R1-R12 (2026-11-12, second pass)
`ref13.mp4` is a byte-identical copy of `ref12.mp4`. Same visual family as ours (round heads, stick limbs,
painted 3D): R1, R2/R3, R5, R6, R7, R11 (R4 close). Other styles, taken for script only: R8-R10 (blocky avatars),
R12 (flat 2D, 5.7 min).

| Ref | Hook (line 1) | Who mocks / opposes | Twist | Last line loops by |
|---|---|---|---|---|
| R1 | sawed gaps into a railroad every 39 ft | his boss ("you're wrecking my railroad"), newspapers | heat closes his gaps; the rival's perfect rails buckle | the train rolls onto the rival's snaking track |
| R2/R3 | they buried a man alive with a bell on his finger | the neighbours who won't check | the wife practised the signal: she let the bell ring | "the house was all hers" (the bell, the house) |
| R4 | built to punish prisoners, millions pay to use it | prisoners, magistrate | a punishment becomes a product | "that's how the treadmill was invented" |
| R5 | drilled 82 holes into wood | his commander ("grating cheese?") | 82 rockets | the packed army: not one misses |
| R6 | bent the loop out of shape | the rival who copies, then sabotages | the sabotage saves him | rival's perfect circle crushes his cart |
| R7 | slammed the brakes on the highway | insurers, victims | the quiet guy's box is a camera | "that's how the dashcam was invented" |
| R8 | everyone lives on a train that never stops | the train's rulers | the outside is alive | "we're finally free" |
| R9 | vampires can't come in unless invited | grandpa's rules | grandpa's handshake is wrong: impostor | "Grandpa's handshake: still wrong." |
| R10 | your first word becomes your superpower | the school calls Jonas the greediest | "Mine" took his sister's sickness | "MINE was never the greediest word" |
| R11 | bet his life savings on the slowest horse | the whole betting room laughs | a mirror flash beats the telegraph | "nobody's laughing anymore" |
| R12 | don't run to town when the zombies come | strangers, his own instinct | the farm was only the start | "someone else's first day was just beginning" |

Patterns our drafts lacked: (1) a **contradiction hook** the last line answers; (2) a **loop** back to line 1; (3)
a **mocker** who is **out-done by his own strength** (status flip); (4) the rival owns the **"perfect" version**;
(5) a **hidden plan / reframing twist** ("Wait. Practised?"); (6) **measured progress** toward the payoff.

Visuals worth taking from the same-style refs:
- **Cross-section cut-aways** (R2: the coffin under a layered soil slice with the bell rope running up).
- **Colour encodes the physics** (R1: rails glow pink -> yellow as they heat; gaps shrink in macro shots).
- **Device POV with a circular mask** (R11: the race seen through the mirror/telescope ring).
- **Mocker reaction shots**: the crowd or rival in a medium two-shot, laughing, then the same framing silent at the
  end (R11 betting room, R1 boss with a purple face).
- **Boards and documents carry the plot**: winner boards, a death certificate, a newspaper headline.
- **Final shot = rival and hero in the foreground, payoff exploding behind them** (R1, R6).

## Language
- Plain spoken English: almost every word one or two syllables; contractions everywhere (he's, can't, it's).
- Physical verbs carry the story: drill, bolt, slap, rip, race, bend, crank, beat, slam, smash, limp, clutch.
- Present tense after the hook. Sentences 10-14 words on average, mixed with 2-3 word punches ("He's in.",
  "Not really.", "But it's too late.").
- Comparisons from the kitchen and the street, never from books: like a soda can, like a twig, a human umbrella.
- One number, repeated as a motif (the same count opens, builds and closes the story). Other numbers only when
  they are the joke.
- Lists of three for routine or escalation, often as fragments: "A guy on his phone. A kid who just got his
  license. Anyone driving a little too close."
- Jokes come only from the story (characters reacting to the hero's odd behaviour); no unrelated asides.
- Delivery: one steady, fast, conversational read; little acting, no deadpan doubles.

## Visuals (R5-R7)
- **Worlds**: lush and dense (grass blades, crowds of 100+ extras, full props), bright cobalt-sky days, then a
  blue moonlit night or rain for the setback, then a clean bright morning for the payoff. Time of day follows the
  story beat, not the clock.
- **Characters**: the same white round heads and stick limbs, but every role has a costume that reads in
  silhouette: helmet with plume, cap, headband, slick hair, ranger hat, sunglasses pushed up on the head, beards,
  overalls, armour with rivets. Hero and rival have opposite silhouettes and colours. Faces do the acting: smug
  half-lids, gritted-teeth grins, ring-eyed shock, sweat drops.
- **The mechanism is the star**: macro close-ups walk through the trick step by step; a glowing light streak runs
  along the path that matters (along a track, down a fuse); exploded or cut-away views when the inside matters.
- **Words live in the world**: banners and signs carry text ("opening tomorrow", a "first!" placard, a desk counter
  that resets to 0, a dashcam overlay with REC, date and speed) instead of floating title cards.
- **Literal exaggeration**: money piles up like a snowdrift and buries the yard; explosions fill the sky.
- **Point-of-view shots from objects and seats**: from the driver's seat, from the coaster cart, through the dashcam.
- **Endings**: the winner in close-up in the foreground, smug or arms crossed, the payoff (explosion, crash)
  behind him, on the last word.
- **Pace**: a new shot about every 2-3 s, continuous camera motion, dissolves between places; captions as in R1-R4
  (1-2 words, white, dark outline, y ≈ 0.70).

**What we take**: the story engine, the plain language, costumes per role, in-world signs, mechanism close-ups,
time-of-day by story beat, smug ending shot. **What we don't**: their stories, jokes, characters or shots; their
third-person "he" (we keep "you"); R7's made-up invention ending (our history stays true).

---

# Look study: R13, R14 (+ R11 re-measured) (2026-11-13)

`ref13.mp4` was replaced (no longer a copy of R12): a barbershop story, same visual family (round heads, painted
3D, warm interiors). `ref14.mp4`: a beach survival story, painted 3D plus full-frame 2D explainer inserts.

| | R13 | R14 | R11 | our stress test v2 | our _pipeline-test-2 |
|---|---|---|---|---|---|
| Luma median | .29 | .46 | .40 | .45 | .61 |
| C* p90 | 27 | 49 | 47 | 57 | 52 |
| Vignette (corner/centre) | .86 | .83 | .77 | .98 | .95 |
| Dark L* (p2, non-ink) | 16 | 24 | 22 | 22 | 21 |
| Drift p50 / p95 px/f | 4.1 / 49 | 1.6 / 21 | 6.5 / 44 | 3.0 / 29 | 1.3 / 19 |
| Still % / longest still run | 13 % / 34 f | 33 % / 131 f | 18 % / 53 f | 8 % / 14 f | 6 % / 5 f |

What they do that we didn't:
1. **Motivated light with falloff** (R13): a visible bare bulb in every interior shot, a warm pool on the faces,
   dark corners and a near-black ceiling. The subject is the brightest thing in the frame.
2. **Real darks and vignette**: R13 sits below our old L* 19 floor; all three vignette harder than we did.
3. **Filmic finish**: muted saturation, warm halation around bulbs, fine grain, dust motes in the light.
4. **Focus**: mediums have soft backgrounds and blurred foreground objects (chair edge, a shoulder).
5. **Framing**: waist/chest crops, characters off-centre and overlapping at different depths, slight low angles,
   doorway/window frames; we framed full-length, centred, eye-level.
6. **Camera rhythm**: real holds on beats, then fast moves. We crept at one slow speed through everything.
7. **Dense sets**: wallpaper, trim, clocks, bottles, coat racks (R13); crowds, signs, foliage (R11, R14).
8. **2D explainer inserts** (R14): satellite storm map, x-ray, thermal camera, skin cross-section, macro leaf,
   a poster. They explain the science and let the edit sit still without feeling static.

Applied the same day: grade.ts (sat, exposure, vignette, top darkening, grain, halation, deeper toe at night/
indoors), lights.ts/shade.ts (darker fill, stronger, wider lamps), cardshade.ts (lamp falls off across the card),
Composer DOF (stronger background, foreground blur), camera.ts (tighter SHOT_SIZE, low default angle), street.tsx
(props every 3 m), guard (holds up to 60 f), Insert.tsx, measure.py targets. Scored on `_stress-test` v3.

## R13 quality-gap study vs the zombie pilot (2026-11-14)
`assets/video-standard.mp4` (private, git-ignored; same rules as above: craft only, never its story, jokes, characters
or shots). 61.1 s, 1080x1920, 30 fps, stereo, -14.1 LUFS / -1.7 dBTP, LRA 2.4 LU, ~230 words (~3.8 words/s).
Every 3rd frame was read on 21 contact sheets; the per-second notes are in the session record. Measurements were made
with one script on both videos (the pilot is the round-3 `final.mp4`).

| measured | R13 | zombie pilot |
|---|---|---|
| length / words per s | 61 s / ~3.8 | 81 s / 3.1 |
| mean frame-to-frame motion (luma diff) | .039 | .026 (R13 has 1.5x more motion) |
| median motion | .028 | .013 (2.2x) |
| near-still frames | 7.6 % | 12.3 % |
| saturation / colourfulness (hue spread) | .54 / .21 | .46 / .29 (R13: richer but fewer hues per scene) |
| luma p5-p95 | .10-.81 | .09-.85 |
| stereo side vs mid | -26 dB (real stereo) | mono |
| band energy sub <60 / 60-250 / 250-1k / 1-4k / 4-8k / 8k+ (dB re total) | -19.5 / -3.2 / -4.1 / -12.2 / -14.1 / -17.6 | -32.7 / -6.3 / -2.0 / -9.4 / -18.8 / -24.5 |
| short-term loudness p10-p90 | -20.4 to -14.5 dB | -25.8 to -14.4 dB (deep dips between lines) |
| strong transients per 10 s | 9.3 | 14.6 (ours: many short isolated hits) |

### What R13 does better, and what it would take here
**World and light** (biggest gap)
1. Physically lit world: realistic PBR materials (rock, wood grain, brass, steel, water) under ONE motivated key per
   scene (a ceiling lamp, a lantern, the sun) with AO, soft GI-like falloff and deep shadow around a pool of light. The
   pilot is evenly lit, so every frame is the same brightness edge to edge. Needs: CC0 PBR texture sets (Poly Haven,
   ambientCG), HDRI or baked light, SSAO, a key light per shot that leaves 40-60 % of the frame in shadow.
2. Volumetric atmosphere: light cones with dust motes (0.0 s), haze between camera and subject (3-6 s), god rays
   through settling dust (56 s). Pilot: dust particles only. Fake it in three.js with additive cone meshes + depth fog
   + the existing Dust.
3. A limited palette per scene: amber/brown plus ONE accent (red cart, green cash, gold). The pilot puts 5-6 saturated
   hues in every street frame (purple road, yellow, red, green, orange), which reads as a mobile game.
4. Detailed hero props as real 3D models in the cards' hands (shotgun, pickaxe, knife, dynamite, briefcase, car)
   next to flat 2D characters: the mix of simple characters and rich props reads as premium. Pilot props are mostly
   low-detail primitives.
5. Characters cast real, soft, directional shadows on the floor (36-39 s) and take the scene's colour. Pilot: contact
   blobs only, cards lit flat.
6. Set dressing that tells the story and the period: labelled crates ("CANDLES"), a gold price board, a 1909 calendar,
   an ironic mine sign, brands on props, "10 FT" scratched in the dirt. Text lives IN the world; there are no stamp
   cards or overlays at all.

**Animation and acting**
7. Lip sync: talking characters move their mouths per syllable (6-9 s, 34-43 s), and the script uses short character
   lines in their own voices. Pilot: narration only, mouths only swap expressions.
8. Full-body acting with overlapping action: a laugh with a knee lift and a bouncing hat (36 s), a hat crushed on a
   beam (21.6 s), an anticipation-swing-impact pickaxe (26 s), runs at the lens (54 s). Pilot: mostly pose and face
   swaps on still bodies.
9. Hands always busy in holds: sipping coffee, biting bread, twirling dynamite (48-51 s), so no hold is dead even
   without camera motion.
10. Secondary motion and physics: bills flutter and keep falling across a cut (45-46 s), a hat flies off, swinging
    lanterns, the dynamite bounces off a cart (52.8 s), water slops.
11. Visual state continuity: the suit goes soot-grey after the blast (57 s), the gold dust keeps trickling from the
    barrel (9.2 s).

**Camera and editing**
12. Object-led camera: the camera follows the thing the sentence is about (gold into the barrel -> rides the bullet
    -> into the wall, 0-3 s; rides the thrown dynamite, 52 s). The picture performs the sentence word by word.
13. Transitions made of the world, not of overlays: a camera fly-through a magnifying glass (32 s), a dust cloud
    that fills the frame and clears into the next scene (55.7 s), a lateral whip-truck (40.3 s), a round-object
    bloom (18.9 s), a body walking into the lens (54.6 s). Pilot: 10-frame dissolves and cuts.
14. Macro inserts for every process verb (load, swirl, flakes, flat, light the fuse), each with its own motion
    (orbit, push) and shallow depth of field.
15. Depth layering: an out-of-focus foreground layer (rocks, a gold pan, a lantern) in most wides.

**VFX**
16. In-world effects that light the scene: fuse sparks, a match flame, a fireball, glowing gold veins and sparkles.
    The pilot's effects (sound rings, rainbow trail, stamps) are mostly flat overlays that light nothing.

**Captions**
17. One or two words per caption, white with a black outline, smaller, no colour highlight, at ~0.70 H. The pilot
    shows 2-4 words with an orange key word. Fewer words = faster reading rhythm. (A taste call: test both.)

**Sound** (measured, not heard)
18. A continuous bed: room tone or ambience plus music fill every gap, so loudness barely moves (LRA 2.4, p10
    -20 dB). The pilot drops to near-silence between lines (p10 -26 dB): it sounds empty.
19. Real stereo: ambience and music are wide, effects sit where they are on screen. The pilot is mono.
20. A fuller spectrum: about 3 dB more low end (60-250 Hz), 13 dB more sub, 7 dB more "air" (8 kHz+), and less
    boxy 250 Hz-1 kHz. The pilot's mix is mid-heavy and thin: synthesized blips have little low end or air.
21. Fewer, richer effects: 9 strong hits per 10 s against our 15, each a layered, real-sounding foley event (metal,
    wood, dirt, cloth, a fuse hiss) blended into the bed instead of isolated synthetic pops.
22. Space: effects sit in the room's reverb (a mine tunnel sounds like a tunnel).

**Story and pacing**
23. Tighter: 61 s at ~3.8 words/s against our 81 s at 3.1. Every second carries a new picture.
24. Two turns, not one (the scam, then the buyer's real knowledge), each shown by a prop reveal (the dynamite in the
    jacket lining, the gold vein), and the last frame calls back to the first character (his hat on the pickaxe).
25. True detail used as texture (mine salting, the 1909 gold price), shown, never lectured.
