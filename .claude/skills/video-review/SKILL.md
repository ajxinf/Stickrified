---
name: video-review
description: Full review-and-fix pass on a Stickrified short by a four-member team - Technical QA (the video-qa skill), a Cold Viewer who has never seen the channel, a Regular Viewer who has seen every episode, and a Professional Content Manager (retention, platforms, monetization) - then consolidates their findings, fixes what can be fixed, re-reviews and writes REVIEW.md. Works on a script alone, a voiced cut or a rendered mp4. Use for "run the complete video review", "review the video", "critique this short", "is this ready to publish", "run the cold viewer critic", "run the critics without changes", or before delivering any video.
---

# Video review & optimization

Four independent modules judge one video, then the findings are merged, fixed and re-judged. Technical quality is
the `video-qa` skill's job. This skill adds whether the video is worth watching. It never replaces `video-qa`.

| Module | File | Question it answers |
|---|---|---|
| 1. Technical QA (Opus) | `.claude/skills/video-qa/SKILL.md` (unchanged) | Is anything broken? |
| 2. Cold Viewer | `critics/cold-viewer.md` | Would a stranger scrolling past stop and stay? |
| 3. Regular Viewer | `critics/regular-viewer.md` | Is this a good episode of *our* channel, and not a repeat? Runs only once the catalogue has a published episode (pilot: skipped, it repeated the Cold Viewer). |
| 4. Content Manager | `critics/content-manager.md` | Can it compete, grow the channel and earn money? |
| 5. Production Quality (Opus) | `critics/production-quality.md` + `docs/style/QUALITY_STANDARD.md` | Does it look as well made as the reference shorts? (10 categories, gate >= 8) |

Critics (Sonnet) all follow `critics/_protocol.md` (coverage, shot ledger, evidence, self-check). Fixes: `fixes.md`. Report: `report.md`. Authorities the critics judge against (they never invent their own):
`CLAUDE.md`, `docs/STYLE.md`, `docs/style/LOOK_SPEC.md`, the `stickrified-script` and `toon-world-short` skills.

## Modes (pick from the request)
| Request | Runs |
|---|---|
| "Run the complete video review" (default) | steps 1-8 |
| "Run the critics" / "without making changes" | steps 1-4 and the report, minus sections 6 and 8 |
| "Run Technical QA only" | the `video-qa` skill, then report section 1 |
| "Run the Cold Viewer / Regular Viewer / Content Manager only" | steps 1 and 3 for that critic, report section for it |

## Steps
1. **Evidence pack.** `python scripts/review_pack.py <slug>` writes `out/<slug>/review/pack.md`: which assets
   exist, the review stage (script only / voiced / rendered), a line-by-line timeline (time, shots, gag, text,
   sfx), pacing numbers and the channel catalogue. If `final.mp4` exists but `out/<slug>/qa/frames/` does not, run
   `python scripts/frames.py out/<slug>/final.mp4 out/<slug>/shots.json videos/<slug>` so critics see exact frames
   (QA sheets for the Opus checks, phone sheets for the critics: protocol 1). **Re-review (round 2+):** add
   `--prev out/<slug>/review/prev_final.mp4` so it writes `CHANGED.md`; every agent then opens only the changed
   shots plus the previous round's open items (protocol 1). After a round's reports are written, copy
   `final.mp4` to `out/<slug>/review/prev_final.mp4`: that render is the next round's baseline.
2. **Technical QA.** Rendered video: run the `video-qa` skill as written (it is module 1, reuse its outputs:
   `layer1.md`, `out/qa/<name>/report.md`, `QA.md`). Layer 3's eye pass is a fresh agent on **Opus** (pass
   `model: "opus"`; user rule 2026-11-14) that reads all sheets, pulls frames of any insert that is on no sheet
   straight from `final.mp4`, re-checks every open item from the previous round's findings (fixed / still there,
   with frames), explains or fails each layer-2 flag, and writes `r<N>-qa-layer3.md`. Script only: run
   `python .claude/skills/stickrified-script/check_script.py videos/<slug>/script.json` instead and say QA layers
   1-3 were not possible. Score: see "Scores".
2b. **Production Quality** (module 5): a fresh agent on **Opus** (pass `model: "opus"`) with
   `critics/_protocol.md`, `critics/production-quality.md`, `QUALITY_STANDARD.md`, the frame sheets and
   `python scripts/ref_compare.py assets/video-standard.mp4 out/<slug>/final.mp4 out/<slug>/review/r<N>/metrics.json`.
   It writes `r<N>-production-quality.md`. Runs in parallel with step 3.
3. **The critics, independently** (Cold Viewer and Content Manager; plus the Regular Viewer once an episode is published). Each critic is a fresh agent on the latest **Sonnet** (pass
   `model: "sonnet"`; user rule 2026-11-14: critics never run on Opus) given ONLY: `critics/_protocol.md`, its
   critic file, `pack.md`, the paths of the assets marked present, and the authorities above. The prompt repeats
   the protocol's coverage rule ("open every sheet in order and start with the coverage line"): Sonnet samples
   otherwise (round 2: 14-24 of 75 sheets). No critic sees another's report or any earlier score. Run them
   in parallel. Each writes `out/<slug>/review/r<N>/r<N>-<critic>.md` in the format its file sets. A report whose
   coverage line shows sampling, or with problems lacking frames, is sent back once to the same agent. (If
   agents are unavailable, run them one at a time yourself and write each report before reading the next critic
   file.)
4. **Consolidate** (you, not a critic) into `out/<slug>/review/r<N>-findings.md`: one row per problem, merged
   across critics. Columns: id, severity, critics who raised it, evidence (time / frame / line / shot), fix, owner
   file. Severity:
   - **CRITICAL**: confusing story, weak or misleading opening, wrong or missing picture for the narration, major
     pacing hole, technical defect, policy or copyright risk.
   - **HIGH**: a dull stretch, weak visual storytelling, narration the picture already says, predictable turn,
     weak ending.
   - **MEDIUM**: better angle, composition, transition, SFX or phrasing.
   - **LOW**: polish.
   A problem raised by 2+ critics moves up one level. **Disagreements**: write the disagreement, each side's
   reason, and a decision that serves the most viewers without hurting the others (keep the information, cut the
   words). Technical correctness and platform compliance always win over entertainment.
5. **Fix.** Work down the list by severity with `fixes.md`. Every change names the finding id it fixes. Do not
   touch what no finding names.
6. **Re-review.** Rebuild what the fixes changed (fixes.md "Rebuild chain"), regenerate the pack and frames, then
   run step 2 and step 3 again with fresh agents on the revised material (round N+1). Critics still never see
   earlier scores. Check: each finding resolved? new problems? story coherent? picture still on the words? identity
   intact?
7. **Stop** when all CRITICAL are fixed, every HIGH is fixed or documented with a reason, nothing major remains in
   QA, and each critic's verdict is publishable (or the disagreement is documented). Stop after round 3 regardless:
   list the rest under Remaining issues. Never polish LOW items into another round.
8. **Report.** Write `videos/<slug>/REVIEW.md` from `report.md` (committed; `out/` is git-ignored), commit
   (`<slug>: review round N`), and give the user the decision line plus the before/after table.

## Production quality gate (module 5, user rule 2026-11-15)
A video is finished only when module 5 scores **every one of the 10 categories >= 8** and no automatic-fail item is
present (`QUALITY_STANDARD.md` "Scoring"). Rendering, technical correctness and visual quality are three separate
things: a clean QA pass does not pass this gate. Scores come from the rendered frames, never from what the code is
meant to do. If a category cannot reach 8 because of a real technical limit, the report names the limit and the best
practical alternative; it never rounds the score up.

## Scores
Every score is an integer /10 with a one-line reason tied to evidence. Anchors (all critics):
- 9-10: as strong as the best reference shorts (`docs/style/REFERENCE_NOTES.md`) on this axis.
- 7-8: publishable, clear weaknesses named. 5-6: a viewer notices the problem. <=4: the problem loses most viewers.
Technical QA score: 10 = layer 1 passes, layer 2 has no unexplained flags, layer 3 nothing above minor. Minus 1 per
unexplained layer 2 flag cluster or minor layer 3 item (max -3), minus 3 per major item; a layer 1 failure caps it
at 4. Script-only reviews give no QA score ("n/a").

## Honesty rules (every module)
- Cite only what you opened. `pack.md` lists what exists; an asset marked missing is "not reviewed", never guessed.
- **Nobody hears the audio.** Audio judgments come from `words.json` timings, `events.json`/`cues.md`,
  `loudness.json` and the tag clips; say so in the audio lines.
- Watching = reading frame sheets and key frames (`qa/frames/`), never playback, never a summary.
- **Before calling something missing, open every sheet of that shot** (the `S*`/`P*` sheets INDEX.md lists for its frames). Pilot round 1: two critics
  read only B25_01 and called Chad's shock and toothbrush missing; both land on "up" in B25_02. In consolidation,
  the lead re-checks every "missing" claim from a critic that sampled sheets.
- A prompt or plan edit is not a changed video: footage changes only after the re-render, and re-review reads the
  new render.
- No analytics in the repo means performance lines are predictions from what is on screen, labelled as such.
- Be harsh. "Matches our format" is not praise. A technically clean video can still be boring.
