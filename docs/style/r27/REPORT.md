# MyVideo vs. Ref1–Ref3: Visual Comparison for Claude Code

## Scope and how to use this report

I reviewed the four contact sheets, inspected full-resolution examples, and compared spaced overview samples across each 90-image sequence (`MyVideo_seq`, `Ref1_seq`, `Ref2_seq`, and `Ref3_seq`). The stills show the clearest visual gaps, but they are not the original 30-fps video files. Treat comments about motion as observations from the supplied still samples, not as a frame-accurate animation or optical-flow audit. Do not infer that every original video frame was inspected.

The goal is to bring the strengths of the references into the project's **future episodes only**, without copying their scenes or abandoning the existing illustrated-character / 3D-world hybrid. The references do **not** use fully realistic human characters: they retain simple outlined cartoon figures, but integrate them into richer 3D environments with stronger lighting, materials, camera choices, and scene action.

## Critical scope restriction — future episodes only

**Do not re-render any existing episode. Do not re-render `MyVideo`, the pilot, the current preview, or any previously completed episode, in full or in part. Do not initiate a retroactive visual-fix pass on old episode outputs.** The current video and its existing renders are comparison material only.

Implement the approved findings in shared components, reusable visual systems, project defaults, templates, and workflow logic so that **new episodes created after this change** inherit the improvements automatically. Do not spend time regenerating old episode clips or replacing completed deliverables.

Validation must not require re-rendering an existing episode. Use code inspection, static checks, isolated component previews, or a small purpose-built test scene that is not part of an existing episode. Once the next episode is produced through the normal workflow, use it to confirm that the new defaults are working. Keep existing episode files, renders, and delivery outputs unchanged.

---

## Executive summary: the biggest gaps

1. **Environment quality and depth:** MyVideo's beach and town shots use broad, simple surfaces and sparse set dressing. The references have layered, scene-specific 3D environments with much richer geometry, texture, and depth.
2. **Lighting and atmosphere:** MyVideo is often lit evenly, with limited light falloff and atmosphere. The references use clear motivated key lights, cast/contact shadows, ambient occlusion, and scene-specific atmosphere. Ref3 is especially strong at dramatic spotlights, volumetric beams, dust, and warm light pools.
3. **Action within each shot:** MyVideo's supplied opening beach frames repeat almost the same composition for a long stretch. The references make held shots feel alive through visible actions, changing props, reactions, and purposeful reframing.
4. **Shot variety and visual storytelling:** The references alternate establishing views, medium shots, close-ups, and detail inserts. MyVideo relies more on wide group compositions and long static views, so important story beats are less immediate.
5. **Character polish and integration:** The character concept is already in the same broad family as the references, but the references give costumes, facial acting, poses, and character-to-world lighting more attention. MyVideo's characters can read as flatter, more generic cutouts.
6. **Visual hierarchy:** Some MyVideo compositions let foreground props cover the main character or compete with the focal point. The references make the protagonist or story-relevant object easier to read.

## Detailed findings

### 1. Environment modeling, detail, and world depth — highest priority

**What the references do better**

- Build environments with several depth layers: foreground objects, a readable character/action area, and a detailed background. The setting feels like a place rather than a flat stage.
- Use geometry that communicates what objects are made of and how they are constructed. Walls have structure; floors have seams and wear; signs have frames/supports; props have thickness and smaller components.
- Add scene-specific set dressing that supports the story. Ref1 uses grass, flowers, fence posts, road markings, trees, vehicles, and roadside signs. Ref2 uses tiled walls, prison fixtures, metal equipment, vault details, floor marks, excavation debris, and an exterior street cutaway. Ref3 uses rock strata, timber supports, rails, lamps, scattered stones, tools, and gold/metal props.
- Give large surfaces variation rather than leaving them as one clean color. The grass, road, soil, rock, wood, metal, and concrete all show visual variation.
- Use perspective lines and environmental shapes to guide the eye. Ref1's fence and road recede into the distance; Ref3's rails pull the eye into the mine; Ref2's architectural lines and cutaway make the space easy to understand.

**What is weaker in MyVideo**

- In the supplied beach sequence (for example, `MyVideo_seq/frame_001.jpg` and `frame_015.jpg`), the sand, water, and sky are broad, simple surfaces. The water reads as horizontal bands, with little visible wave variation, reflection, or shoreline interaction.
- The beach has a large open sky area and relatively few environmental details. The scene feels less spatially rich than the references.
- In `MyVideo_seq/frame_073.jpg`, the town has recognizable houses, a billboard, lights, and a crowd, but the buildings and ground still read as relatively simple blocks and surfaces. The grass is sparse and repetitive compared with Ref1's layered vegetation.
- Several props in the contact sheet (the web/bed, sale sign, floodlights, and buildings) communicate the idea, but the surrounding world could use more construction detail, material variation, and contextual objects.

**Actions for the project**

- Improve each environment according to its material and location. Do not apply one generic texture pass to every scene.
- Add mid-scale detail first: building trim, window frames, roof variation, fence construction, road shoulders, ground breakup, rock layers, wood grain, metal seams, and prop supports.
- Add small-scale detail second: chips, scratches, stains, dirt, pebbles, leaves, grass clumps, surface roughness variation, and edge wear.
- Use varied grass height, density, direction, and color. Avoid a repeated carpet or evenly spaced blade pattern.
- Make water react to the scene with subtle ripples, reflections, shoreline foam/wet sand, and changing highlights where appropriate.
- Give props correct thickness, bevels, joins, seams, and supports so they feel modeled rather than like flat graphic objects placed in the scene.
- Preserve the simple stylized look. Aim for detailed, art-directed 3D environments, not photorealism for its own sake.

### 2. Lighting, shadows, and atmosphere — highest priority

**What the references do better**

- Each scene has a clear lighting idea. Ref1 uses outdoor daylight and long directional shadows. Ref2 uses a cool interior palette with strong window light and visible light shafts. Ref3 uses warm, dramatic mine lighting with a strong overhead spotlight and pools of illumination.
- Light direction is easy to read from highlights and shadows. Characters and props feel grounded in the same world.
- There are stronger contact shadows and ambient occlusion around feet, props, wall/floor intersections, and objects resting on surfaces.
- Bright areas, midtones, and dark areas are separated more deliberately. This creates depth and directs attention.
- Ref3 adds atmospheric depth with volumetric light, dust motes, and localized haze. The effects are motivated by the mine and its light sources rather than added randomly.

**What is weaker in MyVideo**

- The beach scene is colorful, but the lighting reads relatively even and graphic. The sand, water, and characters do not receive as much convincing directional light variation as the outdoor reference scenes.
- The town scene has bright light fixtures, but their glow does not create the same convincing illumination on nearby surfaces as Ref2 and Ref3's motivated lights.
- Character shadows exist in some shots, but the overall integration of contact shadow, ambient occlusion, bounce light, and light falloff is less developed.
- Some scenes rely on a strong background color to establish mood instead of using lighting and atmosphere to shape the space.

**Actions for the project**

- Give every scene a defined key-light direction, fill level, and optional rim/back light. Ensure those lights affect the character, props, and environment consistently.
- Strengthen contact shadows under feet and props; add ambient occlusion carefully at intersections and contact points.
- Make lamps, windows, floodlights, and spotlights illuminate nearby ground, walls, characters, and objects with believable falloff.
- Use warm/cool contrast to separate the subject from the environment where appropriate.
- Add volumetric beams, dust, haze, smoke, or particles only when the story and light source justify them. Ref3 is a good reference for this treatment.
- Avoid flattening every scene with uniform ambient illumination. Keep enough shadow detail so the scene remains readable.

### 3. Materials and surface texture — high priority

**What the references do better**

- Materials have distinct identities. Grass does not look like soil; road does not look like concrete; old wood does not look like painted metal; mine rock has layered roughness; gold and metal catch light differently.
- Large surfaces have roughness and color variation. Details appear in the material itself, not only as extra objects.
- Ref1's foliage, tree bark, road, and grass have more variation. Ref2's tiles, floor, metal fixtures, and dirt have different surface responses. Ref3's rock, timber, rails, weapon, and gold are easy to distinguish.

**What is weaker in MyVideo**

- Several surfaces look smooth, clean, or uniformly colored. This makes the world feel more like a simple game stage than a fully art-directed place.
- The beach water and sand have limited visible surface breakup. The town ground and building surfaces could show more age, variation, and texture.
- Some object details are represented mainly by color blocks instead of material-specific highlights, roughness, and texture.

**Actions for the project**

- Create a small material vocabulary for each scene: sand, wet sand, water, painted wood, old wood, grass, soil, stone, brick, metal, glass, and fabric should each respond differently to light.
- Add subtle roughness/normal/bump variation and hand-authored color breakup. Keep texture scale appropriate to the camera distance.
- Use edge wear and dirt selectively at contact points, edges, corners, and high-use areas.
- Break up repeated patterns and avoid visible tiling. Use variation in object scale, rotation, material values, and placement.
- Keep detail readable at the final vertical-video resolution. Do not add tiny noise that only creates visual clutter.

### 4. Character design, facial acting, and world integration — high priority

**What the references do better**

- They preserve the simple outlined cartoon-character language, but give each protagonist a stronger identity through clothing, accessories, hats, tools, and color choices.
- Clothing has more construction detail: collars, buttons, seams, pockets, trim, badges, plaid, and other readable surface features. Ref1's teal outfit, Ref2's orange uniform, and Ref3's miner/cowboy outfit are good examples.
- Facial acting changes with the action. Ref2 uses different mouth and eye shapes during digging and reacting. Ref3 uses close-ups and expression changes to sell the character's attitude. Ref1 uses body posture to show effort and reaction.
- Poses communicate weight and intention: bending to dig, leaning, holding a tool, reacting, standing with a prop, or moving through the environment.
- Characters receive the same lighting and shadow treatment as the world, making them feel placed in the scene rather than pasted on top.

**What is weaker in MyVideo**

- Many characters in the beach group share similar body proportions and simple capsule-like torsos. The group is visually repetitive, and the protagonist is not always clearly distinguished.
- Some clothing is mostly a flat color or simple stripe pattern, with less seam, button, fold, or accessory detail than the references.
- Several sampled beach frames show characters holding almost the same pose for a long stretch. Their body language does not change enough to carry the narration visually.
- In the beach framing, the central figure is turned away and partly hidden behind a large prop, reducing facial/emotional connection.

**Actions for the project**

- Keep the illustrated head/face and thin-limbed character style. Do not convert the characters into realistic 3D humans.
- Improve costume readability with a few carefully chosen details per character: collar, buttons, seams, pockets, trim, pattern, hat structure, or a story-specific accessory.
- Use expression changes that match the beat: eyes, brows, mouth shape, head angle, and body lean should all support the emotion.
- Improve posing and weight shifts. Feet should feel planted; arms should reach/hold/interact with props; body lean should communicate force and reaction.
- Apply consistent scene lighting to characters, including shading, contact shadows, and appropriate color bounce, while keeping the illustrated outline style.
- When multiple characters appear, establish one obvious focal character. Vary their height, spacing, orientation, pose, and depth so they do not form a flat lineup.

### 5. Action, object animation, and secondary motion — highest priority

**What the references do better**

- Their held shots still contain a visible action arc. Ref1 shows the planting action and the tree's growth, then the character's reaction and a wider view. Ref2 shows the digging action changing the hole and ground, with the character and shovel responding. Ref3 uses the weapon, gold, light beam, and particles as visible action elements.
- Props participate in the story. Tools move, dirt shifts, objects are revealed, and environmental elements change.
- Character actions have readable anticipation, action, and reaction rather than only a neutral idle pose.
- Secondary details add life: debris, dust, particles, or movement in nearby environment elements.

**What is weaker in MyVideo**

- In the supplied MyVideo sequence, frames `001` through around `070` retain almost the same beach composition. The subtitles and small character changes do not provide as much visible story progression as the reference shots.
- The central group largely stays in a lineup. The scene would benefit from clearer interaction between characters and the object they are carrying or discussing.
- The later town view (`frame_073` onward in the supplied sequence) establishes a crowd and setting, but the sampled frames do not show much change in the crowd's formation or the environment's behavior.
- The contact sheet includes story props such as the dog/web, sale sign, and floodlights. These ideas could be sold more strongly by animating the relevant object or showing its effect on nearby characters and surfaces.

**Actions for the project**

- For every shot, identify the visible action that changes during the shot. If the shot is held, something meaningful should still happen: a character reacts, a prop moves, an object changes, or the environment responds.
- Build actions in three readable stages: anticipation, main action, and follow-through/reaction.
- Animate props and environment in response to character interaction. Examples: shovel impacts move dirt; a sign swings slightly; a light flickers or illuminates a new area; grass bends in wind; water ripples; dust falls after an impact.
- Add subtle secondary motion to hats, clothing, arms, props, foliage, and particles when it supports the action.
- Avoid idle loops that repeat without purpose. Motion should communicate the story beat.

### 6. Camera, composition, and shot variety — high priority

**What the references do better**

- They use a shot vocabulary: wide establishing shots, medium action shots, close-ups, object/detail inserts, and occasional overhead or elevated views.
- The camera distance changes with the story. Ref3 moves from a full character view to close views of the weapon and gold. Ref2 moves closer to the digging character and then cuts to an exterior/cutaway view. Ref1 changes the scale of the tree/road view as the action develops.
- Composition uses foreground, midground, and background to add depth. Leading lines and environmental framing help direct attention.
- The protagonist or story-relevant object is usually large enough to read clearly on a phone screen.
- Camera changes feel connected to the beat rather than random.

**What is weaker in MyVideo**

- The early beach sequence depends heavily on one frontal, medium-wide group composition. The large amount of empty sky makes the characters and action relatively small.
- The red/white foreground object and the central character overlap, so the main action is partly obscured. A foreground prop should frame the subject, not hide it.
- The town view is an effective wide establishing idea, but the small crowd and distant details may be too small to read clearly on a phone.
- The contact sheet suggests other scenes could also benefit from more deliberate close-ups of key props and character reactions.

**Actions for the project**

- Plan each scene with a deliberate mix of wide, medium, close-up, and insert shots. Use inserts for story-critical objects and details.
- Make the main character or object occupy enough of the vertical frame to be readable at phone size.
- Recompose the beach shot so the protagonist's face/body and the important prop are not competing or overlapping. Consider an over-the-shoulder or side angle if it clarifies the action.
- Reduce unused headroom when it does not serve the story. Keep open sky only when it contributes to scale, mood, or a deliberate visual beat.
- Use slow dolly, pan, tilt, orbit, or push-in only when it reveals information or reinforces the action. Do not add constant movement just to make the camera move.
- Use foreground objects as framing devices, but never let them obscure the focal subject for too long.
- Keep screen direction and spatial continuity clear when cutting between angles.

### 7. Color design and scene mood — medium/high priority

**What the references do better**

- Each reference has a coherent palette tied to the location and time of day. Ref1 uses natural greens and daylight blues; Ref2 uses cool blue interiors balanced by warm orange character colors; Ref3 uses amber, brown, and deep shadow for a mine atmosphere.
- Contrast separates the protagonist from the world without making every object equally saturated or bright.
- Color, lighting, and material work together to create mood.

**What is weaker in MyVideo**

- The beach's purple sky and blue water are distinctive, but large areas of similar smooth color and brightness make the scene feel flatter.
- The town uses deep blue sky, red buildings, green-brown ground, and bright sign/light colors, but those elements could be tied together with more deliberate lighting and grading.
- Some shots rely mostly on a saturated background rather than a full scene color design.

**Actions for the project**

- Set a small palette per scene and decide which colors should attract attention.
- Separate foreground and background with value, temperature, and saturation. Keep the main character and story prop readable.
- Use color grading to unify the environment, character, and lighting. Avoid applying one global grade that makes every location feel the same.
- Preserve distinctive colors when they are part of the story or brand; improve their depth rather than replacing them automatically.

### 8. Story props, visual effects, and small realism cues — medium/high priority

**What the references do better**

- Important objects are treated as visual story elements, not just set dressing. Ref2's shovel and changing hole, Ref3's rifle/gold/light beam, and Ref1's tree and roadside signs all help explain what is happening.
- Effects reinforce cause and effect: dirt is displaced, light hits the gold, debris and dust appear in the mine, and the environment responds to events.
- Small cues make props believable: visible structure, material changes, shadows, edge highlights, dirt, and scale relationships.

**What is weaker in MyVideo**

- MyVideo contains useful story props, but some are very clean, simple, or visually isolated from the world.
- Effects and environmental responses are less visible in the supplied samples than in Ref2 and Ref3.
- A few props are more readable as symbols than as physical objects because they have limited material and construction detail.

**Actions for the project**

- Give every story-critical prop one or two close visual beats when needed.
- Show physical cause and effect: impact, movement, dust, falling debris, light response, surface deformation, or character reaction.
- Add restrained effects that match the material and setting. Use particles with scale, speed, and lighting that fit the scene.
- Make signs, furniture, tools, vehicles, and architecture feel physically constructed with supports, thickness, seams, wear, and grounded shadows.

### 9. Captions and safe composition — medium priority

**What the references do better**

- Captions use a consistent high-contrast treatment: bold white text with a strong dark outline, centered and placed in a predictable lower area.
- Captions generally sit over less important image space, so they do not cover the main action.
- The same general treatment remains legible across bright and dark scenes.

**What is weaker in MyVideo**

- MyVideo's caption treatment is already readable and broadly similar, but in the beach sample (`frame_004` and `frame_015`) the caption overlaps the large foreground prop and central action area.
- Some wide shots place text over a large empty ground area, which can make the composition feel bottom-heavy while still not solving subject readability.

**Actions for the project**

- Keep the existing readable bold caption style unless a deliberate redesign is needed.
- Reserve a caption-safe lower band and compose the subject/action above or around it.
- Check each caption against the actual frame: do not cover faces, hands, tools, signs, or the object the narration is describing.
- Keep margins and vertical placement consistent across scenes. Make sure the subtitle is legible without becoming the main visual subject.

---

## Reference-specific lessons to borrow

### Ref1 — natural outdoor world and environmental scale

Borrow:
- Rich vegetation with varied grass, flowers, tree foliage, and bark.
- Convincing daylight direction, long shadows, and environmental depth.
- Road, fence, vehicle, and sign details that make a small location feel lived-in.
- Visible action progression inside a held setup, plus wider reframing when the environment changes.
- Character poses that communicate effort and reaction.

### Ref2 — readable stylized 3D sets and clear action staging

Borrow:
- Clean but detailed stylized architecture and props.
- Distinct materials for tile, paint, metal, concrete, soil, and floor surfaces.
- Strong beams of light and readable shadows.
- Expressive face changes, body gestures, and prop interaction.
- Close-up/medium framing and occasional cutaway views that clarify the action.

### Ref3 — cinematic atmosphere and detail inserts

Borrow:
- Warm, directional lighting with dramatic but controlled contrast.
- Volumetric beams, dust, haze, and light pools when motivated by the scene.
- Rich rock, timber, metal, and prop materials.
- Close-ups of story-critical items and character expressions.
- Foreground-to-background depth and strong leading lines.

---

## Recommended implementation order

### P0 — Fix the biggest perceptual gaps first

1. **Shot-by-shot action pass:** For every shot, define what visibly changes. Replace long idle holds with readable character action, prop interaction, or environmental response.
2. **Composition pass:** Make the protagonist and story prop clear. Remove accidental overlaps and reduce empty headroom where it does not serve the story.
3. **Lighting pass:** Add motivated key/fill/rim lighting, better contact shadows, ambient occlusion, believable light falloff, and consistent character/environment integration.
4. **Environment depth pass:** Improve the largest visible surfaces and add layered foreground/midground/background geometry before adding tiny decorative detail.

### P1 — Raise the overall art direction

5. Build scene-specific material treatments with roughness/color variation and reduced texture repetition.
6. Add character costume detail, facial expression changes, weight shifts, and more convincing prop handling.
7. Improve camera vocabulary: deliberate wide, medium, close-up, and insert shots, with motivated movement only.
8. Improve scene palette and foreground/background separation.

### P2 — Add polish after the fundamentals work

9. Add restrained secondary motion, wind, particles, dust, debris, water movement, and light interaction.
10. Add small prop construction details and surface wear where the camera can actually see them.
11. Refine caption safe zones and validate that captions never cover important action.

## Guardrails: what not to do

- Do not replace the project's illustrated/outlined characters with realistic 3D people. The references' strength is the combination of simple illustrated characters and detailed 3D worlds.
- Do not blindly copy any reference scene, character, costume, or prop. Borrow the visual principles and apply them to the project's own story and assets.
- Do not add constant camera motion. The references often hold shots; what makes them effective is meaningful action, changing composition, or a purposeful cut.
- Do not add random texture noise, excessive particles, fake bloom, or overdone depth of field. Every effect must support the scene.
- Do not spend time polishing tiny details while the composition, lighting, action, and large environment forms are still weak.
- Do not change narration, story meaning, scene order, or subtitle wording as part of a visual-only improvement pass unless separately requested.
- **Do not re-render any existing episode, including the current pilot/preview or any previously completed episode. Do not re-render old episodes partially either.**
- Apply these improvements only to shared systems and episodes created in the future. Existing episode outputs must remain untouched.
- Validate changes with static inspection, isolated component previews, or a standalone test scene that is not part of an existing episode. Do not use an old episode as a render target for testing.

## Claude Code task brief (ready to paste)

Use this report as the visual improvement specification for the project's shared visual systems and **future episodes only**. First inspect the existing project, rendering pipeline, reusable visual components, scene templates, assets, and current preview for understanding. Map each finding above to the exact reusable system or future-episode workflow that controls it. Prioritize P0, then P1, then P2. Reuse existing systems where possible and avoid adding redundant tools, dependencies, or token-heavy workflow steps.

**NON-NEGOTIABLE: Do not re-render any episodes. Do not re-render the current pilot, `MyVideo`, the existing preview, or any previously completed episode, either fully or partially. Do not modify old episode timelines, scene outputs, rendered clips, or delivery files to retrofit these changes.** The existing video is a visual reference for diagnosis only.

Preserve the project's illustrated/outlined character identity and story content. Improve the reusable systems, defaults, templates, and workflow used by episodes made from this point forward: 3D environments, scene-specific materials, motivated lighting, contact shadows, character integration, facial/body acting, prop interaction, and shot composition using the principles in Ref1–Ref3. Do not copy their scenes or force constant camera movement. Every held shot should contain meaningful visual progression; every camera move or cut should have a storytelling purpose.

Make the changes in shared/reusable systems so new episodes inherit them automatically. If a visual check is needed during implementation, use static/code inspection, isolated component previews, or a standalone test scene that is not part of any existing episode. Do not render an old episode, an old episode segment, or a replacement preview as a test. Confirm the improvements on the next genuinely new episode when it is produced through the normal workflow. Keep the project's existing visual QA process and use it to catch frame defects before that future episode's final render. Report what changed, which findings were addressed, what remains, and any trade-offs. Clearly state that no existing episode was re-rendered or modified.
