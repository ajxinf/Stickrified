# gta-started-as-race-n-chase: where it stands (2026-11-17)

Episode 3. Script approved ("Okay proceed"; GTA teased in line 1 per the user's note).

## R23 (2026-11-17): user review of the shipped episode
User: "the light coming from the computer was too bright", "nonsense environment (the door opened and there is
nothing coming from that door, just a wall)", "GTA text clipping", "missing that premium feel". Root cause: steps
10-10b (QA layer 3, richness, video-review) were skipped and nothing enforced them.

Fixed:
- Glare: desk lamps 2.0 -> 1.0, monitors are the new `screen` practical (1.6 m reach, small glow) instead of
  `window`, ceiling lamp 1.2 -> 0.6, warm wash lamps on the back/front walls away from heads. Faces were 1.7-3.2
  (QA "Glare"), now <= 1.6.
- Door: a real doorway in the right wall and a lit corridor behind it (notice board, EXIT sign, chair); the
  publisher walks in from the corridor. Door tagged for QA "Door logic".
- Text: "GTA?" moved from the ring road (cars drove over it, the pavement hid its ends) onto the middle block's
  roof; whiteboard (E2 dolly out, I1), calendar (layout + framing), newspaper (now lands beside the CRT, not under
  it), box art (title ran off the box), the 1994/1997 stamps (over Mike's head / the box title) all reframed.
- Premium: the nine full-frame screen inserts now show the CRT in its case on the desk with the room behind; paper
  surfaces tinted so whites no longer clip; wall plaster/stripe texture, whiteboard ghosting, CRT case grain;
  notes round the calendar; K6 billboard seen from above with the city behind; roof props; D1 starts above the
  roofs (it opened 1.6 m from a facade).

## R23b (user, 2026-11-17): "no need for critics"
- Line 12: the tear-off calendar is gone. A SHIP DATE sheet on the cork board: MONTH 18 struck on "goes", "20?"
  written on "20", struck, "24!!" on "24"; the wall clock spins as time-lapse (G3); G4 is you crying under the cup
  tower with the sheet behind you.
- Line 22 (K5): dusk street, low lens down the pavement, a queue of ~19 to the street's end, a GAMES blade sign
  and an OUT TODAY! banner (was a flat side-on facade by day).
- Delivered in 2K (1440x2560) to Episodes/ with --user-approved (DELIVERY.md lists the gates it skipped).

## Open
- richness "flat" .455 (refs <= .42; old ep 3 .441, ep 1 .509): crisp went 7.2 -> 9.6 (ok). The remaining flat
  area is broad painted surfaces (K4 Lords yellow wall, J1 road close-up, billboard, plain office walls).
- Critics / production-quality review skipped on the user's word for this episode.
- Music licence (all library tracks): confirm before publishing.
