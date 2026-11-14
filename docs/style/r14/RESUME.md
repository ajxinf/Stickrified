# R14 quality upgrade: status (2026-11-15, after pass 3)
Standard: docs/style/QUALITY_STANDARD.md. Gate: video-review module 5 (Opus), every category >= 8, no auto-fail.
Latest module-5 review (on pass 2): FAIL, scores 4-6 (videos/zombie-supermarket-30-days/QUALITY_R14.md).
Pass 3 render (03:37): still 6.3 % (pass), median motion .0152 (target .016), luma .394 (target .40), colourfulness .243 (.25).
Fixed in pass 3: Chad vanishing at f164, f706 whip flash, f1527 light jump, blank dust wipe, smoke outline in the sky.
Open, in the reviewer's order (est. 6-9 h):
1. B25/B27 stair-stepped orange band + mosaic patches; SALE sign halo (f0) -> find the low-res source in kit/toon (AO/light patch).
2. Draw the actions the narration and SFX mark: knock contact (B06), tape strip (B15), battery slide+click (B21/22),
   a kick that connects (B26), generator jolt + ink smoke ring (B23), toys screaming with ink rings (B28), the crash (B30b).
3. Crowd: ragged formation and run cycles for the nearest 20-30 (B12 grid, B30 block slide).
4. Continuity: one Chad shop design (B18 window vs B05/B17), one generator model (B19 vs B23), the can in B18.
5. House-style effects: x-ray insert -> painted cutaway dive; rainbow trail, cart core, megaphone rings with ink edges.
6. Practicals act on the scene: lantern tints your face, the dying floodlight darkens the roof, warm shop light behind the shutter.
7. Expression ladders on B06, B21, B31, B32; one ~7 s continuous ride (merge B27+B28); loudest SFX 7.2 -> 10 dB under voice.
Then: render (out/r14_render.ps1, detached), rerun module 5, iterate until all >= 8.
