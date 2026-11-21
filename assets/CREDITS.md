# Asset credits

Every third-party asset gets a row: what it is, where it came from, its license. CC0 for models, textures and
sounds; fonts may be SIL OFL 1.1 (approved 2026-11-14), shipped with their license file; sound effects may be
generated with ElevenLabs Sound Effects for this channel (approved 2026-11-14).

| Asset | Source | License |
| --- | --- | --- |
| Kenney City Kit models (`public/kenney/city/`: building-small-a/b/c/d, building-garage, road-straight, pavement, Textures/colormap.png) | Kenney, via https://github.com/KenneyNL/Starter-Kit-City-Builder (`models/`) | CC0 1.0 (stated in that repo's README; the repo's MIT license covers its code only) |
| Nunito font, variable weight (`public/fonts/Nunito-wght.ttf`), captions and stamps | Google Fonts repository, https://github.com/google/fonts/tree/main/ofl/nunito (The Nunito Project Authors) | SIL Open Font License 1.1 (`public/fonts/Nunito-OFL.txt`) |
| Background music (`assets/bgm/*.mp3`, catalogue in `assets/bgm/library.json`): "Time" and "Mindwave" by Avanti, "Florida Keys" by Hoffy Beats, "Serenity" by Pufino, and `in_this_world(default).mp3` (no tags) | Supplied by the user, 2026-11-16 | **To confirm:** licence and whether the description must credit the artist (many free-to-use libraries require a credit line) |
| Sound effects and ambience beds (`assets/sfx/eleven/*.wav`, prompts in `assets/sfx/library.json` and each `<name>.json`) | Generated with ElevenLabs Sound Effects (eleven_text_to_sound_v2) on the channel's ElevenLabs account, 2026-11-14 | ElevenLabs terms for generated audio on the account's plan (commercial use per plan) |
| Photo textures, 1K diffuse (`assets/tex/*.jpg` raw, `public/tex/*.jpg` levelled by `scripts/tex_level.py`): dense_sand, damp_beach_sand_02, sparse_grass, weathered_planks, weathered_plank_siding, white_planks_clean, clay_roof_tiles, grey_roof_tiles, hessian_230, painted_plaster_wall, rusty_metal_sheet | Poly Haven, https://polyhaven.com/textures (downloaded 2026-11-21 via api.polyhaven.com) | CC0 1.0 |
| Normal (OpenGL) and ARM maps, 1K, for the 11 photo textures above (`assets/tex/maps/*_nor.jpg`, `*_arm.jpg`; copied unchanged to `public/tex/`, listed in `public/tex/maps.json`) | Poly Haven, https://polyhaven.com/textures (downloaded 2026-11-21 by `scripts/polyhaven.py tex`) | CC0 1.0 |
| 3D models, 1K glTF with their diffuse/normal/ARM textures (`assets/models/<id>/` original, `public/models/<id>/` served, boxes in `public/models/index.json`): wooden_crate_01, wooden_barrels_01, wooden_bucket_01, wooden_lantern_01, lifebuoy, flood_lights, wooden_picnic_table, lambis_shell | Poly Haven, https://polyhaven.com/a/<id> (downloaded 2026-11-21 by `scripts/polyhaven.py model`) | CC0 1.0 |
