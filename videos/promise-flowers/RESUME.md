# promise-flowers: resume here (next session)

Episode 5, "In this world, every promise grows a flower out of your skin." Stopped 2026-11-22 by the user mid-QA.

## Where it stands
- **Script**: approved (draft 2, 347 words). `script.json`, `SCRIPT.md`. Titles/description drafted in `PUBLISH.md`.
- **Voice**: done, 125.2 s, all lines pass `line_loudness.py`. `voice/voice.wav`, `words.json`, `mouth.json`.
- **Build** (`src/videos/promise-flowers/`): `world.ts` (town + home sets, props), `cast.ts` (looks), `scene.tsx`
  (light presets, Town/Home, bees/fly/stink sprites), `story.ts` (63 shots), `Video.tsx` (composition
  `PromiseFlowers`), `LookTest.tsx` (`PromiseLookTest`). Kit additions: `kit/toon/flowers.ts` (bud/bloom/rot on
  cards), `turnHair` in `kit/toon/extras.ts`.
- **Look**: warmed up per user note ("dull and lifeless"): low warm morning sun (late-afternoon photo sky turned east),
  bunting, sunlit dust; home window sun patch + shafts; golden ending. Stills of the new look:
  `out/promise-flowers/look/w.jpg`.
- **Sound**: done and committed. 52 cues, 6 beds, music loop (in_this_world, seam .987), `audio/mix.wav` at -14.0 LUFS,
  voice gap 24.1 dB. Redo `sfx_gen.py` + `mix.py` only if shot timing changes.
- **QA**: round 1 = 210 failures, round 2 = 90 (all fixed in code since). Round 3 was started and **stopped by the
  user before it finished**: `out/promise-flowers/layer1.md` is still round 2's report.

## Tomorrow, in order
1. **QA round 3** (one full-frame QA per round, user rule):
   `$env:TEMP='C:\remotion-tmp'; $env:TMP='C:\remotion-tmp'; python scripts/preflight.py PromiseFlowers promise-flowers --draft`
   (~45-60 min: layer 1 once, then the review stills with `--no-guard`). Run it in the background.
2. Read `out/promise-flowers/layer1.md` and every sheet `out/promise-flowers/pre/P*.jpg` + `INDEX.md` framing flags.
   Fix what remains in code. Things to eyeball specifically:
   - the debate crowd (checkerboard seating via `FILL` in story.ts): no face behind a face; no empty chairs in shot;
   - Q3 (side-aisle ride) and S1 (stage-right) after their re-staging;
   - notebook inserts K2/T1 (page upright, whole, above the captions; T1 page flips summer -> DEREK - NEVER);
   - flowers readable at phone size (rotten ones on you, Derek's coat sliding off V1-V2, the nose flower U2-U3);
   - warmth: no frame dull or flat (user rule "never lifeless").
   If a fix needs another round, run preflight again (still once per round).
3. If shot timing changed: `python scripts/audio/sfx_gen.py videos/promise-flowers` then `python scripts/audio/mix.py videos/promise-flowers`.
4. **720p preview** for the user's defect review (render 1080 at concurrency 2, no second QA, then downscale):
   `node scripts/render.mjs PromiseFlowers out/promise-flowers/video_1080.mp4 1 --no-guard`
   `npx remotion ffmpeg -i out/promise-flowers/video_1080.mp4 -i videos/promise-flowers/audio/mix.wav -map 0:v:0 -map 1:a:0 -vf scale=720:1280 -c:v libx264 -crf 20 -c:a aac -b:a 192k out/promise-flowers/preview_720p.mp4`
   Send it to the user. If a concurrency-2 render crashes or goes black, retry with `--concurrency 1`.
5. After the user's notes: fix, then the **2K final** (`render.mjs ... 4/3`), QA layers 2-3 on the 2K file, richness,
   `scripts/deliver.py promise-flowers 5 "<chosen title>"`, TIMELOG, BACKLOG, commit + push.

## Rules changed this session (already in CLAUDE.md / skill / memory)
- Shorts 61-150 s, scripts 170-400 words at ~2.7 w/s.
- Render concurrency 2 (default in `render.mjs`); full-frame QA once per round (`--no-guard` on stills/render after it).
- Never lifeless: every scene gets warm light / atmosphere unless bleak on purpose.

## Known risks
- `public/models/island_tree_01` (64 MB) and `island_tree_02` (45 MB) are heavy; frame loads got a 120 s timeout.
  The 205 MB jacaranda was removed for timing out.
- Not yet checked by eye: the full set of shots after the round-2/3 fixes (only 6 look stills seen).
