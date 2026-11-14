# Critic protocol (every critic reads this before its own file)

Your critic file says *what* to judge. This file says *how*: coverage, evidence, the shot ledger and a self-check.
A report that breaks a rule here is sent back.

## 1. Coverage: open everything, log it
- Open **every** sheet in `out/<slug>/qa/frames/sheets/` in shot order (`B01_01`, `B01_02`, ... to the last), as
  images. No sampling. Round 2 critics opened 14-24 of 75 sheets and called gags "missing" that were on the
  sheets they skipped.
- Then open the key frames your file names (opening frames, word starts of gag words, the last frame).
- An insert drawn over the 3D (a chart, an x-ray, a stamp card) may be on no sheet: check `INDEX.md`; if it is
  missing there, say "insert not on sheets, not reviewed" rather than guessing.
- Start your report with a **coverage line**: `Sheets opened: N of M (all) / key frames: list`. If you could not
  open some, list them and mark every claim about those shots "not reviewed".

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
- "Missing" means you opened every sheet of that shot and list them ("B10_01-03, every tile").
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
