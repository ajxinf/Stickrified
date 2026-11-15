# zombie-supermarket-30-days: review round 4 (critics, no changes), 2026-11-15

Inputs: Cold Viewer + Content Manager (Sonnet, phone sheets, fresh) on the pass-4 render with the new mix;
Production Quality (Opus, module 5) and Technical QA reused from the same render's pixels an hour earlier
(`QUALITY_R14_P4.md`, `out/qa/final/report.md`; only the audio changed since). Regular Viewer skipped (no published episode).
Reports: `out/zombie-supermarket-30-days/review/r4/r4-cold-viewer.md`, `r4-content-manager.md`.

**Decision: not ready for production.** Agreed by all three: Production Quality FAIL (5-6 in every category, gate 8),
Content Manager REVISE ("not the channel-launch flagship"), Cold Viewer predicts most viewers leave by ~24 s.
Scores: Cold Viewer first impression 5, hook 5, clarity 7, entertainment 6, retention 6. Content Manager overall 6,
script 8, visual storytelling 5, competitiveness 5, monetization 8.

The script is not the problem (CM script 8, clarity 7). The surface is.

## Why it looks cheap (merged, ranked by how many reviewers raised it and the retention cost)
| # | Problem | Raised by | Evidence | Kind of fix |
|---|---|---|---|---|
| C1 | Characters don't act: one held pose, a face swap and a blink for 1.5-3 s; ~11 scripted gags not drawn | all 3 | f570-615, f645-690, f1440-1515, f2214-2288 | kit: an acting layer (pose-to-pose keys, overlap, anticipation) for every card |
| C2 | Subjects too small to read on a phone: horde as 2-3 px dots, the cart (the payoff) under 1/6 frame height, Chad tiny on "That guy is Chad" | all 3 | B03b f180-255, B28-B30 f1815-2040, B04 f298 | shot plan: medium/close on the key noun of every line |
| C3 | Empty or flat backgrounds: gradient skies, flat walls, untextured slot cover, no life in the holds | all 3 | f120-165, f720-810, f2355-2415, B06/B07/B14 | kit world density: set dressing + one moving element per hold |
| C4 | One blue-violet grade from 48 s to the end; frame 0 shows the contrast the rest lacks | CM, PQ | P05-P07, colourfulness .243 (< .25) | kit grade: one warm/cool pair per scene, practicals that light faces |
| C5 | Props and effects that don't read or leave the style: blob duck, hedgehog cart as pile + cone, flat donut smoke ring, neon x-ray HUD, un-inked glows | CV, PQ | f0000, f1080-1125, f1635, f1912-1966 | props: silhouette-first models; inked effects |
| C6 | Hold-and-hover camera on near-static frames | CV, PQ | B17 f1140-1230, f360-390 | shot plan |

Disagreement: the Cold Viewer says the x-ray insert does not read cheap; Production Quality says it is outside the
art direction. Decision: keep the idea, redraw it in the house style (both are satisfied).

## Story problems (not cheapness, but cost viewers)
- S1 Dave is named at 18.5 s but first on screen at 32.5 s (B09/B10 f570-705). All 3.
- S2 The opening is a hold, not a hook: frame 0 has no zombies or supermarket (f0-60). CV, CM. CM suggests a cold
  open on the zombies packing Chad's door (f870-915).
- S3 The predicted biggest drop is 16-24 s (exposition, no gag seen on the sheets). CM.
- S4 The shake-to-talk rule is told at 64 s, after the cart has already screamed. CM.
- S5 PUBLISH.md specs are stale (says -14.1 LUFS and rust captions; now -14.0 LUFS, white captions). CM.

Unverified (one critic, one frame): "blocky cut-out artifacts" round the cart at key f1759 (CM). Check before trusting.
