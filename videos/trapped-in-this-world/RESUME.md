# trapped-in-this-world: where we stopped (2026-11-16)

**Status:** first cut produced and sent to the user. Waiting for their notes. Not reviewed by the critic team yet.

- Final: `out/trapped-in-this-world/final.mp4` (69.5 s, 1080x1920, -14.0 LUFS, -1.3 dBTP). Share copy: `final_share.mp4`.
  (`out/` is git-ignored; re-create with the commands below.)
- QA layer 1 (scene guard): clean. Pixel QA (`scripts/video_qa.py`): only the planned flashes (f214 stamp, f1831 shatter
  on "free", f2018-2035 flash into the next video).

## Files
- Script / voice: `script.json`, `SCRIPT.md`, `voice/` (words.json, mouth.json). Line timings: `python scripts/line_times.py videos/trapped-in-this-world`.
- Sound: `audio/events.json` (word-cued), `audio/cues.md`, stems + `mix.wav`. New library effects in `assets/sfx/library.json`.
- Picture: `src/videos/trapped-in-this-world/` — `story.ts` (beats `B`, cast, 30 shots), `world.ts` (sets, sign, jar,
  Gary, pigeons), `meta.tsx` (progress bar, frame edge, grab word, tiles, shatter, caption gate), `Video.tsx`.
  Composition id: `TrappedInThisWorld`.
- Publish: `PUBLISH.md` (titles, description with "Narration: AI voice").

## Commands (PowerShell, set `$env:TEMP='C:\remotion-tmp'; $env:TMP='C:\remotion-tmp'` first)
- Stills: `node scripts/stills.mjs TrappedInThisWorld out/trapped-in-this-world/x_ 300,900 0.35 --draft`
- Render (~20 min): `node scripts/render.mjs TrappedInThisWorld out/trapped-in-this-world/video.mp4`
- Mux: `npx remotion ffmpeg -y -i out/trapped-in-this-world/video.mp4 -i videos/trapped-in-this-world/audio/mix.wav -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -b:a 320k out/trapped-in-this-world/final.mp4`
- Sound rebuild after timing changes: `python scripts/audio/sfx_gen.py videos/trapped-in-this-world; python scripts/audio/music.py videos/trapped-in-this-world; python scripts/audio/mix.py videos/trapped-in-this-world`

## Next
1. Apply the user's notes on the cut.
2. Run the `video-review` skill (critics on Sonnet, QA + production review on Opus).
3. Publish (PUBLISH.md), log minutes in `videos/TIMELOG.md`, mark the topic in `videos/BACKLOG.md`.

## Known soft spots (from my own review)
- Rewind and the climax caption are 2D overlays: readable but flatter than the world.
- Some shots hold one framing for 2-3 s; the tally wall shows you from behind for ~2 s.
