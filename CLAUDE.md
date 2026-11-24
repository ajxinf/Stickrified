# Stickrified — project instructions

Faceless channel **Stickrified** (YouTube Shorts, TikTok, Facebook Reels; long-form later). **Style: flat 2D cartoon characters in a realistic 3D world (photo textures, physical light, haze; lookdev `real`, user 2026-11-21); primary visual refs `assets/visual-ref8.mp4` + `visual-ref9.mp4` (user 2026-11-21; they win over older refs).** **Current style = R27-R28 (user 2026-11-21): photo skies, rippled water, photo materials everywhere, character v3 with fluid motion; every new episode starts from `src/videos/_look-test-r27` + `src/videos/_char-test` (skill "Current style").** Three pillars: survival "what if" scenarios, strange true history, and fictional "In this world..." stories. Entertainment first: comic exaggeration is welcome, but real facts in history videos stay true (see the skill's "Entertainment rules"). All narration in **second person ("you")**. Audience: US/UK/Canada, Gen Z + Millennials. English only.

**How to make a video: follow `.claude/skills/toon-world-short/SKILL.md`.** It holds the pipeline, look values, protagonist spec and gotchas. **Scripts (formulas, jokes, Eleven v4 tags, length): follow `.claude/skills/stickrified-script/SKILL.md`.** **QA (visual defects, before and after the render): follow `.claude/skills/video-qa/SKILL.md`.** No AI critics or verifier agents (removed 2026-11-21): the user reviews finished videos by eye. This file only holds the project-wide rules.

## Machine
Windows 11 laptop: i5-11400H, RTX 3050 4 GB VRAM, 16 GB RAM. Commands must work in PowerShell. Render with `--gl=angle` and `--concurrency=2` (user 2026-11-22: faster; the default in `scripts/render.mjs`; benchmark 2026-11-23: 1 and 2 tie, 3 and 4 are slower because the 4 GB VRAM is full. If a render crashes or goes black, retry with `--concurrency 1`). **Chrome must render on the RTX 3050, not the Intel UHD** (benchmark 2026-11-23: 6x faster at 2K; the iGPU's shared memory caused the OOM and "context loss" crashes): `scripts/remotion-api.mjs` sets the Windows per-app GPU preference for Remotion's Chrome on every run; check with `scripts/bench.mjs` (its `nvidia.util` must be > 0). `render.mjs` runs `scripts/free_ram.ps1` first (user: close everything unnecessary while rendering). Encoder stays libx264 crf 16 (NVENC measured no faster: encoding runs alongside rendering and costs ~7 %). Measure any render change with `node scripts/bench.mjs <label> ...` on the same segment before adopting it. The full-frame QA (layer 1) runs once per round: preflight runs it, the review stills and the render after it pass `--no-guard`. Set `$env:TEMP`/`$env:TMP` to `C:\remotion-tmp` before rendering.

## Stack
- Remotion + `@remotion/three` (React Three Fiber). Every motion (characters, camera, shaders) must be driven by `useCurrentFrame()`, never by clocks or `useFrame` time.
- ElevenLabs **Eleven v4** TTS (one narrator voice; each speaking character gets its own ElevenLabs voice for its dialogue lines, user 2026-11-17; audio tags only on beats). API key in `.env` as `ELEVENLABS_API_KEY` (never commit it).
- Assets: CC0 only (Kenney, Quaternius, similar); fonts may be SIL OFL 1.1 (approved 2026-11-14: Nunito for captions). Record each asset's source + license in `assets/CREDITS.md`.
- Sound: ElevenLabs sound effects and ambience beds (approved 2026-11-14; shared library `assets/sfx/library.json`), synthesized SFX, and background music from the user's library `assets/bgm/` (user 2026-11-16: pick the best fit per episode from `assets/bgm/library.json`; "In this world..." uses `in_this_world(default).mp3`), fitted as a seamless loop by `scripts/audio/bgm.py`. Stereo mix with a continuous scene bed under every shot. No other commercial music.
- Lip sync: on-screen characters move their mouths on the words they speak (`scripts/audio/mouth.py`, approved 2026-11-14).

## Pipeline (audio-first)
Script (`videos/<slug>/script.json`, the single source of truth; Claude drafts, the user edits) → voice + word timings → shot plan timed to words → world, cast, captions → sound → pre-render QA (`scripts/preflight.py`) → render, mux, QA. Details in the skill.

## Formats
- Shorts: 61–150 s (user 2026-11-22: was 61–90; more room for story and setup), 1080×1920 composition, 30 fps. **Final export 1080×1920** (user 2026-11-23: 1080p is the default final output, replacing the 2K master of 2026-11-21; its quality and QA are what count); the 720p preview is only for the user's defect review (floating objects, clipping) before the final render.
- Shorts: burned-in captions, at most 2 white words at a time, no pop; the `*key*` word is coloured: yellow in narration, the speaker's colour on dialogue (user request 2026-11-16; see skill). Long-form (later): 1920×1080, no burned captions (export .srt).

## Content rules
- Advertiser-friendly, evergreen. No graphic true crime; violence stays off-screen.
- True history: every script ships with `sources.md`; check claims before voiceover; keep invented details (dialogue, thoughts) vague.
- Every video gets its own world layout and shots (no reskinned templates). Protects against YouTube's inauthentic-content policy.
- Every description includes "Narration: AI voice".

## Repo layout
```
kit/toon/          shared toon look (world, lights, ink, paint, characters, post, captions)
src/videos/<slug>/ per-video compositions (story.ts, build.ts, roles.ts)
videos/<slug>/     script, sources, voice, audio
src/videos/_look-test-r27, _char-test   current-style starting points for new videos (R27-R28)
docs/STYLE.md      style bible + approved frames in docs/style/frames/
scripts/           tts, audio, stills, QA helpers
```
Rendered output (`out/`, `*.mp4`) is git-ignored. Finished episodes reach `Episodes/Episode_<N>_<Title>.mp4` only through `scripts/deliver.py` (gates: QA layers 1-3 and richness; user rule 2026-11-17 after episode 3 shipped with defects) (title words joined by underscores, from the chosen title in PUBLISH.md; user request 2026-11-16) so the user never digs through `out/`; after the copy it deletes that episode's media in `out/<slug>/` (keeps *.md/*.json) and empties `C:\remotion-tmp` (user 2026-11-23). Episode 1 = zombie-supermarket-30-days, 2 = trapped-in-this-world, 3 = gta-started-as-race-n-chase, 4 = moon-disappeared-tonight, 5 = promise-flowers, 6 = antwerp-diamond-heist, 7 = sun-never-sets.

## Current phase
Kit built, episodes in production (7 delivered). New kit look work follows the R26 study of the seven primary refs and the R27 outside comparison (docs/style/VISUAL_DIRECTION.md "R26", "R27"; future episodes only, never re-render a finished one).

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- When graphify-out/graph.json exists, run `graphify query "<question>"` before your first grep, search or source-file read for a codebase question, and put this rule in every subagent prompt that explores code. Read raw files only for lines the graph or an earlier read already located. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
- A committed graphify-out/graph.json is rewritten whole on every build, so a large diff to it in a pull request is expected. Do not flag it as churn or suggest skipping the graph rebuild or its hooks.
