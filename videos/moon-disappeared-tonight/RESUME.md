# moon-disappeared-tonight: where we stopped (2026-11-21, R26): DELIVERED as Episode 4 (2K)

Delivered: `Episodes/Episode_4_What_If_the_Moon_Disappeared_Tonight.mp4` (1440x2560) with the user's approval over the
richness gate (`videos/moon-disappeared-tonight/DELIVERY.md`), after fixing the user's notes: floating houses at 0:06
and 1:13 (C1/T1 crowd stood under the hill), Brad's ring light on air at 1:08.

R26 preview: `out/moon-disappeared-tonight/preview_r26_720.mp4` (muxed from `video_r26_720.mp4` + `audio/mix.wav`).
R25 preview kept for comparison: `preview_720.mp4`. NOT approved: no 2K, no delivery until the user approves the look.
Look test stills: `out/r26/look6_000{0-3}.png`, sheet `docs/style/r26/look_r26_vs_refs.jpg`.

## Decisions (user, 2026-11-21)
- **30 fps stays** (brief said 24; all seven refs measured true 30p: docs/style/VISUAL_DIRECTION.md "R26").
- **Script R26 approved** and voiced (new ElevenLabs account/key): 252 words, 82.7 s.

## Done in R26 (uncommitted, on top of the earlier uncommitted work; nothing reverted)
- Voice: tts (runs per voice), line_loudness (line 17 lifted +1.7 dB), fix_word_drift (5 words), "But" #2 (line 19)
  moved by hand onto its speech (23 ms in silence; the drift fixer missed it), mouth.json.
- story.ts rebuilt on the new words (44 shots): dusk for lines 1-6 then night (time told by the sky), the dog howls at the
  empty moon outline (B1), new line-4 inserts DG1 (cobwebbed hot dog + spider) and DG2 ("SOLD TO BRAD / TOMORROW!" on the
  shack), O0 lantern time-lapse (`burnAt`: the candle and its light burn down, Mia nods off), T1 the hill crowd blinded
  by the floodlights ("nobody sees a thing"), SOLD OUT card on the popcorn at the end. No stamp cards anywhere.
- Sound: events.json re-cued to the new words (moon-click and stamp thump dropped, paper slap on "buys", button on the
  last "popcorn"); mix -14.0 LUFS / -1.3 dBTP, voice 24 dB over the bed, button 15.5 dB under the last word.
- QA layer 1 passes every frame (preflight pass 4 + the fixed-shot stills).
- 17 R25 pixel-QA flags traced (see VISUAL_DIRECTION R26 / earlier report): stamps gone, lights-off declared as `flash`,
  dissolves exported (`Plan.xfades`), CRUSH fixed (navy sky floor), JERK f2186 false positive (moth swarm).
- Kit: normal + ARM maps, `model()`, `scripts/polyhaven.py`, `horizonBand`, navy `moonlit` grade; signBoard lines squeeze
  to fit their board (`fillText` maxWidth); brighter, wider foam line so the retreating sea reads at night.

## 2K master (user 2026-11-21: "adjust the richness and other settings for 2k quality")
Re-rendered and re-delivered with 2K textures + the Composer sharpen: richness crisp 7.69 / edges .045 (refs >= 8.5 /
.050): still LOW, and only set dressing can close it (soft samples: B1 sky, J1/H3/DG1 macros, N1/N2/K1 dark sea,
M1/M2 bedroom). Details in out/moon-disappeared-tonight/QA.md.

## Next (biggest gaps left)
- QA done on the R26 render: `out/moon-disappeared-tonight/QA.md` (Verdict REVIEW: richness crisp 6.3 / edges .040 below
  the refs; layer 2 flags all explained). Waiting on the user's review of `preview_r26_720.mp4`.
- Set density at 3 depths (ref9); edges .042 vs refs >= .050. Stronger warm practical pools.
- Night tension shots L1-L3 are still sparse (dark sand + far sea); a lower angle with you two in frame would read better.
- Brad's fortress: modelled house + the real `flood_lights` model instead of the flat pink wall and box heads.
- Lawn chair as a model, not a card. Dusk sky still more violet than ref8.
