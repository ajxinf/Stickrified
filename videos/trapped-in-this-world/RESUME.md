# trapped-in-this-world: where we stopped (2026-11-16)

**Status (cut 3 + R21 visuals):** the user preferred the cut-3 story (the narrator's caption sign, the word jar,
FREE) over the cut-4 rewrite (Mia and the mirrored sign). Cut 3 was restored (code from Claude Code file history,
script/voice/audio from the session backup) and given the new visuals:
- R21 body acting: every role through kit `perform()` (the freeze stays still: `st(..., 0)`), pose changes with
  anticipation/overshoot/overlap (`movePose`/`moveCurve`), speed lines on the door splat and on "free".
- R21b look ("looks cheap next to the refs"): kit DOF 4-5 px and bloom .32, cooler sunset shade and fog, bunting
  between the lamp heads, looser face shots (C4, L1b, M2, P1). `scripts/richness.py` on stills: crisp 13.6, edges .127,
  hue entropy 2.6, warm .78 (refs 8.5-21.6 / .05-.09 / 2.0-2.7 / <= .77).
Cut 4 (the Mia story) is in the session scratchpad `ep2_cut4`, not in the repo.

- Final: `out/trapped-in-this-world/final.mp4` (77.6 s, 1080x1920). (`out/` is git-ignored.)

## Files
- Script / voice: `script.json` (27 lines), `SCRIPT.md`, `voice/` (words.json, mouth.json). Line timings: `python scripts/line_times.py videos/trapped-in-this-world`.
- Sound: `audio/events.json` (word-cued), stems + `mix.wav` (music: `in_this_world(default).mp3` looped by bgm.py).
- Picture: `src/videos/trapped-in-this-world/` — `story.ts` (beats `B`, cast, 36 shots), `world.ts` (street, chalk X,
  sign, word jar, Gary, pigeons, bunting; also the unused cut-4 room/Mia/pigeon pieces), `meta.tsx`, `Video.tsx`.
  Composition id: `TrappedInThisWorld`.
- Publish: `PUBLISH.md` (rewrite the description for the cut-3 story before publishing).

## Commands (PowerShell, set `$env:TEMP='C:\remotion-tmp'; $env:TMP='C:\remotion-tmp'` first)
- Stills: `node scripts/stills.mjs TrappedInThisWorld out/trapped-in-this-world/x_ 300,900 0.35 --draft`
- Render (~25 min): `node scripts/render.mjs TrappedInThisWorld out/trapped-in-this-world/video.mp4`
- Mux: `npx remotion ffmpeg -y -i out/trapped-in-this-world/video.mp4 -i videos/trapped-in-this-world/audio/mix.wav -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -b:a 320k out/trapped-in-this-world/final.mp4`
- Look check: `python scripts/richness.py out/trapped-in-this-world/final.mp4`

## Next
1. Take the user's notes.
2. Run the `video-qa` skill (the critic review was removed 2026-11-21; the user reviews by eye).
3. Confirm the music licence (assets/CREDITS.md), publish, log time, mark the backlog.
