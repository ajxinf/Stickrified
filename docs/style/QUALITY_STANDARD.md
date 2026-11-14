# Stickrified production quality standard (v1, 2026-11-15)

Built from a frame-by-frame study of four reference shorts (`assets/video-standard.mp4`, `assets/visual-ref1..3.mp4`;
private study material, craft only, never their stories, characters, jokes or shots). Per-sheet notes:
`docs/style/r14/notes_visual_refs.md`; measurements: `docs/style/r14/metrics_all.json`; the R13 study in
`REFERENCE_NOTES.md`. Our direction stays **A+B "Illustrated Diorama"** (painted, ink-lined 3D world; flat inked
character cards lit by that world). This file is the bar; the `video-review` skill scores every video against it.

## Measured bar (all four references vs the zombie pilot, same script)
| metric | refs (range) | pilot r3 | target |
|---|---|---|---|
| near-still frames | 7.1-8.4 % | 12.9 % | <= 9 % |
| median frame motion (luma diff) | .017-.036 | .012 | >= .016 |
| mean luma | .39-.52 | .36 | .40-.50 |
| colourfulness (Hasler) | .21-.34 | .23 | >= .25, one dominant pair per scene |
| longest continuous camera move | 14-40 s | 5.4 s | some moves > 6 s (travel through the scene) |
| loudness / stereo side vs mid | -14 LUFS / -26..-32 dB | -14 / -27 | same |

## The 10 categories
For each: what the references do, why it works, how we do it in our kit, what failing looks like, and the check.

### 1. Art direction and identity
- **Refs:** one consistent world language: painted volumes with ink edges for EVERYTHING, including effects (smoke,
  explosions, fire, splinters are drawn in the house style, never photoreal particles). Each scene commits to one
  colour mood and the next scene flips it (warm office -> cool moonlit room -> bright factory), so cuts read as places.
- **Why:** the eye accepts a stylised world only if nothing breaks its rules; mood flips give rhythm and tell time.
- **Ours:** A+B look (lit cards, painted occlusion, haze behind the subject); one warm/cool pair per scene
  (`WORLD_LOOK` accent + pool); effects via ink-edged painted sprites (`DustWipe`, smoke puffs), never soft blobs.
- **Poor:** a grey SSAO halo, a photoreal flame, a 2D sticker effect with no ink, every scene the same mid-saturation.
- **Check:** a contact sheet of one frame per scene reads as one show; every effect has ink edges; each scene has a
  nameable mood (warm night, cold dawn).

### 2. Characters
- **Refs:** cream bean heads take the scene light (gold from a winning card, green from a stinking one, orange from
  tar); costume is identity (bucket hat, eyeshade, tricorn) and changes with the story (suit after the blast, pyjamas);
  expressions step through a ladder of 3-5 faces per beat, ~0.3 s each, never one swap.
- **Ours:** lit cards (B); every speaking role keeps one signature item in every costume; `exprLadder()` for
  reactions; a prop that glows tints the face (`fx.tint`).
- **Poor:** one expression swap per line; a costume that hides the signature; a face that ignores a bright prop.
- **Check:** in every reaction beat >= 3 face changes; cover the caption and name every character from a frame.

### 3. Animation
- **Refs:** physical comedy with anticipation -> action -> follow-through -> settle (thrown man, box lands after him;
  the hoist lifts the officer); hands always doing something (pinning, pouring, scratching a card with a badge);
  objects tumble in arcs and keep falling across cuts; lip sync on every spoken line.
- **Ours:** `fidget()` busy hands, lip sync (`talkAt`), arcs for thrown props (props.ts), squash on reactions.
- **Poor:** a pose snaps with no in-between; a held character with nothing moving for > 1.5 s; a thrown prop on a line.
- **Check:** QA "Reaction timing"; no dead hold > 45 f (shot ledger); every throw has an arc and a landing.

### 4. Environment
- **Refs:** dense, specific sets that tell the story in text and props (ticket walls, "OUR WINNERS" photos, a
  printing press counter, "CARCASS - KEEP FROM FLAME"); something moves in every background (fish, flags, smoke,
  counters ticking, glass reflections); damage persists (splinters stay on the deck).
- **Ours:** `build.ts` dressing + in-world signs; ambient motion per scene (`Dust`, flags, smoke, flicker); state
  carried across shots.
- **Poor:** an empty wall behind the subject; a still background for a whole shot; damage that vanishes after a cut.
- **Check:** every shot has >= 1 moving background element; every set has >= 1 story-specific sign or prop.

### 5. Camera
- **Refs:** the camera is always travelling (median motion .017-.036): long continuous moves that dive into objects
  (into a card, a cannon muzzle, a furnace), follow the object of the sentence (bullet, cannonball, thrown dynamite),
  crane from establishing to medium without a cut, and tilt from a prop up to a face. Over-the-shoulder reverses with
  the other head as a blurred foreground mass (~1/3 of frame).
- **Ours:** `creep()` pushes >= 8 % on holds; object-follow poses (cart POV, B30b ride); OTS framing helper;
  whip/dust transitions.
- **Poor:** locked-off shots; 12 %+ still frames; a flat-on wall; a wide where the joke needs a close-up.
- **Check:** still frames <= 9 %, median motion >= .016 (`compare.py`); >= 2 OTS or fg-mass shots per video.

### 6. Composition and storytelling
- **Refs:** cause in the foreground, effect in the background in one frame (pirates in fg, the navy ship burning
  behind); reveals staged in depth (backlit silhouette in a doorway behind the hero); abstract ideas made physical
  (a number jumps off the card into his eye; polaroids as a bar chart; a pencil line through the digits).
- **Ours:** stage two planes per key shot; build explanations from props in the world, never overlays.
- **Poor:** subject centred against a flat wall; information on a 2D card that could have been a prop.
- **Check:** each line's key noun/action visible (picture-word ledger); subject separated from its background by value.

### 7. Lighting and atmosphere
- **Refs:** one motivated key per scene (pendant lamp, desk lamp, moon, sunrise flare, venetian-blind stripes), the
  subject brighter than its surroundings by value, practicals that react (alarm button lights red), and light that
  tells time (a locked wide going day -> dusk -> the ship glowing like a lantern).
- **Ours:** pool-of-light grade + lit cards; practical PointLights; per-shot `look`; light changes as beats.
- **Poor:** even light edge to edge; the subject darker than the background; light continuity breaking inside a scene.
- **Check:** subject-vs-surround luma ratio >= 1.15 in mediums; QA "Light continuity"; mean luma .40-.50.

### 8. Texture and rendering
- **Refs:** clean 1080p, no aliasing on ink, soft DOF on backgrounds, reflections on glass, grain-free flat paint with
  subtle surface marks, glows that bloom without clipping.
- **Ours:** MSAA 4 + ink pass + DOF + dither; painted occlusion; no banding (dither on).
- **Poor:** banding, shimmering ink on thin geometry, z-fighting, blown highlights (QA CLIP), crushed darks.
- **Check:** `video_qa.py` with no unexplained flags; layer 3 on all sheets.

### 9. Transitions and editing
- **Refs:** transitions made from the world: shape match-cuts (round can -> moon, grid -> windows, phone earpiece ->
  headset), dives into objects, freeze-frame -> photo on a board, smoke/dust filling the frame, a body crossing the
  lens. Dissolves are 6-10 f and usually shape-matched. Endings stop on motion on the punch word.
- **Ours:** `whipIn/whipOut`, `DustWipe`, matched dissolves, object dives; one in-world transition per scene change.
- **Poor:** a plain cross-dissolve between unrelated framings; a hard cut that jumps the subject across the frame.
- **Check:** every scene change is a matched dissolve, whip, wipe or dive (list them in the review).

### 10. Overall polish and sound
- **Refs:** continuous ambience + score (LRA ~2.4), stereo, effects layered and placed, nothing louder than the voice;
  every second has a new picture beat; no outro.
- **Ours:** ElevenLabs foley + scene beds, stereo master, effects -10/-15 dB under the voice.
- **Poor:** silences between lines, an effect louder than the narrator, a dead second.
- **Check:** `mix.py` gates; a listen.

## Scoring (the `video-review` skill applies this)
Each category 1-10 with evidence from the rendered frames: 9-10 reference-level; 7-8 good, visible gap; 5-6 technically
fine, not competitive; 1-4 below standard. **A final video needs every category >= 8.**
**Automatic fail** regardless of scores: an obvious visual inconsistency, broken or unnatural character animation,
poor camera work, a major composition problem, inconsistent lighting, a rendering artefact, unintended flatness,
an element outside the art direction, or any other obvious production defect.
