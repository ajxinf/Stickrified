---
name: toon-world-short
description: Make a Stickrified vertical Short (61-150 s) - flat 2D cartoon characters in a softly lit 3D world (primary refs visual-ref8/9), second-person ElevenLabs narration, word-synced shots, foley and library music - rendered with three.js inside Remotion. Use for any new Stickrified video, "make the next short", a what-if, strange-true-history or "In this world..." short, kit/look work, or "use the toon world skill".
---

# Toon-world short (three.js + Remotion)

Stickrified Shorts: flat 2D stickman cartoon **cards** (characters) living in a **realistic 3D world** (photo materials, photo
skies, physical light) with black ink lines on the characters.
Three pillars, all narrated in **second person ("you")**, all built to be as entertaining as possible:
- **Scenario**: "What if you were trapped in a supermarket for 30 days during a zombie apocalypse?"
- **Strange true history**: "You're one of 74 soldiers about to knock down an iron bridge just by walking across it."
- **"In this world..." fiction**: an invented world with one changed rule, and you're stuck living in it.
  "In this world, everyone's lies float above their head as a number. Yours says 4,000."

**Current style (R27-R28, user-approved direction 2026-11-21; wins over every older rule, value or reference note in
this file, LOOK_SPEC and REFERENCE_NOTES):**
- **Never lifeless, and every scene its own identity** (user 2026-11-22, twice: first "dull and looks lifeless", then on
  the ep5 preview "a vibe does NOT mean making everything warm"): each scene's light, palette and air come from its
  story beat, place and time: an energetic setup gets crisp high sun and saturated colour, a nostalgic place the
  honey low sun, a gross-out joke a sickly cast, a showdown hard contrast, a lonely night cool depth with one small
  warm practical, the payoff golden. One preset per scene identity (promise-flowers `scene.tsx`: TOWN, DEBATE, MALL,
  porch DAY, HOME_NIGHT, GOLD), never one warm filter over the whole episode. Every scene still gets atmosphere (motes,
  pollen, haze), coloured shadow, saturated dressing and something alive in the background; richness.py on the final file.
- **World**: section "R27" below: photo skies (`photoSky`, never the painted gradient), moving rippled water
  (`water`/`shoreFoam`), a different photo material with normal/ARM maps on every surface, CC0 models at three depths,
  motivated light pools, fire life (`fire.tsx`). Worked example: `src/videos/_look-test-r27` (LookTestR27).
- **Everything except the characters is a realistic model** (user 2026-11-24): every prop, piece of furniture,
  vehicle, plant, tree, food, device, building and set piece is a realistic CC0 3D model (Poly Haven first via
  `scripts/polyhaven.py model <id>`, then other CC0 libraries such as ambientCG or Quaternius only when they look
  realistic, never low-poly or toy-styled kits), lit and shaded like the world. Primitives are allowed only for
  architecture surfaces (floors, walls, ceilings, terrain, road), and only with a photo PBR material. No primitive
  props (`Kit` boxes, cylinders, spheres), no hand-drawn or flat 2D props, no cartoon-styled kit models (Kenney nature
  kit etc.). Effects (bubbles, smoke, speed lines, glows) are not props. A story prop no library has gets modelled from
  realistic parts with photo materials, and the shot plan says so. The 2D cartoon cards are only the characters
  (people and acting animals). `scripts/real_props.py <slug>` (run by preflight) fails any primitive prop line; mark
  floor/wall lines `// surface` and effects `// effect`.
- **Characters and motion**: "Character v3 + fluid motion (R28)" below: v3 build and ink, `flow` follow-through,
  `turnTo` turns, `posesAt`/`poseAt` 10-frame moves, striding walks, tracked walkers. Worked example:
  `src/videos/_char-test` (CharTest). No chest pocket on anyone (user).
- **Every new episode starts from those two test compositions** (copy their world, light, cast and shot patterns into
  `src/videos/<slug>/`), not from `_pipeline-test` or an older episode, whose look is superseded.
- QA: the R27 guard checks (Subject covered, Empty sky, Static hold) and preflight framing flags run on every episode.

**Primary visual references (R24, user 2026-11-21): `assets/visual-ref8.mp4` and `visual-ref9.mp4`.** What they do
and what the kit took from them: `docs/style/VISUAL_DIRECTION.md` "R24" (frames in `docs/style/r24/`). Where they
conflict with older refs, LOOK_SPEC or a value below, they win.

**Look authority: `docs/style/LOOK_SPEC.md`** (craft numbers we adopt + the Stickrified identity layer + the
current gap list). It merges the MIT-licensed 20-video study in `vendor/cartoon-3d-short/references/reports/` (with code
recipes for ink, lens blur, two-tone shading, card shading, grade and faces) and our own 4-video study. When this
file and LOOK_SPEC disagree, LOOK_SPEC wins.

Everything (story, characters, world, music) is our own. Our own frame-by-frame study of seven reference shorts
(R1-R4 look and motion, R5-R7 story and visual storytelling): numbers in `docs/style/REFERENCE_NOTES.md`, the
videos themselves in `assets/references/` on the laptop (git-ignored). Those videos are **private study material**: never upload, publish or send them, never copy their
stories, characters, jokes or shots, never name their channels. Once our pilot is approved, our own frames in
`docs/style/frames/` become the main reference and `docs/STYLE.md` holds our final values.

## House rules
- English only. Narration in second person. One narrator voice (ElevenLabs Eleven v4, voice ID
  `zfc8CJQpe8Kqyl0vvCzo`, every video): a fast, energetic storyteller, deadpan only on single punchlines.
  **Dialogue gets the character's own voice** (user 2026-11-17): every side character with quoted lines gets an
  ElevenLabs voice that fits them, in `script.json` `voices` (see the script skill); `tts.ts` voices those lines
  with it.
- **Scripts: follow the `stickrified-script` skill** (`.claude/skills/stickrified-script/SKILL.md`): pillars,
  formulas, entertainment and exaggeration rules, Eleven v4 tags, length (170-400 words, 61-150 s), `script.json` format.
- Captions (R13 restyle 2026-11-14: no pop; key colours, user request 2026-11-16): the `*word*` key word is yellow
  `#ffd23f` in narration and the speaker's colour on a line with `speaker` (narrator `#ff4a3d`, you `#7ce86a`, a
  video's own cast via `<Captions speakers={{ gary: "#5fb8ff" }}>`; pick hues far from yellow and from each other);
  double quotes are dropped. At most 2 words at a time from `words.json`, otherwise white `#ffffff` bold rounded sans (e.g. Nunito Black or
  Poppins ExtraBold, bundled locally), dark outline `#141014` ~0.006 W plus a soft drop shadow (offset 0.003 W, blur
  0.006 W, 60 % black), centred horizontally at y = 0.70 H, font size 0.055 W (~60 px at 1080 wide), punctuation kept,
  no pop or bounce: each group appears instantly on its first word and holds until the next (median 10 f). Never over
  a face: nudge the shot, not the caption.
- Mix (`scripts/audio/mix.py`), gains relative to these stem reference levels: music bed RMS -20 dBFS
  (`music.py`), every SFX peaking at -3 dBFS (`sfx_gen.py`), voice as ElevenLabs delivers it.
  - Voice 0 dB.
  - Music bed -3 dB, ducked a further 16 dB while the voice speaks (30 ms attack, 250 ms release). A library
    track also gets a -6 dB dip at 300-4000 Hz (`TRACK_CARVE_DB`: its keys sit in the speech band), and the bed is
    ridden 15 dB under the last word (no button hit to end on).
  - Button (final hit, its own `button.wav`) -3 dB, not ducked: above the bed, below the voice.
  - SFX -6 dB.
  - **Check (FAIL below 15 dB):** voice over music in the speech band (200-4000 Hz) during the words of
    `words.json`, and the button below the voice on the last word. `mix.py` prints both and writes them to
    `audio/loudness.json`. Never fix a failed gap by raising the music; lower it.
  - Master to -14 LUFS integrated, true peak -1 dBTP (the louder references measure -14.2 LUFS / -0.8 dBTP): gain
    into a look-ahead true-peak limiter (ceiling -1.3 dBTP). Loudnorm alone falls back to dynamic mode.
  - **The tail** (user 2026-11-24): the video runs ~1.3 s past the last word (`FRAMES = LAST + 40` in story.ts,
    `"frames": "auto"` = last word + 40 in events.json), never a hard stop on the line. The last shot keeps moving
    through it (camera creep, idle acting, particles; never a frozen frame) and `mix.py` fades music + bed to silence
    over it. A musical button may land on the last word; no outro sting after it, no end card.
- **Final export is 1080x1920** (user 2026-11-23: 1080p is the default final output; it replaced the 2K 1440x2560
  master of 2026-11-21). `render.mjs` scale 1 (its default). Keep the 2K photo textures (`polyhaven.py tex <id> --res
  2k`: diffuse + normal 2K, ARM 1K) and the Composer's contrast-adaptive sharpen (`POST.sharpen`); every pixel-sized post
  value scales with the drawing-buffer height, so a 2K render (scale `4/3`) still works if the user ever asks for one.
  **Review flow:** a 720p preview (downscale of a 1080 render) goes to the user only to spot visual defects (floating
  objects, clipping); after their notes are fixed, render the 1080 final, run QA layers 2-3 and richness ON THE FINAL
  FILE, deliver it.
- Checks are scripts first (QA layer 1, `preflight.py`, `richness.py`, `measure.py`), then one eye pass by you on
  the sheets the `video-qa` skill names. No verifier or critic agents; sub-agents only when the user asks. The user
  reviews the finished video.
- Commit after every step (`git add -A; git commit -m "<video>: <step>"`). Push at the end of each session.
- Once the user approves the script: "just do it". No more check-ins until delivery unless blocked.
- Content: advertiser-friendly and evergreen; violence stays off-screen (cutaways, sound, reactions); no graphic true
  crime. History scripts ship with `sources.md`. Every video gets its own world layout and shots (no reskinned
  templates: this protects against YouTube's inauthentic-content policy).

## Machine (Windows 11, PowerShell)
- i5-11400H, RTX 3050 4 GB, 16 GB RAM. Render with `--gl=angle --concurrency=2` (the default since 2026-11-22, user: faster; drop to 1 if a render crashes or goes black; 2K renders of heavy sets start at 1 if they crash). Chrome must run on the RTX 3050 (`remotion-api.mjs` sets the Windows GPU preference; 2026-11-23 benchmark: Intel UHD 1390 ms/frame at 2K, RTX 233 ms/frame). Each shot's own `ThreeCanvas` costs ~1.5-2 s per cut (new WebGL context, world rebuilt, textures re-uploaded): fine at ~60 cuts, but don't split one shot into several canvases without need. `render.mjs` renders 600-frame chunks into `<out>_parts/`, retries a failed chunk in a new Chrome and joins them losslessly; after a crash on unchanged code, rerun with `--resume` to keep the finished chunks.
- **One full-frame QA per round** (user 2026-11-22): QA layer 1 scans every frame of every shot (~45 min on a 2-min episode). `preflight.py` runs it once with frame 0 and renders the review stills with `--no-guard`; a render straight after a clean preflight on unchanged code passes `--no-guard` too (`render.mjs`, which also turns the in-render shot checks off). Never run it twice in a round.
- Before any render in a new terminal: `$env:TEMP='C:\remotion-tmp'; $env:TMP='C:\remotion-tmp'`
  (use another drive if it has more space). See Gotchas: Disk.
- Python 3 is needed for the sound and QA scripts (`pip install numpy scipy soundfile pillow`).
  ffmpeg comes with Remotion: `npx remotion ffmpeg ...`.

## Layout
```
kit/toon/          shared look: lights.ts shade.ts paint.ts world.tsx ink.ts camera.ts Composer.tsx
                   toon.ts figure.ts face.ts poses.ts cast.ts cardshade.ts protagonist.ts extras.ts
kit/toon/build/    world library: building.ts props.ts ground.ts street.tsx presets.ts (era presets)
src/videos/<slug>/ per video: story.ts (shots, cameras), build.ts (world layout), roles.ts (who is where), Video.tsx
videos/<slug>/     SCRIPT.md, script.json, sources.md, voice/ (voice.wav, words.json), audio/ (mix.wav, stems, cues.md)
src/videos/_look-test-r27, _char-test   the current-style starting points for a new video (R27-R28)
scripts/           stills.mjs, render.mjs, measure.py, video_qa.py, tts.ts, audio/ (sfx_gen.py music.py mix.py)
docs/STYLE.md      our style bible: the look values below + approved frames in docs/style/frames/
videos/BACKLOG.md  topic backlog (20+), videos/TIMELOG.md minutes per step per video
```

## Character style (all characters)
**Character style for every episode (cast redesign 2026-11-15, matched to `assets/visual-ref1-3.mp4` +
`video-standard.mp4`; the user rejected the earlier cast as cheap).** It lives in the shared kit (`kit/toon/`), so every
character in every video gets it; do not override it per video. Review sheets: `CharacterLineup`, `HordeLineup`,
`TurnaroundSheet`. Before any character change, pull close-up frames from the refs and compare side by side.
- Head: an imperfect hand-drawn circle, different per character (`headBlob`: H/W .92-1.02, seeded lumps), near-white
  `CREAM #f7f4f0` with soft grey shading (zombies: `Look.skin`). Hair is drawn INSIDE the head (`insideHead`): one
  outline round the whole head, the hairline a line across it, combed strand lines + a shine. Never a cap stuck on a
  half-dome. Hats sit on top.
- Outline: thin, nearly even (`LINE` .42: ~2 % of the head width, thick/thin 1.35), with a seeded hand-drawn wobble
  (`INK_WOBBLE` .2) so no two characters' lines match. No thick brush outlines.
- Face: small features set wide (`FEAT` .7): small oval eyes ~30 % of the head apart (neutral = plain ovals, lids for
  deadpan/tired/smug), thin brows, a tiny mouth, no nose, no blush, no catchlights.
- Body: the build's pill torso (original widths, not slimmer) carrying the costume detail (stripes, buttons, lanyard,
  tie, patterns); thin dark stick limbs (~3 % of the head width) in the ink colour, small dot hands, small dark feet
  (white sneakers for "you"). Tried and rejected: brush limbs in cloth colours, mitten hands, shaped shoes, paper grain.
- **R24 (visual-ref8/9):** heads a little wider than tall (H/W .88-.98); faces carry heavy expressive brows; costumes
  carry rich pattern (lamellar rows of dots, stripes, belts with buckles, badges, pockets) and pick up the scene's
  light (warm firelight on one side). Legs keep their length: a lowered hip (`bob` < 0) folds the knees (figure.ts
  leg IK). Use the `crouch`, `pickup` and `strain` poses for picking up, carrying and pushing (ref9 27 s squats to
  pick up the bomb; ref8 16 s carries armour plates).
- Variety comes from build, costume, hair, one accessory (`kit/toon/wardrobe.ts`, `extras.ts`). Zombies: green skin,
  sunken-eye arcs + stitched scar (`zombieFace`), torn shirt hem + grime (`rips`), each one a different person
  (office, jogger, granny, old man, lumberjack, road worker: `ZLOOKS` in the pilot's `roles.ts`).

### Character v3 + fluid motion (R28, user 2026-11-21: "revamp the characters ... much more fluid body movements")
Kit-wide, so every new episode gets it; `CharTest` (`src/videos/_char-test`) is the worked example.
- **Build (R29, user 2026-11-24: "kinda tall and more lean compared to references")**: a bean as wide as the head on
  short legs, ~3.05 HH like ref8/9 (BUILD adult a 124 / torso 1.1 / legs 1.0 / tw 1.0; extras 3.0-3.25 HH, kids 2.6;
  `figure.test.mjs` enforces it). Same head size, so adults stand ~1.4 m: frame on `headHeight()`, never a typed
  height. Comparison: `docs/style/r29_proportions.jpg`. (R28 was a 124 / 1.22 / 1.36 / .92, 3.58 HH.) outline 3u (refs ~2 % of the head width; was 5u), limbs 2.6u. Heads carry a soft ball highlight and core
  shadow, the chest takes the head's soft shadow. Card ink stays near-black in any light; practicals warm a face by
  at most +60 % (it blew out to orange-white by the fire).
- **Every role's state ends in `flow(raw, F)`** (kit acting.ts): the head and hands trail the body (an exponential lag
  over 10 frames), so leans, bobs and jumps get follow-through. Crowds `flow(raw, F, 0.5)`.
- **Turns ease**: `heading: turnTo([[f, h], ...], F, 14)`, never a jump in heading (a jump reads as a card flip).
- **Keyed poses**: `posesAt([[frame, Pose], ...], F)` (or `poseAt` with names): 10-frame smootherstep moves, a 4-frame
  anticipation, a 4 % overshoot settling over 8 frames, arms 2 and head 4 frames behind the body, breathing under every
  hold. Hand-made timelines call `movePose(a, b, moveCurve(d), moveCurve(d - 2), moveCurve(d - 4))`.
- **Walks stride**: `walkPose` swings the feet past each other (`pose.stride`) and the arms forward/back (`Arm.fwd`),
  which show in 3/4 and profile views; walk speed `dist` = metres actually travelled, ramp `amount` in over ~10
  frames and out over ~12 so starts and stops settle. Track a walker with the camera (refs) rather than a static wide.

## The protagonist ("you")
The same character in every video; he is the viewer and the channel's face (LOOK_SPEC section 2). Costumes are
overlays (hat, coat, uniform) that always keep the messy fringe and a rust-orange `#c8582c` accent.
Redesigned 2026-11-13 (`kit/toon/protagonist.ts`):
- Adult build 3.5 head-heights; round head in the character style above.
- Hair: soft messy curtain fringe `#4a3226` in fluffy clumps, parted off-centre toward the facing side, locks
  ending just above the brows, short sideburns.
- Oversized rust hoodie `#c8582c`: hood bunched behind the neck (shows past the jaw on both sides: the silhouette
  cue), hood collar under the chin, cream drawstrings with ink aglets, kangaroo pocket, ribbed hem; dark joggers
  `#30364a`; chunky white sneakers (`Look.sneakers`).
- Upgrade 2026-11-15 (user): chunky pointed fringe locks (irregular, swept from the part), a shine band and strands
  for volume, hoodie folds, a lined hood, **headphones resting round the neck** (signature accessory), a rust stripe
  on the sneakers (`Look.shoeStripe`). Reference: `docs/style/frames/you_turnaround.png` (`TurnaroundSheet`).
- **Turnaround** (`Look.turns`; only "you" so far): 0 front, +-45 3/4, +-90 profile, +-135 3/4 back, 180 back. Hair,
  hood, hoodie details, face, ear, arms and feet all follow the view. In a shot, give the role's state a world
  `heading` (rad, the way he faces: `Math.atan2(target.x - at.x, target.z - at.z)` to face a target) and the card
  picks the view from the lens every frame (`kit/toon/cast.ts` `asSeen`/`viewYaw`); `pose.yaw` sets it by hand
  (sheets). Use the angles (reference study): profile for walking, talking to someone or looking at a thing,
  3/4 for reactions, back for following him into a place or looking out at the threat. Looks without `turns`
  always draw the front view. Self-check: `node kit/toon/turn.test.mjs`.
- Channel profile picture: `ChannelPfp` composition -> `assets/brand/` (docs/CHANNEL.md); re-render it after any
  change to the protagonist.
- Faces from the face library (character style above).
- **Face pieces follow the face** (user 2026-11-22: Grandma's glasses stayed front-facing on a turned head, eyes ran into
  hair): anything drawn over or around the face (glasses, moustaches, shades, scars, the hairline) positions itself with
  `faceGeom(h)` (kit face.ts): the eye line `fx`/`ex` that slides and foreshortens with the turn, which eye shows, the
  ear. Never `cx + k * u * facing`. The hairline (`capPts`) stays above the brows over the face. Check every speaking
  role on a turn sheet (`PromiseTurnSheet` pattern: seven angles per role) after any face or hair change.
- Expressions: neutral (plain ovals), tired, worried, scared, shocked (white circles almost touching), smug, determined,
  sad, angry, sneaky, relieved, confused, deadpan, laughing. Extras: sweat drop, steam puffs, colour fill, "!" pop.

## Pipeline per video (hands-on target <= 2 h; renders run unattended)
1. **Topic and facts.** Pick from `videos/BACKLOG.md`. It must be visual: a physical cause and effect, plus one
   everyday analogy that explains it. Facts with sources at the top of `SCRIPT.md`; history also gets `sources.md`.
   Fiction instead needs one impossible rule that is instantly drawable and has obvious everyday fallout.
2. **Script.** Run the `stickrified-script` skill: it writes `script.json`, `SCRIPT.md` and (history)
   `sources.md`, checks them with its `check_script.py`, and hands `SCRIPT.md` to the user. The user edits; once
   approved, "just do it". Visual rules that come from the script:
   - **Cold open**: the first frame already shows the most absurd image of the story, on the first word.
   - **Literal gags**: every line's `gag` becomes a picture (a face "goes purple" -> it fills purple).
   - **No time-stamp cards** (user 2026-11-21: "stop doing the 4 hours later label at the top, find a more creative
     and subtle way"). Show time passing inside the world: a clock or phone in frame, a candle burned down, the tide
     line moved, shadows swinging, the sky changing, stubble or a pile of empty cans growing, a match cut on the same
     framing. A year in history lives on a prop (a newspaper, a calendar, a sign). Text still lives in the world (see
     "Visual storytelling").
   - At least one POV "you" shot per video. POV only until a back-view card exists (cards always face the
     camera, so an over-the-shoulder shot shows your face); the back view is in `videos/BACKLOG.md`.
   - Captions change 2.2-3 times per second; the last caption ends on the last word; the picture runs on ~1.3 s (see "The tail"), no outro card.
3. **Voice.** `node scripts/tts.ts videos/<slug>` (Node 22.6+ runs TypeScript directly; `--new` regenerates,
   otherwise the saved `voice/tts_response.json` is reused so credits are not spent twice) -> `voice/voice.wav` + `voice/words.json` (character
   alignment converted to word times). Hand-check the word times; everything is timed to `words.json`.
   `tts.ts` fails when a non-verbal tag (`[laughs]`, `[gasps]`...) left less than 0.3 s between its words (not
   performed: Eleven v4 skips tags now and then, more often mid-sentence) and cuts each tag to
   `voice/tag_<name>_<n>.wav` for the ear check. Put tags after a full stop and retake with `--new` until it passes.
   Then `python scripts/audio/line_loudness.py videos/<slug>`: no line may sit 4+ dB under the median (hushed and
   whispered deliveries are inaudible under music, user 2026-11-16). Retag and retake; for a line or two just under,
   `--lift` raises lines 3+ dB under the median in voice.wav (rerun `mouth.py` after; redo after every new take).
   Also check that no word's time lands in silence (the mix report's "lowest word" going negative): Eleven's
   alignment drifted 0.3 s on "That's me" in trapped-in-this-world and on 8 sentence-final words in ep 3: run `python scripts/audio/fix_word_drift.py videos/<slug>` (pulls words in silence back onto their speech), then rerun `mouth.py`.
4. **Shot plan** in `src/videos/<slug>/story.ts` (start from `src/videos/_look-test-r27/` for the world, light and
   shots and `src/videos/_char-test/` for the cast and motion; register the composition in `src/Root.tsx`):
   - `SHOTS`: id, a/b frames, light day/golden, crowd mode, `tau` story time.
   - `XFADE` crossfades at place/time changes; `FLASH_AT` white flash after the hook.
   - `CAMS`: per-shot keys `{f, dur?, cut?, s: f => {pos, look, fov, roll}}`; `KICKS` impact flip-shakes;
     `DOF`/`dofAt` lens blur per beat; `FOREGROUND` near framing props.
   - Every visual reaction lands 0-3 frames before its word.
5. **World**: pick an era preset (`kit/toon/build/presets.ts`) and build this story's own layout with
   `<Street preset opts>` (seed, length, curve, lamp spots, landmark, `extra` props) in `build.ts`. Keep cameras
   clear of facades and props (no culler yet).
6. **Cast**: roles, costumes, expressions and walks in `roles.ts`. Every speaking role is designed with
   `kit/toon/wardrobe.ts` (see "Visual storytelling"). Story props live in `props.ts` as `MovingProp`s, used by
   both `Video.tsx` and the guard (`Shot.moving`); tag door colliders with `userData.door`.
7. **Captions** on, from `words.json`.
8. **Sound** (`scripts/audio/`): lock picture timing first. Any later timing change means re-running sound.
   - Event table `videos/<slug>/audio/events.json`, every frame taken from `words.json` or a motion formula:
     `{"fps": 30, "frames": N, "events": [{"f": 206, "sfx": "splat", "note": "why"}],
     "music": {"bpm": 120, "frames": N, "button": <frame of the last word>, "stop": [f0, f1]}}`.
     Sounds: step, whoosh (centred on its frame), swish, splat, pat, pop, sting.
     **Air sounds are rationed** (pilot feedback 2026-11-13: "too many swooshes, annoying"): dissolves and hard cuts
     get NO sound by default; a whoosh only for a real fast camera move (whip, fly-through) or something flying past
     the lens, a swish only for a quick physical action (a slot sliding, tape ripping). `sfx_gen.py` plays them
     quieter than the hits and refuses the table above one whoosh per 20 s, one swish per 10 s, or two air sounds
     closer than 3 s. Hits (pat, pop, splat, sting, step) carry the rhythm.
     Sync cues to words, not typed frames: `{"word": "laughs", "n": 0, "lead": 2, "sfx": "pop"}`, music
     `button`/`stop` the same way, `"frames": "auto"` (`scripts/audio/events.py` resolves them), so a new voice
     take moves every cue. A whoosh on a whip keeps its shot-plan frame.
   - **R13 sound (2026-11-14, user decision): real foley over synth blips.** Any `sfx` name that is not a synth sound
     is an ElevenLabs effect from the shared library `assets/sfx/library.json` (`{"name": {"prompt", "dur" 0.5-30,
     "loop"}}`): write a specific prompt (material, action, size, "no music"), reuse library entries across videos.
     `python scripts/audio/eleven_sfx.py videos/<slug>` generates only missing/changed entries (they cost credits)
     into `assets/sfx/eleven/`. Aim for ~9 strong hits per 10 s (R13), each a layered real sound, not 15 pops.
     **Levels are by loudness, under the narrator** (user 2026-11-14: "way too loud, especially the generator"):
     each sound's loudest 400 ms lands 10 dB (hits) or 15 dB (sounds >= 1.5 s: engines, crowds, rattles) under the
     narrator's median word; a library entry's `"level"` overrides. `mix.py` FAILS any mix with an effect within 6 dB
     of the voice.
     Per event: `"pan"` -1..1 (where it is on screen), `"gain_db"`, `"max_s"` (cut the sound to that length with a
     150 ms fade; a library entry's `"max_s"` applies to every use). **Keep hits short** (user 2026-11-15: "the zombie
     groans last way too long"): crowd groans and other long one-shots get `max_s` ~1.2. Mix-time keys (`level`,
     `max_s`) never trigger a paid regeneration; only `prompt`/`dur`/`influence`/`loop` do.
     `"ambience": {"<scene tag>": "<library loop>"}` lays a continuous bed per scene (from `shots.json` scene tags,
     10-frame crossfades): the mix is never silent between lines. `"space": {"<scene tag>": RT60 s}` puts the
     effects in that room (interiors ~1.1, streets ~0.45).
   - `python scripts/audio/sfx_gen.py videos/<slug>` -> `sfx.wav` (stereo) + `amb.wav` (the beds). `shots.json` must
     carry scene tags (any stills/render pass writes them).
   - **Music is a library track** (user, 2026-11-16): pick the best fit from `assets/bgm/library.json` (default for
     "In this world..." fiction: `in_this_world(default).mp3`) and set `"music": {"track": "<file>", ...}` in
     `events.json`. `python scripts/audio/music.py videos/<slug>` hands it to `bgm.py`, which cuts a seamless loop of
     the exact video length (the last frame flows into the first when the Short replays; the tempo moves up to 8 %,
     pitch kept), mutes `stop`/`stops` spans, and writes `music.wav` (stereo) + a silent `button.wav`. Listen to
     `audio/bgm_seam.wav` (the wrap). A WARN means the track has no clean loop at this length: pick another or accept
     the 2 s end fade. Without `"track"`, `music.py` still synthesizes the old plucked score.
   - `python scripts/audio/mix.py videos/<slug>` -> `mix.wav` (48 kHz, exact length), `loudness.json` (LUFS, true
     peak, voice-vs-music gap), and `public/<slug>/mix.wav`, which `Video.tsx` mounts with `<Audio>` in Studio only.
   - Stereo master (`mix.py`): voice centre, score widened and warmed (+3 dB below 160 Hz), beds at -9 dB ducked 13 dB
     under speech (and 18 dB inside music `stop(s)` for whispers), master tilt (+4.5 dB low shelf 250 Hz, +5.5 dB
     high shelf 4 kHz, 35 Hz high-pass) and width (side ~-20 dB under mid). Measured against R13 with the band
     table in `docs/style/REFERENCE_NOTES.md`.
   - Lip sync: `python scripts/audio/mouth.py videos/<slug>` -> `voice/mouth.json` (per frame open + o/a/e shape).
     A character speaks on screen with `fx: { talk: talkAt(MOUTH, F, spans) }` (`kit/toon/face.ts`; spans = the
     words it says, e.g. a quoted line); `laughFlap` for a laugh. Write characters' quoted lines into scripts so
     they get to talk (R13: characters talk; dialogue holds run on the mouth).
   - Write `cues.md` (frame, time, sound, what it is synced to).
9. **Look checks, before the final render**: `python scripts/preflight.py <Comp> <slug>` (video-qa layers 1 + 1b:
   every scene check on every frame, then labelled sheets of every shot). Read every sheet once; fix; re-run. Spot-check
   colour with `python scripts/richness.py out/<slug>/pre/p_<frame>.png`. For a look question, one side-by-side against
   the R24 frames: `python scripts/sbs_sheet.py out.jpg --ours ... --ref docs/style/r24/...`.
10. **Final render**:
    `node scripts/render.mjs <Comp> out/<slug>/video.mp4 [--no-guard]` (1080, concurrency 2) (QA layer 1 + `out/<slug>/plan.json`, then h264 crf 16, angle; prints the total time),
    mux with `npx remotion ffmpeg -i out/<slug>/video.mp4 -i videos/<slug>/audio/mix.wav -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -b:a 320k out/<slug>/final.mp4`.
    QA: the **video-qa** layers 2, 2b and 3 on the final (`video_qa.py`, `short_qa.py`, `measure.py`, `richness.py`,
    `frames.py` sheets, `line_sheet.py`), written to `out/<slug>/QA.md`. Fix, re-render only the changed part, re-QA
    with `--prev` (changed shots only).
11. **Deliver**: `python scripts/deliver.py <slug> <N> "<Title>"` (after the copy it cleans `out/<slug>/` media + `C:\remotion-tmp`; never copy by hand: it refuses unless layer 1,
    QA.md `Verdict: PASS` and richness are on disk and passing; episode 3 skipped QA and shipped glare, a door onto a
    wall and cut text). The user reviews the delivered video by eye. SendUserFile it; 3 title options; description with "Narration: AI voice" (+ sources for
    history); add minutes per step to `videos/TIMELOG.md`; mark the topic done in `BACKLOG.md`; commit and push.

## Visual storytelling (from the R5-R7 study)
The look values below make a frame pretty; these rules make the frames tell the story. Plan them in the shot plan.
- **Signature design (wardrobe).** Flat single-colour beans are forgettable. Every speaking role gets ONE pattern
  (`pattern`: plaid, dots, flowers, quilt, pinstripe) and ONE OR TWO signature accessories that read at phone size
  (`bowtie`, `visor`, `boater`, `cap`, `shadesUp`, `tache`, `overalls`, `suspenders`, `belt`, `nameTag`; legs:
  `shorts`, `socks`), all in `kit/toon/wardrobe.ts`. Example: Gary in `_pipeline-test-2` (visor, sunglasses up,
  walrus moustache, turquoise flower shirt, socks and sandals). Never copy a reference character's outfit.
- **Cast by silhouette.** Every speaking role gets a costume that reads in pure silhouette at 120 px: a hat, a
  hairdo or a prop (helmet with plume, cap, beanie, slick hair, name-tag vest, braces, sunglasses on the head).
  "You" keeps the messy fringe and rust accent under any costume; the opponent or rival gets the opposite silhouette and
  colour (tall vs short, cool vs warm). Crowds of extras share one costume family so the leads pop.
- **Faces carry the jokes.** Pick the expression per word: smug half-lids, gritted-teeth grin, ring-eyed shock,
  sweat drop, colour fill. A reaction close-up after every turn in the story.
- **Emotion density (R22, user 2026-11-16: "more emotions on our character to make it feel more alive").** Every
  on-screen character runs an `exprAt` timeline (kit cast.ts), never one face per shot:
  - a face change at least every ~1.5 s of screen time, on the words; big beats get a **ladder** of 2-4 faces
    (e.g. smug -> suspicious -> nervous -> crying), each swap through the 2-frame blink;
  - use the whole library (kit face.ts, 24 faces, `ExpressionSheet`): excited, nervous, suspicious, disgusted,
    scheming, crying, pleading, proud besides the originals; whites-and-pupils eyes (neutral, worried, confused,
    excited, pleading) let `alive()` glances show, so point `gazes` at what the character would look at;
  - layer effects on the peaks: `sweat`, `blush`, `tears`, `steam`, `fill`, `bang`, `ringEyes`;
  - the body follows the face (pose change or `reactSquash` on the same frame); listeners never freeze (`alive`).
- **Never cheap next to the refs (R21b, user 2026-11-16; `docs/style/VISUAL_DIRECTION.md` "R21b").** The set stays
  readable behind the character (DOF presets are 4-5 px now: never push `maxPx` back up), heads take at most ~35 %
  of the frame width except the 1-3 biggest reactions (mediums with the set around them, like every ref), every set
  carries small many-coloured detail at several distances (bunting, signs, posters, plants, clutter) so no frame is
  one colour, and the sunset/golden frames keep cool local colour against the warm light. Before the final render,
  `python scripts/richness.py <stills or render>` must land inside the refs' ranges (crisp 8.5-21.6, edges
  .050-.093, hue entropy 1.4-2.7, warm share <= .77, colourfulness .17-.36; R24 widened them to include ref8/9).
- **Bodies act, not just faces (R21, user 2026-11-16: "characters should not feel stiff, robotic, weightless";
  study of visual-ref7 in `docs/style/VISUAL_DIRECTION.md` "R21").** Ep 2 laughed, panicked and gloated with a
  statue body under a changing face; the reference rocks the whole body on a laugh, leans 25 deg into a cart it
  drags, falls off a bench laughing. Rules:
  - **Every role's state goes through `perform(state, F, seed, exprAt(...))`** (kit acting.ts) as the last step of the
    video's `st()`: each face brings its body (laughing rocks +-7 deg with the head a beat behind and a bounce;
    crying shakes the shoulders; shocked jumps and stretches; scared/nervous shrink and tremble; sad/tired droop;
    proud/smug lift the chest; scheming/sneaky hunch and rock), crossfading over 8 frames from the previous
    emotion, and speaking characters (`fx.talk`) nod on open syllables. It never moves the hands, so held props stay
    in them. Crowds and extras: `amount` 0.5.
  - **Pose changes anticipate, overshoot and overlap** (R28 values): `poseAt`/`posesAt` (and `moveCurve`/`movePose`
    for hand-made timelines) dip 4 frames the other way, move over 10 frames on a smootherstep to a 4 % overshoot,
    settle over 8, with the arms 2 frames and the head 4 frames behind the body; hands travel on arcs. A video's own
    `pose()` helper calls `movePose(a, b, moveCurve(d), moveCurve(d - 2), moveCurve(d - 4))`, never a plain
    `blendPose`, and the role's state ends in `flow(raw, F)`.
  - **Physical effort shows in the body**: pulling, pushing, carrying and climbing lean INTO the load (in a profile
    view `sway` is the forward lean: 15-25 deg toward the facing side); a heavy object makes the walk slower and
    lower (`walkPose(d, amount)` with bigger `bob` dips), never a normal walk beside a moving prop.
  - **Bodies touch**: laughing people lean on each other, a friend's hand lands on a shoulder, a character leans on a
    wall or a post with a hand on it. Two people side by side for more than ~2 s share at least one contact.
  - **The biggest physical beats get speed lines** (ref 4.77 s: radial streaks behind the arm whip on "run."):
    `<Sequence from={word} durationInFrames={12}><SpeedLines center={[x, y]} /></Sequence>` (kit SpeedLines.tsx,
    centre on the actor's head), on 1-3 beats per video, never on every move.
- **Words live in the world.** Signs, labels, banners, name tags, calendars, screens and placards carry text
  (a "DO NOT PUSH" sign, a "SHAKE ME!" box, a scoreboard number rolling over). Floating cards only for the
  identity stamps (DAY N, year) and effect cards. Sign faces use an unlit material (Readability traps).
- **The mechanism is the star.** When the payoff explains how something works, show it as 2-4 macro inserts, one
  per step, in the order the narration says them, and trace the path that matters with a glowing streak (a sound
  trail behind the cart, a wave running along the deck, the arc of a swing).
- **The analogy gets its own mini-set** (a park swing, a road with a hairpin): its own light and palette, a fast
  pull-out or dissolve in and a match cut back to the story.
- **Time of day follows the story**, not the clock: bright day for the setup, blue night or rain for the scheme or
  setback (warm practicals), a clean bright morning or golden light for the payoff. Change it on a dissolve.
- **The narrated thing is the focal point, and it changes on screen** (user 2026-11-22, ep5 preview): "your bud turns
  brown" = an insert on the bud that browns and droops across the line (ramp the state over the words, never a cut to
  the end state); "your fly leaves you for Derek" = the lens chases the fly from your shoulder to Derek's face with
  the destination visible the whole way; a runner gets a leading track at her speed, not a static wide she crosses. A
  shot that technically contains the object but where it is small, edge-of-frame or hidden behind the set fails.
- **Every action the narration names is shown on screen, on its word** (user, 2026-11-16: "in this world your shoes
  are full of soup does not show a close-up of the shoe full of soup"). Soup in the shoes = a close-up of the
  sneaker pouring soup into a puddle; "the red bar crawls, 90 %" = a fat bar with a big 90 % on it; "then I notice" =
  the eyes snapping onto you; "his ladder smashes your jar" = the smash in frame on "jar", not a cut away before
  it. A reaction shot of a face is not the action. On every render, `python scripts/line_sheet.py` makes a contact sheet of every line (2 frames
  per line) and check each line's verb is visible.
- **Exaggerate literally.** A big number becomes a big picture: 400 heads turning at once, a cart bristling with
  212 toys, a crowd that fills the frame edge to edge (instanced extras).
- **Object POVs**: besides "your" POV, ride on the thing that matters (the cart down the ramp, the bridge deck,
  the swing). They count as the video's POV shot.
- **End on a face**: the last word lands on a close-up (smug, guilty, sly) with the payoff blurred behind it.
  When there is a rival, end on the rival's face (silenced, shocked) or the hero and rival together, with the
  payoff happening behind them.
- **Mirror the opening shot at the end** so the loop is seen as well as heard (same framing, flipped meaning:
  your zipped mouth in the cold open, Brad's zipped mouth at the end).
- **Mocker shots**: the rival or crowd laughing in a medium two-shot early; the same framing, silent, late.
- **Cross-section cut-aways** for hidden spaces (under the ground, inside a wall, inside a toy).
- **Colour encodes the physics** (rails glow hotter, a fuse burns down, a fuel gauge drops) so the viewer sees the
  plan ripening.
- **Device POV** through a circular mask (binoculars, a window slot, a telescope) for spying on the rival.
- **Rough stills before the build**: block each shot as a quick still (`scripts/stills.mjs`) and check it reads
  with the sound off: who wants what, and what just changed.

## R13 craft (2026-11-14 study of a stronger reference; numbers in docs/style/REFERENCE_NOTES.md "R13")
- **One key, one pool.** Every shot reads as lit by one source: `Composer look.pool` [x, y(uv, up), r, k] darkens away
  from the subject (defaults per world in the video's `WORLD_LOOK`: k .26-.45, wides half). Leave 40-60 % of the
  frame in shadow at night and inside.
- **One accent per scene.** `look.accent` [hue, mute]: hues away from the scene's accent lose saturation (rust .045
  = "you"; a lantern's amber at night). No frame with 5-6 loud hues.
- **Busy hands.** `fidget()` (`kit/toon/poses.ts`, applied in the video's `st()`): a free hanging hand does a chin
  rub, head scratch or hand-to-hip for ~0.8 s every ~2.5 s. Better still, give holds a prop action (sip, bite, twirl).
- **Transitions made of the world.** Scene changes cut on a whip-pan (`whipOut` on the last 6 frames, `whipIn` on
  the next shot's first 6, both declared in `whips`), an impact's dust fills the frame (`kit/toon/DustWipe.tsx` in a
  Sequence starting ~10 f before the cut), a body walks into the lens, or the camera flies through an object.
  Dissolves only for time passing inside one place.
- **Characters talk** (lip sync, sound step) and **the camera follows the object of the sentence** (ride the thrown
  thing, the bullet, the cart). **Macro inserts for every process verb**, each with its own motion.
- **Text lives in the world**: labels on crates, signs that joke, a calendar, marks scratched in the dirt.

## Shoot the gag (zombie pilot critique, 2026-11-13: "half the gags never reach the screen")
The first pilot showed the PLACE where each gag would happen, wide and small, and the voice told the joke alone. Rules:
- **One gag shot per line, on its word**: the slot slams on "only" in a close insert, the bubble pops on "batteries",
  the face goes ring-eyed on "up". Write the gag shot into the plan before anything else; cover it close (MCU/CU or a
  macro insert), then cut away. A line whose gag is not on screen is a bug.
- **Faces big**: the speaking or reacting character's head is at least 15 % of the frame width (MCU ~35 %), unless
  the shot is an establishing / reveal / crowd wide marked `wide: true`. People far away (on a roof, across a
  street) get `telephoto(from, who, head, span)` (kit camera.ts), not a wide. QA "Subject size" enforces it.
- **Short shots**: 1-3 s, cut on the punch word; no shot over 4 s, mean at or under 3 s (QA "Pacing").
- **Hands do things**: `actionPose("knock" | "tape" | "wave" | "bang", t)` and the still poses `eat`, `kick`, `knock`,
  `tape`, `wave`, `bang` (kit poses.ts); faces `grin` and `smirk` besides the rest. Held props sit in the hand
  (`handWorld`, QA "Moving props").
- **Sitting is a pose, not a sunk card** (user 2026-11-18, ep 4: "they just stand and clip through the chair"):
  `pose.sit = 1` drops the torso to `SEAT_M` (0.38 m) and bends the knees; mark the role `sit: true`, frame on
  `headHeight(look, { ...REST, sit: 1 })`. **Stand the card ~0.1-0.12 m IN FRONT of the seat's front face**, never on it
  (`model()` centres the model's bounding box on the placement point, so the front is at +size.z/2: `sofa_02` +0.409,
  `dining_chair_02` +0.288, `plastic_monobloc_chair_01` +0.314, `painted_wooden_bench` +0.249; ep5 had Dad 17 cm inside
  his chair from reading raw model coordinates): cards turn to face the lens, so a card on
  the front face swings half into the furniture (ep5 preview: legs through the sofa). Never `allow` "Card penetration"
  for seated cards: the guard checks a `sit: true` card as a thin plane (`SEAT_DEPTH`), so it flags exactly the sunk ones.
- **Hits get a shake**: `impact(pose, frame)` (kit camera.ts) on slams, crashes and kicks, declared in `kicks`.
- **Screens are displays, not stickers** (user 2026-11-22, ep5 TV poll): put screen content on the device's glass with
  kit `build/screen.ts` `curvedScreen(tex, { x, y, w, h, z, zMap })`, added to the model's inner group
  (`model(...).children[0]`) in model units. Measure the glass by raycasting the model on a grid (a CRT is not a clean
  dome; `zMap` takes the measured heights). It brings rounded corners, scanlines, edge falloff, a glass sheen and a
  bloom-level glow; light the room from it with a `screen` practical.
- **Every window shows the outside**: `streetViewTex` + `windowViews` (kit build/views.ts), day and night.
- **Sets say what they are**: set dressing that names the place's role at phone size (a fortress gets barbed wire,
  sandbags, a MEMBERS ONLY board: kit build/storyprops.ts `barbedWire`, `sandbags`; signs via build/signs.ts).
  Toys from build/toys.ts (`toyParts`, `toyPile`, `duckToy`, `dinoToy`).
- **Crowds clump**: `clusteredSpots` (kit crowd.tsx), per-instance `scale` 0.88-1.1, two or more idle states
  (reaching arms), and the payoff of a crowd is shown (a shop filling to the ceiling), not cut away from.
- **Threat in frame by ~1 s** (pilot r5 blocker, fixed R17): the hook shows the danger, not only the hero. Hard cut
  to 2-3 close extras (cast roles with the crowd's looks and fill, at MS) on line 1's number or stakes word.
  A group reaction swaps every face on the word (QA "Reaction timing" allows 0-3 f before a word start); only the head
  turns ripple, 2 f apart. Spread the extras across the lens axis or QA "Cast overlap" fails.
- **Crowd lines crane INTO the crowd** (pilot r5: "zombies ~1/25 frame height"): the reveal wide may open the shot,
  but land ~5 m from the densest cluster (`densestSpot` in kit camera.ts, over `crowd.place(i, f).pos`) before the
  key word, heads ~1/8 frame. Put the lens in a lane the crowd keeps clear (`clusteredSpots` keepOut), clear of ramps
  and rails (QA "Camera clearance" >= 0.3 m). Moves stay <= 25 px/f outside whips (QA "Camera curve"): ~45 f for a
  crane from 7 m up.
- **Dawn/golden light rakes across the set from the side or front** (sun az ~150 from the main lens), not from behind:
  a backlit dawn turned the whole street violet.
- **The ending mirrors the opening**: the same framing (a telephoto close-up of the rival), now silent.
- **Sound**: horde scenes get a short `horde_groan` hit (library `max_s` 1.2, not the full 3 s), crashes a `crash`; the music `build` cue (events.json) starts the climax.

## Staging and camera (from the 2026-11-14 stress-test comparison; `src/videos/_stress-test` is the worked example)
- **Frame with `frameOn(at, from, size)`** (`kit/toon/camera.ts`). Sizes are calibrated to our cards (heads are
  0.5 m wide): `cu` head ~45 % of the frame width (head + torso, the reference "close-up"), `mcu`, `ms`, `fs`, `ws`.
  Eyes land a third down. Reaction and dialogue shots are `cu`/`mcu`, never a full figure with empty ground.
- **Never an empty foreground.** Ground may fill at most ~25 % of the frame. Put a framing object near the lens in
  ~1/3 of MS/CU (`StreetOpts.extra`: a barrel, a hedge end, a shelf end, a post) or crop tighter.
- **Stage people together.** Two-shots overlap (one partly in front, cut by the frame edge), characters look at each
  other (`pose.look` toward the partner), hold and use props (`prop`: can, box, phone, flashlight, mug, lantern).
- **Pace**: change shot or framing every 1-2.5 s (refs cut on words). Hard cuts inside a place, dissolves between
  places.
- **Camera rhythm** (measured: refs move 4-10 px/f median, 29-40 px/f in moves, ours was 1.8): holds creep (push ~14 %
  of the subject distance per shot, plus a little drift), then a quick motivated move: `reframe(pose, to, a, b)`
  glides to a new framing over 20-30 f. Moves faster than 25 px/f are declared as `whips` and get the Composer's
  camera motion blur automatically (180 deg shutter, from the shot's previous-frame camera).
- **Poses ease**: `poseAt([[frame, pose], ...], f)` anticipates, moves over 5 frames, overshoots and settles (R21);
  never pop a pose in one frame.
- **Held lights**: a `lantern` prop gets a `glowSprite` at the hand (0.6 m up, 0.24 m to screen right); keep that hand
  still for the shot (a pose that lifts it leaves the glow behind). Crane `reveal`s must start above the ground.
- **Characters never share a spot**: the QA guard fails two characters closer than 0.5 m (bodies through bodies).
- **Golden/backlit**: keep the sun 10-12 deg up and the street open toward it, so sunlit ground sits beside the
  violet shade; a whole frame in shadow reads as night, not sunset.
- **Light patterns without volumetrics**: `lightPatch(center, normal, w, h, color, strength, panes)` (glow.ts) for
  window or slat light on floors and walls.

## R27: what the refs still do better (moon report 2026-11-21; `docs/style/VISUAL_DIRECTION.md` "R27")
An outside comparison of Episode 4 against the three newest refs. Most of its points are already rules above; these are
the new ones, and each has a check or a kit piece. **Future episodes only: never re-render or patch a finished one.**
- **Every shot names its visible change** in a comment on its `SHOTS` entry (`// does: Brad's sign swings, you flinch`):
  anticipation -> action -> reaction, on the words. Captions changing over a still picture is not a change, and neither
  is a camera creep or idle breathing. QA "Static hold" fails 2 s without one; preflight's framing flags catch frozen
  pictures and cuts that keep the same composition. Fix with acting, a prop or the world, never with constant camera motion.
- **The subject is never behind the set.** Foreground framing props sit at the frame edge; a carried prop never covers
  its carrier's face (moon cold open: the chair hid you for 2.4 s). QA "Subject covered".
- **Plain sky stays in the top third** of non-wide shots (QA "Empty sky"): tilt down, frame tighter, or fill it with the
  set, a skyline, lights or the moon. When the sky IS the story, mark the shot `wide` or `allow` it with the reason.
- **A lighting idea per scene**, written as one line at the top of `build.ts`: key (direction, colour), fill level, rim,
  and which practicals carry it. Every practical in frame lights the ground and faces near it (`practicalLights`, not
  only a glow sprite); a lamp with no pool is a bug. Night and interiors keep 40-60 % in shadow (R13 "one key, one pool").
- **A material list per scene** (also at the top of `build.ts`): 4-6 materials, each a different photo texture with its
  normal/ARM maps (`photo()`, `scripts/polyhaven.py tex`), `mottle` on every large surface so no ground or wall is one
  flat colour. Mid-scale construction before small detail: trim, frames, supports, seams, then chips and pebbles.
- **Photo skies, never the painted gradient** (user 2026-11-21: "sky looks so low quality and does not blend in"):
  `photoSky(preset, id, { exposure, tint, yaw })` (kit `sky.ts`) with a Poly Haven pure-sky panorama
  (`python scripts/polyhaven.py sky <id>_puresky`; ~60 ids cover dawn, day, overcast, dusk and night). It sets fog,
  horizon and haze to the photo's own graded horizon colour so the world melts into it, and returns `key`: the photo's
  brightest spot (sun or moon), which is the scene's key light direction. Night: `kloppenheim_07_puresky` at
  exposure ~.3, tint `#bccbe8` (visual-ref9's navy cloud cover, stars). `yaw` turns the sky (and the key) to suit the
  shots; put the sun or moon where it rims the characters or makes a glint path on water.
- **Water moves and is never smooth** (user 2026-11-21: "water looks way too smooth"): `water()` + `setWater(mesh, F)`
  (kit `build/water.ts`): 18 frame-driven wave trains from swell to fine chop, the photo sky mirrored in by Fresnel,
  lights broken into dancing streaks, a moon/sun glitter path. `shoreFoam()` + `setShoreFoam(g, F, z, lap)` lays the
  wash at the waterline; move the sea level a few cm per wave (`lap`) on a sloped beach so the waterline runs up and
  drains, with a glossy wet-sand band above it.
- **Fire lives** (kit `fire.tsx`): `Flames` (noise tongues, never glowing cones), `Embers` (+ `burst` sparks on an
  impact frame), `Smoke` (+ `puffAt`); drive the fire's point light from the same flicker and flare.
- **Clothes look made**: besides the pattern and the signature accessory, each speaking role gets one construction
  detail that reads at phone size (no chest pocket: user 2026-11-21): `seams` (side seams + hem band), `campCollar`, `belt`, `overalls`
  (kit `wardrobe.ts`). Never a plain colour fill.
- **Story props get a close beat and an effect**: each story-critical prop has one insert, and its action leaves a
  physical trace (dust, debris, a dent, the light it throws or blocks, a reaction on the nearest face).
- **Wides act too**: a crowd reshuffles, lights sweep, flags move, someone crosses. A wide held 2 s with nothing moving
  fails "Static hold" (moon A2, the hill crowd).
- Test new kit look work on `LookTestR27` (`src/videos/_look-test-r27`), never on an episode.

## Look values (measured from the references; R24 notes win where they differ)
Full measurements: `docs/style/REFERENCE_NOTES.md`. **Superseded where they conflict by "Current style" at the top**:
the world is realistic (R25-R27: photo materials and skies, physical light), not the old hand-inked painted world; the
painted sky colours below apply only when no photo sky fits, and then only as the grade's palette.

- **Colour script**: every scene gets one strong time-of-day palette and keeps it:
  - day: cobalt sky `#2f62d8` -> pale horizon `#cfe0f5`, warm sun, fog = horizon colour.
  - golden/dusk: sky pink `#f2a6c8` -> violet `#7b6fd6` -> blue `#3f5fd8` at the top; peach rim light; violet-blue
    shadows (never brown).
  - night: deep blue ambient `#1d2a8c` -> `#3646c4`, snow/ground lit blue `#6f86e8`; warm practicals (lamps, candles,
    windows `#ffb35c`) as HDR emissives with bloom.
  - interior: warm wood and lamplight `#ffc27a`; if it is night outside, blue window light crosses the room.
  - desert/heat: orange-red rock `#e0552a`/`#f28a2f` under cobalt sky.
- **Targets** (measured): luma median .39-.51 (darker than "storybook"), non-ink p5 .08-.17 (deep but not crushed),
  lit chroma C* p90 57-68 (saturated), saturation median .50-.58.
- **Light**: key light + one practical per scene; bloom threshold 1.0, intensity .6 only on emissives; particles
  (snow, dust, embers, rain) in most outdoor shots.
  - **Glows, no volumetrics** (`kit/toon/glow.ts`): every lamp, lit window, shop front and fire gets a soft painted
    corona (`practicalGlows`, added by the street and supermarket builders; off by day unless the practical has its
    own colour, like an exit sign). `glowSprite(pos, color, size, strength)` for any other source (a phone screen, a
    candle, a magic item). Light shafts only as R20 `lightShafts()` (glow.ts): faint (strength .1-.25), wide, painted,
    where a strong light enters dusty or smoky air (backlit wides, a window into a dark room); never hard spotlight cones.
  - **R20 direction (2026-11-15, `docs/style/VISUAL_DIRECTION.md`, study of visual-ref1-6):** the low sun RAKES across
    the set (`LIGHTS.sunset`, az -32 / el 26), never from straight behind the street, so cast shadows break the ground
    into warm/cool shapes; diorama haze only past ~24 m; wet/polished floors get `gloss` (`StreetOpts.gloss`); head
    turns use `pose.look` (the face slides); listeners run `alive()`; expression changes go through `exprAt()`;
    thrown things use `toss()` (kit/toon/physics.ts); hero props in macros get `spec` .6-.9 and detail. Worked example:
    `src/videos/_visual-test` (`VisualTest`). Colour targets (R24, ref8/9): sat .36-.46, colourfulness .17-.30 (the grade
    scales every preset's saturation by `SAT_K` .87); day luma ~.5, night ~.26 with warm practical pools.
  - **R25 realistic world (user 2026-11-21: "a 2d character in a realistic 3d world just like the references"):**
    lookdev `real` is the default (kit/toon/lookdev.ts). The world shader (shade.ts `REAL`) does soft Lambert light
    with soft shadows, sky/ground ambient, roughness highlights with Fresnel, relief from photo textures, and practicals
    that pool (world only; cards keep the glare-calibrated light). World ink is off; clouds are a soft layer.
    - **Materials are CC0 photo textures**: `photo("<name>")` (kit build/photo.ts) from `public/tex/`, tinted with
      `color`, `rough` per surface (sand .95, wood .75, metal .45, wet .2). New texture: `python scripts/polyhaven.py
      tex <id>` (1K diffuse + normal + ARM, never downloads twice), then `python scripts/tex_level.py`, credit it in
      `assets/CREDITS.md`. R26: the normal and ARM maps load with the diffuse automatically (`public/tex/maps.json`);
      without them relief comes from the diffuse's brightness, which turned sand into TV static (R25). Painted canvas
      textures get no relief (they glitter); kit `MAT.wood/darkWood/metal` are photos.
    - **Props are CC0 models, not boxes** (R26: the refs' barrels, stools, crates and lanterns are modelled; our Kit
      boxes read as blocks): `python scripts/polyhaven.py model <id>`, then `model("<id>", { part, height, tint, glow,
      collider })` (kit build/models.ts). Check the Poly Haven catalogue first (api.polyhaven.com/assets?t=models; the
      beach set has crates, barrels, buckets, lanterns, a lifebuoy, floodlights, a picnic table, shells). Collections
      (`flood_lights`, `wooden_barrels_01`) take a `part` name prefix. No primitive props (user 2026-11-24, "Current
      style" at the top): what no library has is built from realistic parts with photo materials.
    - **Sky**: a vertical frame sees the dome from the horizon to ~25 deg, so `skyMid` is the sky colour; a blue dusk
      over a warm horizon needs `horizonBand` ~.14 (a wide band averages blue and peach to mauve) and the `sunset`
      grade (the `golden` grade's x2.08 exposure washes a dusk milky).
    - **Model the sets**: houses get plinths, corner boards, framed windows with sills, framed doors with steps, tiled
      roofs with overhang and chimneys (moon-disappeared-tonight `house()`); open ground gets `grassTufts`.
    - **Night** (ref9): dim cool key, deep blue ambient, warmth only in practical pools (add `noGlow` fill lights under
      string bulbs), blue haze up to .6 on far hills. Day keeps the ref8 sun.
    - Worked example: `src/videos/moon-disappeared-tonight` (R25), side-by-sides in `out/r25/`.
  - **R24 world (visual-ref8/9):** the world is softly lit 3D with no drawn outlines (world ink is a faint accent:
    `INK.opacity` .45, 2.6 px near); depth and finish come from AO, raking light, cool aerial haze and dense clutter.
    Open ground is never one flat fill: scatter `grassTufts` (kit build/ground.ts) along paths, walls and field edges
    (dark, mid and sun-bleached colours), plus `debris`/`scraps`; interiors carry patterned rugs, hanging lamps, shelves
    of small props, wall boards with text. Night: moon disc + glow, blue cloud sky, warm fire/torch pools on the ground.
  - **The sun**: `sunDisc(radius)` (hot pale centre, gold limb, rim and corona; SKY layer, billboard it with
    `lookAt`). Put it where the key light comes from (`SUN = SUN_POS - camera`, normalised), so shadows and any
    light gag agree with the sun the viewer sees.
  - **Sky and horizon**: day skies carry painted clouds (`LIGHTS.day.clouds`); presets with a `backdrop` get hills
    behind both rows of houses as well as past the street end, so cross-street shots never look at an empty plain.
  - **Set dressing**: every wide shows life in the yard or street (trees, beds, gnomes, hoses, bins, washing).
    Real sizes: doors 2.0 m, garden sheds 2.3-2.75 m walls, ladders for anyone working above 2 m.
- **Vignette**: corner/centre luma .85 by default, .60 at night or in dark interiors. `measure.py` checks the
  corner/centre ratio by lighting (`--light`): dusk, golden, night and interior 0.75-0.88; **day exteriors 1.1-1.4**
  (mean over the sampled frames). Sky and sunlit ground fill a day frame's corners, so the ratio stays above 1
  whatever the vignette does. Measured on `_pipeline-test` with the day grade vignette at .14.
- **Ink** (`ink.ts`): near-black brown `#1c1210`, 2.6 px near -> 1.6 px far at 1080x1920, 45 % opacity (R24), on
  silhouettes, depth jumps and creases. Character cards are on `NOINK` and carry their own full-strength outline.
- **Paint** (`paint.ts`): visible brush strokes and grain in every fill (wood grain, plaster mottling, grass
  strokes, snow sparkle), seams painted as dark tints; never flat untextured fills on big surfaces.
- **Lens** (`DOF.closeup/medium`): background clearly soft in close-ups (11 px at 1080) and mediums (9 px), wides
  and establishing shots sharp (0); foreground framing props blur 20-22 px. Focus on the speaking or reacting
  character's eyes.
- **Post**: ink -> lens -> camera motion blur -> bloom + warm halation -> NEUTRAL tone map -> grade -> vignette +
  top darkening -> film grain (.022); MSAA 4.
- **Light and air** (2026-11-13, ref13): every night/interior shot has a visible practical with falloff (pools, dark
  corners and ceilings), dust motes (`Dust`) drifting in its light, and one warm/cool opposite pair in the frame.
- **Inserts** (ref14): about one full-frame 2D explainer per video (`Insert`: x-ray, thermal, map), a hard cut on
  the mechanism or body beat.
- **Characters**: see "Character style" above (it supersedes LOOK_SPEC section 1 where they differ).
- **Camera** (`story.ts`, measured):
  - hold, then move fast (R11/R13, 2026-11-13; replaces "never still"): real still holds on dialogue and reaction
    beats (still frames 10-20 %, holds up to 60 f), then quick 10-15 f reframes. A constant slow creep reads flat.
  - framing: mediums crop at the waist, MCU at the chest (`SHOT_SIZE`), camera slightly below the look point;
    full-length singles at most ~30 % of shots; stage characters at different depths and overlap them.
  - drift speed at 1080 wide: moves 10-50 px/f (refs p95 44-49), fast follows up to ~60 px/f.
  - every move is a symmetric ease-in-out glide (~10 f in, ~10 f out, ~23 f total, peak 21-24 px/f at 1080);
    never a 3-frame snap. Whips (< 1 per minute) always carry strong directional motion blur.
  - push-in on ~65 % of screen time (0.2-0.6 %/f; up to 2.5 %/f on punch words), pull-out ~25 %.
  - arcs/orbits around characters with slow banking (roll 0.2-1 deg/f, max 5 deg).
  - fast moves are continuous follows (tilt down with a falling object, tilt up to reveal sky), smootherstep eased,
    with motion blur when faster than 40 px/f.
  - impact kicks: flip sign every frame, decay over 7 f.
  - a new shot every 2-5 s (R5-R7 run ~2-3 s in their builds and payoffs, R1-R4 3-5 s); foreground framing props
    in ~1/3 of shots; low angles for authority, top-down for maps and graves, POV for "you".
- **Transitions** (`XFADE`):
  - default: a 10 f crossfade between two moving shots; the caption switches on its word mid-dissolve.
  - hard cut: punch close-ups, reaction inserts, object close-ups.
  - big jump in place or era: fly-through or fast pull-out with motion-blur streaks, or a white-wash dissolve.

### Current kit values
- **Light presets** (`lights.ts`, sun camera-relative and frozen per shot):
  - day: az 75 / el 48, lit [1.58,1.5,1.33], shade [.30,.29,.36], lift [.05,.06,.11] (cool tint only in shade), sky
    top `#3e7fd2` -> horizon `#b8d0ec`, fog = horizon, 25->300 m, uSat 1.08, ~15 % blue haze past 60 m.
  - golden: az 6 / el 7 (backlit low sun), key toward `#FFB36B` x1.5, violet-blue shade (facade ~ `#444380`), sky
    `#ffc47c` -> `#8a6f8a`, peach fog only past 50 m, sun disc `#ffcf9e` + bloom, contact blobs + real card shadows.
  - dusk (`LIGHTS.dusk`, ToonTest): az -28 / el 30 key, lit [1.62,1.12,.74], shade [.5,.55,.8] (~45 % of lit), lift
    ~0, sky `#6468c0` -> `#c48ad2` -> horizon `#ffb39a` + painted clouds, fog = horizon past 40 m, shadow maps on,
    lamps/lit windows as HDR emissives with warm light pools (`setLamps`), drifting dust (`Dust`).
  - night (add for scenarios): moon-blue key, warm practical lights (lamps, fires, shop signs) as HDR emissives.
- **Albedos** (`paint.ts`/`build.ts`): muted, never neon. Buildings with plinth, cornice, sills, door step; warm grey/
  beige stone; wood with near-black seams; metal dark and desaturated. Never lemon, never lavender lit faces.
- **Ink** (`ink.ts`): `#1c1210`, 2.6 px near (6 m) -> 1.6 px far (90 m) at 1080x1920, opacity .45 (R24); creases from 35 deg at 0.7x
  width; depth jumps from 1 %; opacity 0.8 at 90 m (outlines.md: far cores lighten). Concave contacts (an object
  standing on the ground) at 0.6x width and the preset's `contactInk` (0.6 outdoors, 0 in interiors: no wall/floor
  lines indoors); no line on the horizon. Character cards are on `NOINK` and carry their own ink.
- **Character ink**: thick-thin 3.4:1 (`INK_K` .55; ref2/ref11 measured 3-4), weight per build (`Build.ink`: stout
  1.12, kid .86) x a seeded +-8 %, and a seeded hand-drawn pressure wobble (+-12 %) so no two outlines match. Its
  colour follows the light (`LightPreset.charInk`): warm `#2a1a14` by day (identity), plum at golden/dusk, navy at
  night; lamps lift it a little toward their colour.
- **Colour** (`python scripts/measure.py <png|mp4>`): luma .32-.50, C* p90 40-55, mean sat .30-.55, darks L* >= 14
  (2026-11-13: refs R11/R13/R14 measured C* p90 27-49; the old 57-68 read loud).
  Day median luma ~.57, non-ink p5 ~.23 (no crushed blacks), lit chroma C* p90 ~55. Golden shadows
  violet-blue, never brown.
- **Lens** (`dofAt`): cInf px at 1080: hook CU 15-16, close-ups 12-14, mediums 10-12, wides/aerials 0. Focus on the
  eyes of the front character. DOF on about 1/3 of screen time.
- **Post** (`Composer.tsx`, `POST`, `grade.ts`): grade per preset (sat ~1.15-1.38, vignette .22-.5, top .1-.3,
  grain .022, halation .35); bloom threshold 1.0, intensity .5, 6 levels, radius .6 (HDR emissives only); NEUTRAL
  tone map; grade last.
- **Characters** (motion): poses from `POSES` + any expression; 4-frame squash on reactions; walk bob 3-7 %, lean 1-7 deg, planted 0.8 m stride; blinks every 0.5-2.3 s lasting 4 f;
  tight contact shadow under the feet + sun-direction tail by day; golden rim light inner only, head/torso only.
- **Camera** (`kit/toon/camera.ts`: drift, pushIn, pullOut, arc, followTilt, reveal): hard cuts on big jumps;
  everything else a quick glide; holds are real holds (QA guard allows still runs up to 60 f; check with measure.py); rolls 4-5 deg; impact
  shakes flip sign every frame and decay over 7 f; foreground props in ~1/3 of shots.

## Kit-wide look work
One change at a time in `kit/toon/`, checked on `CharacterLineup` / `VisualTest` stills against `docs/style/r24/`
frames and `richness.py`; run the kit self-checks (`node kit/toon/<name>.test.mjs`) and `npx tsc --noEmit`.

## Gotchas
- **Dissolves fade over the real overlap**, never a fixed constant: `<Dissolve len={prevEnd - s.from}>`. The pilot faded
  over XF = 10 on 4-8 frame overlaps, so the new shot was part-transparent over black after the old one ended: a dark
  blink after every dissolve (f539 dropped to 6 % luma).
- **2D inserts** mounted outside the shot list go in `Plan.inserts` ([from, to]) so `plan.json` lists their cuts.
- **Hand-check `words.json`** against the waveform: Eleven v4's aligner can put a sentence-final word in the pause
  after it (pilot: "door.", "town." 0.26 s late). A word span at < -40 dB in the voice is the tell.
- **Disk**: every Remotion bundle copies `public/` into `%TEMP%\remotion-webpack-bundle-*` and never deletes it. Set
  `$env:TEMP`/`$env:TMP` to `C:\remotion-tmp` (or a bigger drive) before rendering, keep `public/` small, and when
  nothing is rendering delete old `remotion-webpack-bundle-*` and `puppeteer_dev_chrome_profile-*` folders there
  (ask the user first).
- In JS strings write `"C:/remotion-tmp"`, never `"C:\remotion-tmp"` (`\r` becomes a carriage return).
- Kenney nature-kit materials come out teal: recolour them by material name in `build.ts`.
- Cameras end up inside buildings: the sight-line culler removes anything blocking any camera ray.
- Ink in the same pass as DOF gets overwritten: ink is its own pass before the blur.
- Pixel-sized post parameters must scale with output height / 1920 (stills render at 0.5, finals at 1.333).
- Remotion writes a silent audio track: always mux with `-map 0:v:0 -map 1:a:0`.
- Sub-agents may not be able to write files: ask for a <=150-word final message and save it yourself to
  `out/<slug>/<n>/REPORT.md`.
- Scratch `.ts` files inside `out/` break `tsc`: name them `.txt`.
- 4 GB VRAM: if a render crashes or goes black, lower `--concurrency` to 1 before changing anything else.

## Readability traps (check every new prop and shot)
- **Held props sit in the drawn hand.** Place every held prop with `handWorld(look, pose, at, cam, hand)` (kit
  `cast.ts`; its origin is the grip point) and declare `hand: "left" | "right" | "both"` on the `MovingProp`
  ("none" for effects that only touch the body). The QA guard fails a held prop more than 12 cm from that hand or
  without a `hand`. Pick poses for the holding hand that keep big props off the face (crossed arms or a hand at the
  chin push a megaphone through the head card): see `MEGA` poses in the pilot's `story.ts`.
- **Nothing floats, nothing overlaps** (pilot defects 2026-11-14): piles are stacked from the floor up (`toyPile`
  builds columns; never give pile items random heights); a drawn hand prop (`prop: "can"`...) follows the lower hand
  when the hands are apart (kit figure.ts), so check it in any one-handed pose; crowds are pushed out of ground props
  automatically and off moving things you pass as `keepOff` (kit `Crowd`): pass the cart, vehicle or hero that moves
  through a crowd.
- **Never stack people in one line of sight.** Cards are flat: a character straight behind another vanishes (pilot:
  Dave behind you). Stage them apart on screen. QA guard "Cast overlap" fails a nearer card, or a held prop, that
  covers more than 25 % of another character's face.
- **Glows fade near the lens** (kit `glowSprite`, automatic): still keep cameras a few metres from lamps and
  floodlights. `video_qa.py` WASH flags washed-out runs (bright, no darks) such as a lens inside a halo.
- **Captions**: the outline is its own layer behind the letters (`Captions.tsx`); never put a text stroke on the
  letters themselves, it eats thin glyphs ("!" read as "?"). Check punctuation-heavy words (`boy!"`) in a still.
- **Effects scale with the shot**: size rings, trails and bursts for the lens that sees them (a telephoto turned
  1.8 m sound rings into bands across the frame).
- **Small props get a face or a readable detail** (eyes, a beak, ears, a label, wheels): bare boxes and spheres
  read as blocks, not toys or tools. Keep them light: 6-10 sphere segments, merged with `Kit`, and give a pile of
  small parts a single collision hull (`delete userData.parts`), or renders and the guard time out.
- A swing with one rope that disappears behind the character reads as a hanging: two ropes, wide plank, clear frame.
- Props closer than ~2 m to the lens become huge cut-off blobs; re-check props whenever a camera moves.
- A foreground object cut by the frame edge must still be recognisable, or remove it.
- Flags and symbols must be period- and place-correct, and must not accidentally match another country's flag.
- Painted signs lit from the side go grey and unreadable: give sign faces an unlit material.
- Rim light as an offset outer copy turns hats into picture frames: inner rim only.
- Railings at chest height cut through characters: raise the lens so rails cross legs, not torsos.
- Flat holds read as freezes in QA (frozen span >= 12 f): every hold needs a creeping push-in.
- A dissolve between two static shots looks like a slideshow: both sides of every crossfade must be moving.
- A caption over a face or a gag kills the joke: reframe so the action sits above y = 0.62 H or below 0.78 H.
- Anything that could read as graphic violence: cut away to a reaction or a sound instead.
