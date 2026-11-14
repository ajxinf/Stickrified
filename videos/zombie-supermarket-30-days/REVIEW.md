# VIDEO REVIEW REPORT: zombie-supermarket-30-days (round 3, 2026-11-14)

Mode: **complete review** (QA + critics, then fixes and a re-render). Round 3 is the last round the skill allows.

Stage reviewed: rendered.
- The critics judged the round-2 render (`final.mp4` of 15:00).
- The fixes were rendered at 21:32 and checked with QA layers 1-2 plus a lead eye check of the changed shots.
- The critics have not re-scored the new render (that would be round 4).

Roles and models: Technical QA eye pass on **Opus**; Cold Viewer, Regular Viewer and Content Manager on **Sonnet**.
All four read 75 of 75 sheets. Two critics lost the early sheets from context and marked those shots "not reviewed",
which led to the new protocol rule (write ledger rows per sheet).

Not reviewed: analytics (none exist), the audio by ear (nobody heard it; numbers only).
Raw reports: `out/zombie-supermarket-30-days/review/r3/`. Round 1 and 2 reports are in git history (`e20c019`, `72b3b1c`).

## 1. Technical QA
- **Round 3 eye pass, old render: 1/10.**
  - C1, the crowd pops and see-through zombies in B30/B30b, was still on screen: the fix was committed but not
    rendered.
  - H5, the B12 crowd snapping into grid rows, was still there.
  - Minor items were at the cap: banding, captions on gag objects, stacked heads, the B26 handrail in your hip, the
    B18 photo vanishing (f1278->1280), and a day sky on "Every night" (B19).
- **After fixes, new render: 7/10 (provisional; only the changed shots were checked by eye).**
  - Layer 1 passes.
  - Layer 2 has 17 flags, all explained:
    - Gone: the crowd LIGHTJUMPs at f2063 and f2185.
    - New: f408 is the planned B05 whip.
    - New: f2042 SHAKE is B29 tracking the rattling cart; neighbouring frames show no jump.
    - Unchanged: the whip, slot slam, night, floodlight and x-ray flags.
  - Layer 3 by the lead (stills plus the B30/B30b sheets): no pops and no ghosts in B30/B30b, B12 scattered and
    pounding, no new clipping in the shots I changed.
  - Minor items still open: see section 7.
- **Audio (numbers, unheard):**
  - -14.2 LUFS / -1.3 dBTP.
  - The voice sits 24.0 dB over the music in speech.
  - The button is 16.4 dB under the last word.
  - "roof." is fixed: the music drops out under it.
  - Per word, "generator." 3.6 dB, "in." -0.7 dB and "up." 5.4 dB are close to the music; the 0.08 s words below
    6 dB are timing noise. Listen before publishing.

## 2. Cold Viewer: 5.6 avg (old render)
- Scores: first impression 6, hook 5, clarity 6, entertainment 6, retention 5.
- The gags in B01-B02 (frozen toys), B09-B10 (beans) and B30 (dog-like chase) are not visible.
- B17, B21 and B31 hold still for 3 s or more.
- The ending can be guessed from about 35 s.
- **The last picture contradicted the last line:** Chad's mouth was wide open on "doesn't make a sound", and the
  wave was not visible.
- Verdict: keeps watching until about 35 s.

## 3. Regular Viewer: 6.4 avg (old render)
- Scores: identity 7, originality 7, satisfaction 6, entertainment 6, returning retention 6.
- The climax (B30b) is a wall of faces with no cart or door.
- B31 and B33 hold for about 3 s each.
- The "shaken toys talk" rule comes after the cart has already screamed.
- Pyjama Chad loses all his signature items.
- B05, B06 and B09 hold still.
- Verdict: mostly satisfied; wants one more revision.

## 4. Content Manager: 6.6 avg, decision **APPROVE WITH MINOR CHANGES** (conditional; old render)
- Scores: overall 7, entertainment 7, script 7, visual 6, retention 6, engagement 6, monetization 8,
  competitiveness 6.
- Fixes it asks for, all picture-only:
  1. Frame 0 is the duck, not the zombies.
  2. The chart has no skull and doesn't show the count.
  3. 37-47 s goes about 10 s with no gag landing.
  4. "Dave asks" shows no Dave.
  5. The toys never visibly scream.

## 5. Consolidated problems (rounds 2 + 3)
Full table: `out/zombie-supermarket-30-days/review/r3/r3-findings.md`.

| id | severity | raised by | problem | status |
|---|---|---|---|---|
| C1 | CRITICAL | QA (r2, r3) | B30/B30b crowd pops + z-fight ghosts | **fixed** (kit crowd: whole-shot lens lane, per-instance depth offset) |
| C2 | CRITICAL | CM, CV (r2, r3) | B10 pinky gag invisible | **fixed** (MCU on you, pinky to your mouth on a loop) |
| C3 | CRITICAL | CM, RV (r2) | B05 never shows the shop or shutters | **fixed** (storefront wide, fast push to Chad on "megaphone") |
| C4 | CRITICAL | RV, CM (r2, r3) | "Shaken toys talk" not planted | **fixed, picture only** (the duck jiggles while it quacks at 0 s) |
| C5 | CRITICAL | CV (r3) | Open mouth on "doesn't make a sound" | **fixed** (lips pressed shut from "doesn't") |
| C6 | CRITICAL | RV, CV (r3) | Climax B30b is a wall of faces, no cart | **fixed** (the lens rides behind the cart through the crowd into the shop) |
| H1 | HIGH | CM (r3), lead | B20 chart: no skull, count unreadable | **fixed** (root cause: mirrored chart axis; now whole chart, then push to the skull) |
| H2 | HIGH | CM (r3) | "Dave asks" shows only you | **fixed** (B18 two-shot) |
| H3 | HIGH | CV, RV (r2, r3) | Pyjama Chad reads as a new character | **fixed** (keeps the backwards cap) |
| H4 | HIGH | CV (r2, r3), lead | B32 wave not visible | **fixed** (hand raised beside your head, over the bright side) |
| H5 | HIGH | QA, CV (r2, r3) | B12 grid rows, no banging | **fixed** (scattered spots, pounding on "bang") |
| H6 | HIGH | RV, CV, CM (r3) | B31/B33 frozen holds | **fixed** (megaphone tremble, stronger pushes) |
| H7 | HIGH | lead (r2) | music over "roof." | **fixed** (music stop) |
| H8 | HIGH | CM (r3) | Frame 0 is the duck; the title promises zombies | open: needs the user's taste (see 7) |
| H9 | HIGH | CM, CV (r3) | Toys never visibly scream (B27-B29) | open |
| H10 | HIGH | RV (r2, r3) | Same story skeleton across the queued scripts | open: next scripts |
| M | MEDIUM | QA, CV, CM | captions on gag objects; banding; stacked heads; B09/B06 holds; small horde figures (B03b/B12) | open |
| L | LOW | QA | B26 handrail in hip, B18 photo vanishes, B19 day sky on "Every night", B11 megaphone cut | open |

Disagreements:
- **Frame 0.** The Content Manager wants a horde flash first. The round-2 Cold Viewer wanted Chad's laugh first. The
  Regular Viewer likes the duck opener. Decision: keep the duck, which now jiggles and quacks (it carries the plant
  the story needs), and leave reordering the opening to the user.
- **Ready or not.** The Content Manager says approve; the Cold Viewer and Regular Viewer say revise. Their named
  blockers (C1-C6, H1-H7) are now fixed in the render.

## 6. Implemented improvements
| finding | what changed | why | files |
|---|---|---|---|
| C1 | crowd hides extras near the lens for the whole shot; fixed per-instance depth offset | per-frame hiding popped; coplanar cards z-fought | `kit/toon/crowd.tsx`, `Video.tsx` |
| C2 | B10 MCU on you; `pinkyEat` pose: can at the chin, pinky dips to the mouth | the gag was too small to read | `story.ts` |
| C3 | B05 opens on the storefront, whips to Chad on "megaphone" | show what the words list | `story.ts` |
| C4 | the duck shakes while QUACK shows; the card floats up clear of the duck | plant the rule without new words | `props.ts` |
| C5, H6 | Chad "worried" (mouth shut) from "doesn't"; megaphone tremble; B31/B33 pushes | the picture matches the line; no dead holds | `story.ts` |
| C6 | B30b camera follows the cart, then settles on the doorway; kick on "door" | show the crash | `story.ts` |
| H1 | `chartPoint` axis sign fixed; wide on 30 cans, push to the skull | the push missed the skull can | `story.ts` |
| H2 | B18 opens on a two-shot, slower reframe to you | Dave asks on screen | `story.ts` |
| H3 | pyjama look keeps the cap | identity | `roles.ts` |
| H4 | wave arm 0, raised, drawn in front | the hand vanished on a dark background | `story.ts` |
| H5 | golden-ratio spots, bang/reach alternation | grid rows, no bang | `roles.ts` |
| H7 | music stop "roof" -> "still" | quiet word buried | `audio/events.json`, music/mix rebuilt |

Commits: `3fe64fd` (crowd), `39d1b82` (shots, roles, props, audio). Skill: `b54991f`, `a51e65f`.

## 7. Remaining issues
| finding | why not fixed | what it needs |
|---|---|---|
| H8 frame 0 | taste call; reordering the opener moves the hook | user: keep the duck, or open on a 1 s horde flash |
| H9 toys screaming | needs a new close-up shot of toy mouths on "scream" (B27/B28) | a shot-plan addition |
| H10 formula | concept level | vary the sidekick and doubter in the next scripts (`stickrified-script`) |
| M / L items | polish; no viewer is lost | a polish pass |
| Re-score | the critics have not seen the new render; the skill stops at round 3 | user: run a round 4 (critics only) on the new `final.mp4` |
| Audio by ear | nobody listens in this pipeline | listen to "generator.", "in.", "up." |

## 8. Comparison (critic means; rounds 1-3 all judged a pre-fix render)
| Evaluation | Round 1 | Round 2 | Round 3 | After fixes |
|---|---|---|---|---|
| Technical QA | 7 | 4 | 1 (fix unrendered) | 7 provisional |
| Cold Viewer | 5.6 | 5.8 | 5.6 | not re-scored |
| Regular Viewer | 6.2 | 6.4 | 6.4 | not re-scored |
| Content Manager | 5.9 | 6.9 | 6.6 | not re-scored |

## 9. Final publication decision
**READY WITH MINOR IMPROVEMENTS** (provisional).
- Every CRITICAL item and seven HIGH items the critics named are fixed and rendered, and QA layers 1-2 are clean.
- What remains: the frame-0 taste call, a toy-scream close-up, polish, and a listen.
- A critics-only round 4 on the new render would confirm the scores before posting.
