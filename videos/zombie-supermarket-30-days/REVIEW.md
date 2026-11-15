# VIDEO REVIEW REPORT: zombie-supermarket-30-days (round 6, 2026-11-15)

Mode: **complete review** after the cast redesign (characters matched to `assets/visual-ref*.mp4`, commit 524accd)
and the R18 fixes from REVIEW_R5 (ab8edf9). Stage reviewed: rendered.
- The critics judged the R18 render (30 of 37 shots changed, so a full review, not a delta).
- The R19 fixes (59979ee) were rendered and checked with QA layers 1-2 plus a lead eye check of the 7 changed shots.
  The critics have not re-scored R19 (that would be round 7).

Roles and models: QA eye pass and Production Quality on **Opus** (41/41 sheets each); Cold Viewer and Content Manager
on **Sonnet** (7/7 phone sheets each). Regular Viewer skipped (no published episode yet). Nobody heard the audio.
Raw reports: `out/zombie-supermarket-30-days/review/r6/`; merged list: `out/.../review/r6-findings.md`.

## 1. Technical QA
- **R18 render: 1/10.** Layer 1 passed. Layer 2: 8 of 9 flag clusters explained (insert = the duck's deliberate shake;
  B29 = the cart's rattle, the camera holds still); JERK f2160 unexplained. Four majors: B17 dead hold with the sign
  sliding off (M1, R5 #2), floating zombie pile in B30b (M2, new), no readable crash + the wipe covering it (M3, R5
  #4), kick short of the cart (M4, R5 #3); 15 minors.
- **Confirmed fixed (R18):** the can stays in hand (f1281-1305), both B21/B22 jump cuts, the insert restyled as a
  paper cutaway, the surge is no longer a rectangle.
- **R19 render (provisional, lead check):** layer 1 passes (strict); layer 2 lost JERK f2160, every remaining flag is
  an explained kind (whips, slot slam, floodlight, insert shake, cart rattle). M2 and M4 improved, M1 reads but barely
  moves, M3 still busy.

## 2. Cold Viewer Critic (R18)
First impression 6, hook 5, clarity 7, entertainment 7, retention 6. Would scroll at 3-6 s (B02 toy pile, calm Chad)
and 12-15 s (B05 speck); stays from ~24 s. Strengths: the fuel-can chart, Chad's design, the pyjama reveal, the
horde push-in, the duck cutaway. Weak: the battery-pop hook, gags lost at phone size (pinky, point, hedgehog, give-up),
a parked-looking cart, a chase that does not run.

## 4. Professional Content Manager (R18)
**REVISE (light)**: overall 6.5, entertainment 7, script 7.5, visual 6.5, retention 6.5 (pred.), engagement 7 (pred.),
monetization 8.5, competitiveness 6.5. Opening misses the title promise (horde at 6.5 s); dead holds (B05, B09, B28,
insert); action words with no picture (give up, point, shutter, chase); ghost dissolves; Dave has no payoff.

## 5. Production Quality (module 5, R18): FAIL
Art direction 6, Characters 6, Animation 4, Environment 6, Camera 6, Composition 6, Lighting 6, Texture 7,
Transitions 6, Polish/sound 6. Measured: still frames, motion, luma, loudness, stereo pass; colourfulness .238 (< .25)
and no camera move over 6 s fail. Auto-fail items: floating pile, standing chase, megaphone teleport, B17 hold,
un-inked effects (rainbow trail, steam, megaphone, toys), B21->B22 light jump, flat sky behind Chad (B33).

## 6. Consolidated problems
See `r6-findings.md` (20 rows). CRITICAL: F1 standing chase (all four), F2 floating pile, F3 B17 hold, F4 climax +
wipe. HIGH: kick, B05 speck, hook gag, B18 point cropped, B12/B13 actions, battery never shown, un-inked effects,
plain dissolves.

Disagreement: the Content Manager wants a horde cold open; the user picked the "212" zombie cut (R17). Kept the user's
pick (zombies on screen by f36); the hook's weak part is the battery-pop gag (F7), not the zombie timing.

## 7. Implemented improvements (R19, 59979ee)
| finding | what changed | files |
|---|---|---|
| F1 | a running bounce on every chasing card | roles.ts |
| F2 | pile two layers high, the rest wait at the door | roles.ts |
| F3 | B17 lens directly behind the cart, easing back: cart, sign, ramp and door hold | story.ts |
| F4 | dust wipe 20 f, peak 7, puffs at .7 | DustWipe.tsx, Video.tsx |
| F5 | kick from 0.85 m (the foot reaches the cart) | story.ts |
| F6 | B05 one slow crane storefront -> Chad (fov 15, under the 25 px/f cap) | story.ts |
| F14-F16 | megaphone grab over 6 f; spatula thick short handle; insert arcs pulse smoothly | story.ts, props.ts, Video.tsx |
| F20 | PUBLISH.md caption line | PUBLISH.md |

## 8. Remaining issues
| finding | what it needs |
|---|---|
| F1 chase still reads as a lined-up crowd facing the lens | zombie cards that turn (`Look.turns`) and run in profile |
| F3 B17 barely moves | a crane along the ramp that clears FRESHMART (lens limit 0.3 m) |
| F4 crash still busy | a clear impact frame (cart + counter + Chad's shock) before the wipe |
| F7 hook gag | rebuild B01/B02: one toy frozen mouth-open, battery flying out on "pull" |
| F8-F10 | B18 point inside the frame; B12 give-up sag + B13 dance; battery visibly going in |
| F11 | ink the rainbow trail (music notes), steam, megaphone and toys |
| F12, F17-F19 | in-world transitions for the 3 dissolves; B22 light; captions off signs; colourfulness |

## 9. Final comparison
| Evaluation | Round 5 | Round 6 (R18) |
|---|---|---|
| Technical QA | n/a (layer 3 not run in r5) | 1 (4 majors; R19 provisional: 2 improved) |
| Cold Viewer | first impr. 6, ent. 7 | first impr. 6, hook 5, ent. 7 |
| Content Manager | REVISE, visual 6 | REVISE (light), overall 6.5, visual 6.5 |
| Production Quality | Characters 7, rest 5-6 | Characters 6, Animation 4, rest 6-7 |

## 10. Final publication decision
**REQUIRES FURTHER REVISION.** The new cast reads cleanly and the R18/R19 fixes removed the worst holds and the floating
pile, but module 5 still fails every category and the chase, crash and hook gag are the moments viewers would leave
on. Next round: F1 (turning, running zombies), F4 (impact frame), F7 (hook gag), then round 7 critics on the new render.
