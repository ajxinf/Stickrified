# Critic protocol (every critic reads this before its own file)

Your critic file says *what* to judge. This file says *how*: coverage, evidence, the shot ledger and a self-check.
A report that breaks a rule here is sent back.

## 1. Coverage: open everything you are given, log it
Which sheets you get depends on your role (token budget, 2026-11-15: 75 full sheets per agent was ~170k tokens):
- **Viewer critics (Cold Viewer, Regular Viewer, Content Manager, Sonnet):** every `phone/P*.png` in
  `out/<slug>/qa/frames/phone/` in order (2 frames a second at phone size, the way a viewer sees it, ~7 sheets).
  Open a `key/` frame only where your file names it or a phone tile leaves a real question; **at most 10 key
  frames** in total.
- **Opus checks (QA layer 3, Production Quality):** every `sheets/S*.png` (every 3rd frame of the whole video,
  inserts included, ~40 sheets), plus key frames where a sheet raises a question. Pull frames straight from
  `final.mp4` only for something on no sheet or key frame, **at most 10**.
- **Re-reviews** (`CHANGED.md` exists in `qa/frames/`): open only the sheets it lists for the changed shots, plus
  the frames of every open item from the previous round. Shots it lists as unchanged keep the previous round's
  ledger rows and findings: copy them, marked "carried from round N-1". Your scores still judge the whole video.
- **Write each sheet's ledger rows to your report file right after you open it** (append, then open the next).
  Images drop out of your context after a few dozen: round 3 critics opened all 75 sheets but kept no notes on the
  first 15-40, so half the video ended up "not reviewed".
- Start your report with a **coverage line**: `Sheets opened: N of M (all) / key frames: list`. If you could not
  open some, list them and mark every claim about those shots "not reviewed". No sampling: round 2 critics opened
  14-24 of 75 sheets and called gags "missing" that were on the sheets they skipped.

## 2. The shot ledger (build it before you judge)
For every shot in `pack.md`'s timeline, write one row in a scratch table (keep it in the report as an appendix):

| shot | frames | words over it | what the picture shows (subject, action, framing) | gag in `pack.md` visible? (frame) | moves? | readable at phone size? |

- "What the picture shows" is what you *see*, in plain nouns and verbs, not the gag text.
- "Gag visible" is yes (with the frame where it reads best) / partly (what is missing) / no (checked every
  tile of every sheet of the shot).
- "Moves" = something on screen changes meaningfully (pose, expression, prop, camera reveal) at least every
  ~1.5 s. A hold longer than that with nothing changing is a **dead hold**: note its frames.
- "Readable" = would you get it on a 6-inch phone at arm's length in one glance: subject >= ~1/5 of the frame
  height, not lost in a dark or blurred area, not under the caption band (y 0.64-0.76 H).
Your problems list is built from this ledger, so every problem has a shot and a frame.

## 3. Evidence rules
- Every claim cites a time (s), frame (`f1234`), shot id or line number. No evidence, no claim.
- "Missing" means you opened every sheet covering that shot and list them ("P03-P04, every tile").
- Separate **observed** (in a frame or a file) from **predicted** (what a viewer would do). Label predictions.
- Nobody hears the audio: judge sound only from `words.json`, `cues.md`, `events.json`, `loudness.json`, and say so.
- Do not read other critics' reports, `REVIEW.md` or earlier rounds. Fresh eyes are the point.

## 4. Fixes must be buildable
Each problem ends with a fix someone can do in this repo, inside our look (LOOK_SPEC): the shot id, what to show
instead (subject, framing, action, on which word), and the file that owns it (`story.ts`, `roles.ts`, `build.ts`,
`script.json`, `events.json`, `PUBLISH.md`). Prefer fixes that **do not change the words**, because new narration
needs a new voice take; if only a word change fixes it, write it as `old -> new` and say why no picture fix works.
Cut before you add. Never: photoreal CGI, stock footage, a new art style, a longer script.

## 5. Severity hint (the lead decides the final level)
Tag each problem: **blocker** (a viewer is lost, misled, or sees something broken), **major** (a viewer gets
bored or misses a joke), **minor** (a better version exists), **polish**.

## 6. Self-check before you write the file
- [ ] Coverage line is true, and every shot has a ledger row.
- [ ] Every "missing / not visible" claim lists the sheets checked.
- [ ] Every score has a one-line reason that cites evidence and matches the anchors in the skill's "Scores".
- [ ] Every problem has evidence, why it costs viewers, a buildable fix and its file.
- [ ] Strengths are real (cite frames): what works must be kept, so the fixer knows what not to touch.
- [ ] Predictions are labelled; no invented analytics, no ranking-formula claims.
