# R14/R15 quality upgrade: status (2026-11-15, after R15 kit upgrade)
Latest: review round 5, videos/zombie-supermarket-30-days/REVIEW_R5.md (merged open list) + QUALITY_R15.md (module 5,
FAIL, Characters 7, rest 5-6). Start from REVIEW_R5.md's list. Delta re-reviews: baseline is review/prev_final.mp4.

Standard: docs/style/QUALITY_STANDARD.md. Gate: video-review module 5 (Opus), every category >= 8, no auto-fail.
Last module-5 review (on pass 4): FAIL, scores 5-6 in every category (videos/zombie-supermarket-30-days/QUALITY_R14_P4.md).
The reviewer's ordered fix list in that file supersedes the 'Still open' list below. Its points on pass-4 work:
battery not readable at phone size, kick still reads as missing the cart, tape slap off-frame, knock has no door edge
in frame, smoke ring behind the DAY 30 card, counter impact unreadable, bean can vanishes f1278->1280.

Done in pass 4 (commits 7f01915..0f65a75):
1. B25/B27 stair-stepped band: shadow frustum fitted per shot (Video.tsx shadowFor). Blue mosaic + SALE halo were the
   painted-AO spiral ghosting (kit/toon/ink.ts): now rotated per pixel, 32 taps.
2. Actions drawn on their SFX: B06 knock (lens along the shopfront, raps on knock_steel, ink rings), B15 tape roll +
   strip per tape_rip, B21/B22 battery out -> hatch -> click (gently + 8), B23 smooth jolt + smoke ring at the lens,
   B26 kick meets the cart (Pose.reach), B28 ink rings from the cart on "scream", B30b cart hits the counter on
   cart_crash (clear lens->cart lane `cartClear`, lens over heads, toy burst).
4. B18 window view uses the real slate facade; B19 sees the same generator panel as B23.
5. (part) megaphone/sound rings are solid inked tubes.
6. (part) B24: each flood going out dims the frame (Look.dim).
7. Ladders on B31/B32; mix: SFX ceiling 10 dB under voice, music rides under any word < 12 dB clear (lowest now 12.0).

Still open:
3. Crowd: ragged formation + run cycles for the nearest 20-30 (B12 grid, B30 block slide).
5. x-ray insert -> painted cutaway dive; rainbow trail + cart core are still additive un-inked glows.
6. Lantern tints your face (B09/B10); warm light inside Chad's shop for the B25 reveal (a glowSprite on the pale wall
   did not read: needs a real warm light/grade on the recess).
7. One ~7 s continuous ride (merge B27+B28); ladders on B06, B21.
Floodlight "off" lens still reads as an offset brown plate (B24).
Then: render (out/r14_render.ps1, detached via Start-Process), rerun module 5, iterate until all >= 8.
