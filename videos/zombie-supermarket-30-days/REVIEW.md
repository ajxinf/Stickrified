# VIDEO REVIEW REPORT: zombie-supermarket-30-days (round 2, 2026-11-14)

Mode: **QA + critics, no changes** (sections 6 and 8's after-fix column not applicable). Stage reviewed: rendered
(`out/zombie-supermarket-30-days/final.mp4`, the round-1 fixes render, 1080x1920, 80.8 s, -14.1 LUFS / -1.1 dBFS).
Not reviewed: `sources.md` (scenario, none needed), analytics (none exist: every performance line is a prediction).
Nobody heard the audio: audio lines come from `words.json`, `cues.md` and `loudness.json`.
Critics ran on **Sonnet** for the first time (new rule). Raw reports: `out/zombie-supermarket-30-days/review/r2/`.
Coverage: QA layer 3 read all 75 sheets plus frames pulled from the mp4 for the x-ray insert (it is on no sheet).
Critics sampled: Cold Viewer 17 sheets, Content Manager about 14, Regular Viewer about 24. The lead re-checked every
"missing" claim on full sheets (B05_02, B08_01, B10_01, B10_03, B32_01, B32_02).
Round 1's full report is in git history (`e20c019`).

## 1. Technical QA: 4/10
- Layer 1 (scene guard, at render): passes; one intended item (closing row built to meet).
- Layer 2 (re-run on this render): 17 flags. All have a planned cause (whips, slot-slam kick, night shots,
  floodlight gag, x-ray insert, impact kick) except **LIGHTJUMP f2063**, which is the B30 crowd pop below.
- Layer 3 (all sheets):
  - **Fixed since round 1:**
    - The B30b->B31 dark blink.
    - The x-ray insert: now in Nunito, with a clear caption, clean leader lines and correct labels.
    - The B22 toy head now stays on its body.
    - Razor wire no longer cuts through Chad's shins or the megaphone.
    - The B07 eyes now sit inside the slot.
    - Captions no longer cover the gag in B10 and B33.
  - **Major (one defect cluster, -3):** B30/B30b crowd. Foreground zombies pop in at f2070->2071 and f2077->2078,
    and see-through ghost zombies show through f2131-2197 and the f2198 dissolve.
  - **Minor (cap -3):**
    - Heads stack on heads in B28, B30, B30b and B29 (f2007-2025, then the frame edge cuts the stack).
    - Captions sit on gag objects: generator face B23 f1630-1644, dino B21/B22, teddy B15, zombie chin B29.
    - Sky and wall banding in B13, B23, B31 and B33.
  - **Cosmetic:** QUACK card shrinks over the duck f12-18; B11 megaphone cut by the edge; B12 crowd snaps into grid
    rows; B26 handrail may end in your hip (unconfirmed).
- Audio (numbers, unheard):
  - The button now sits 16.5 dB under the voice (fixed; was 3.3).
  - New: `voice_music_gap_min_word_db` is **-5.6 on "roof."** (73-76 s). By this metric the music beats the voice on
    that word. Listen before trusting the number.

## 2. Cold Viewer: 5.8 avg
- Scores: first impression 6, hook 5, clarity 7, entertainment 6, retention 5.
- Strengths: clear rule at 5 s ("hunt by sound"), Chad is vivid, the pyjamas-and-toothbrush payoff (B25) lands on
  "up", and the fuel-can tally makes the setup and payoff easy to follow.
- Weaknesses: the 0-5 s opener is static and has no stakes; B07/B08 shows no slam gag; B09/B10 are dim, near-static
  standing shots; the B12 crowd is a tidy grid with no banging; the ending is guessable from about 0:27.
- Verdict: **swipes around 0:18-0:27** in the Dave/beans stretch; anyone who gets past it stays for the payoff.

## 3. Regular Viewer: 6.4 avg
- Scores: identity 7, originality 6, satisfaction 7, entertainment 6, returning retention 6.
- Looks like the channel. Off-spec: the B07 slot is flat grey with no ink, B13 has sky banding, and pyjama Chad
  (B25-B33) loses his cap and shades and reads as a new character, maybe even as you.
- All four scripts share one skeleton: a "You [odd action]" opener, a one-trait sidekick, a mocker, a hidden plan and
  a flip of the doubter.
- "Shaken toys talk" is explained at line 18, after the cart has already screamed.
- Verdict: mostly satisfied and would watch the next one, but wants a different story shape.

## 4. Professional Content Manager: 6.9 avg, decision **APPROVE WITH MINOR CHANGES**
- Scores: overall 7, entertainment 7, script 8, visual 6, retention 6, engagement 7, monetization 8,
  competitiveness 6.
- Best shots: B03b (horde crane), B25 (pyjamas on "up"), B30b (dog-tongue horde).
- Dead beats: B05 (Chad idle; the shop and shutters are named but never shown), B07 (empty slot), B10 (the pinky
  gag is invisible, dark and static), and B28 (murky; the cart is tiny).
- Predicted (no data): retention dips at 18-30 s, and Chad is good comment bait.
- Advertiser-friendly. CREDITS.md and cues.md were not opened by this critic.

## 5. Consolidated problems
Full table: `out/zombie-supermarket-30-days/review/r2/r2-findings.md` (same rows).

| id | severity | raised by | evidence | problem | fix / owner |
|---|---|---|---|---|---|
| C1 | CRITICAL | QA | f2070-2078, f2131-2198, LIGHTJUMP f2063 | B30/B30b crowd: foreground pops, ghost (semi-transparent) zombies | crowd placement + opacity in `story.ts` B30/B30b; crowd kit |
| C2 | CRITICAL | CM, CV (+lead) | B10 f629-711, every tile | "beans with your pinkies" never on screen: two idle figures, dim, 3.5 s | re-stage B10: close-up of pinky + can, lit foreground; `story.ts` |
| C3 | CRITICAL | CM, RV (+lead) | B05 f342-432 | "hardware store, electric steel shutters" never shown; Chad stands idle (no flex), same framing as B03 | B05 wide of the shop and shutters, flex on "megaphone"; `story.ts` |
| C4 | CRITICAL | RV, CM | line 18 at 63.7 s vs line 17 | "Shaken toys talk" is told after the cart screams; the only plant is the SHAKE ME boxes | plant a shake on day 1 (B01/B02 gag), cut "You see,"; `script.json`, `story.ts` |
| H1 | HIGH | CV, CM, RV | B07 f497-533, B08 f534-556 | The slot is flat grey and ink-free; the "hair blows back" slam gag isn't visible | ink/paint the slot, pull wider, animate hair on "only"; `story.ts` |
| H2 | HIGH | CV, CM | B09-B11, B28 | Dark purple/blue interiors look murky on a phone | lift exposure on interior shots, B28 toy close-up; kit/toon post, `story.ts` |
| H3 | HIGH | CV, RV | B25-B33 vs B03 | Pyjama Chad reads as a different character | keep the shades or cap (or nightcap with his logo); `roles.ts` |
| H4 | HIGH | CV (+lead) | B32 f2289-2345 | The "tiny wave" is unreadable (hand barely moves at the hip); Chad is not in the last-but-one shot | a clear wave toward the roof, Chad in frame; `story.ts` |
| H5 | HIGH | CV, QA | B12 f862-900 | Crowd snaps into grid rows; no banging on "bang" | loosen the grid, add a bang motion; `story.ts` |
| H6 | HIGH | lead (numbers) | `loudness.json` worst word "roof." -5.6 dB | Music may mask "roof." | listen; duck under that word; `mix.py` cue |
| H7 | HIGH | RV | catalogue | Same story skeleton in all queued scripts (the a554ff1 fix changed the spine, not the cast slots) | next scripts: vary the sidekick and doubter; `stickrified-script` |
| M1 | MEDIUM | QA, RV | B13, B23, B31, B33 | Sky/wall banding | soften posterise / add dither; kit/toon post |
| M2 | MEDIUM | QA | B15, B21, B22, B23, B29 | Captions over gag objects | move objects up or shift captions |
| M3 | MEDIUM | QA | B28, B29, B30, B30b | Heads stacked on heads | crowd keepOff spacing |
| M4 | MEDIUM | CM | line 8 | "Dave might be right" is a flat line | trim or give it a gag; `script.json` |
| M5 | MEDIUM | RV | B03 + B05, B14 f975-1019 | Long near-static holds | covered by C3; B14 add a beat |
| L1 | LOW | QA | f12-18, B11, B26 | QUACK card overlap, megaphone cut, handrail-in-hip (unconfirmed) | polish |
| L2 | LOW | CM | PUBLISH.md | Description has no follow bait | one line |

Disagreements:
- **The hook.** The Content Manager rates line 1 strong (two open questions). The Cold Viewer gives it 5/10 (static
  face, stakes only at 5 s). Decision: keep the line, which both agree is specific, and fix the static picture under
  it. The C4 shake plant in B01/B02 gives those seconds motion without adding words.
- **Ready or not.** The Content Manager says approve with minor changes; the Cold Viewer predicts a swipe at
  18-27 s. Decision: technical correctness wins. C1 is a visible defect, and C2/C3 are narration with no picture. Not
  ready.

## 6. Implemented improvements
None (no-changes mode).

## 7. Remaining issues
Everything in section 5. C1-C4 need a re-stage and a re-render; C4 also changes the script and voice. Round 3 is the
last round the skill allows.

## 8. Comparison
| Evaluation | Round 1 | Round 2 |
|---|---|---|
| Technical QA | 7 | 4 (one major crowd cluster; round 1 counted the crowd pop as minor) |
| Cold Viewer (mean) | 5.6 | 5.8 |
| Regular Viewer (mean) | 6.2 | 6.4 |
| Content Manager (mean) | 5.9 (REVISE) | 6.9 (APPROVE WITH MINOR CHANGES) |
Cold Viewer verdict moved from "swipes before 56 s" to "swipes at 18-27 s unless hooked". Caveat: round 1 critics ran
on Opus and read more sheets (15-76). Round 2 critics ran on Sonnet and sampled 14-24 of them, so the scores are not
strictly comparable.

## 9. Final publication decision
**REQUIRES FURTHER REVISION.** Round 1's technical fixes mostly landed: the blink, x-ray insert, wire, toy and button
mix are fixed. The crowd in B30/B30b still pops and shows ghost zombies, which is a visible defect in the climax.
Three narration beats (B05 shop and shutters, B10 pinkies, the "shaken toys talk" plant) still have no picture or
come too late, and they sit right where the critics predict the swipe.
