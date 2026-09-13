# MathNotes v5.1 "S-Class 5"

A single-file HTML5 handwriting app for university math notes — built for and tested against **Safari 9 / iOS 9.3.5** (iPad 3rd generation, 2012). No frameworks, no build step, no dependencies: one `index.html` with inline CSS and inline ES5 JavaScript.

**Use it here:** https://hassanarif-collab.github.io/Note-Taking-Web-App/

## What v5 changes

v5 closes the biggest gaps to **Samsung Notes**:

- **Hand tool (finger scrolls, pen writes)** — the pen/finger split of Samsung Notes, as close as 2012 capacitive hardware allows. Tap the hand icon in the tool capsule: one finger drags the paper (with momentum), two fingers pinch-zoom, double-tap resets zoom to 100%. While you hold the pen in the other hand, this is exactly "finger moves the screen, pen writes". (The iPad 3 reports no touch radius or force, so an app cannot auto-tell stylus from finger — the tool button is the honest version of the Samsung toggle.)
- **Pinch-to-zoom while writing** — two fingers spreading/closing over the paper become a zoom gesture (60%–260%); the page pill shows `page / total · zoom%`. Zoom is anchored under your fingers, and drawing while zoomed lands at the exact document point (verified by test).
- **Lasso selection** — Samsung's selection tool: loop around ink to select it, drag to move it, **resize it** (v5.1), Duplicate / Delete from the floating action bar. All undoable.
- **Selection resize (new in v5.1)** — Samsung-style: a round handle sits on the bottom-right corner of the selection box. Drag it to make the selection bigger or smaller (stroke thickness and text size scale too, 15%–800%). Prefer buttons? The action bar now has **-** and **+** that shrink/grow the selection around its center. Both are single-step undoable, and a second finger while resizing stays inert.
- **Shape assist** — Off / Line / Shapes modes in the pen palette. Line snaps near-straight strokes to perfect lines; Shapes recognises rectangles and ellipses (circles) and snaps them on pen-up, like Samsung shape recognition.
- **Insert text** — T tool: tap the paper, type on the keyboard, text lands as movable, erasable, selectable ink. Tap existing text to edit it.
- **Per-pen memory** — every pen remembers its own color and thickness, like the Samsung pen tray. 24-colour palette.
- **5 paper colors + full dark theme** — White / Cream / Yellow / Mint / Dark paper, and a real Samsung-style dark UI theme.
- **Notes home: search + favorites** — search bar filters notes by title; star your favourite notes (favorites sort first, persisted).
- **Page jump** — tap the page pill and enter a page number.
- Export PNG now renders the real template (ruled/grid/dotted) and paper color, 4-page cap.

## Palm rejection

The iPad 3 has no pen digitizer, reports no touch radius and no force, so
rejection is behavioural - like every finger-mode note app. Every new touch is
observed as a **probe** and scores itself continuously:

1. **Commit gate (Max)** - ink requires sustained speed, directional coherence,
   travel, and a minimum age. Fast writers commit via an express lane. A
   decisive-travel lane covers long deliberate strokes.
2. **Palm verdicts are permanent** - a touch that sits still is declared a palm
   and cannot later steal the pen.
3. **Palm memory** - rejected palm positions are remembered for 3.5 s; a new
   touch landing near one is a "suspect" held to stricter thresholds.
4. **Palm teams** - two contacts landing close together in time and space are a
   hand landing; both become suspects.
5. **Palm anatomy** - the heel of the hand sits below the pen tip and on the
   writing-hand side of it. A contact in that quadrant relative to recent ink is
   a palm. This is the strongest signal available without a digitizer, and
   unlike a fixed screen band it fires where a hand actually rests.
6. **Straight-and-slow veto** - a suspect dragging in a dead-straight line
   slower than anyone writes is a palm sliding. Only suspects are vetoed, so a
   deliberate straight stroke (a fraction bar, a minus sign) is never blocked.
7. **Anti-bounce dots** - taps queue briefly; a re-land nearby cancels the dot.
   A dot must also be credible: not a suspect, and near where the pen was just
   writing.
8. **Usurpation** - in a natural posture the hand lands *before* the pen tip. A
   later touch that behaves like writing can take the ink from a live stroke
   that behaves like a palm, so a palm can never hold the pen hostage.
9. **Mid-stroke discard (Max)** - a committed stroke that decays into slow
   straight drift is removed live.

| Level | Behaviour |
|-------|-----------|
| **Palm: Off** | Ink on touchdown |
| **Palm: Med** | Simple 6 px travel gate |
| **Palm: Max** (default) | Full engine |

**Honest limitations**: a fast deliberate palm slide is still indistinguishable
from a finger and will ink (undo or an artist glove fixes it). In Med, a slow
palm drag can ink. True S-Pen-level rejection requires digitizer hardware - no
amount of software gets all the way there on 2012 capacitive hardware.

## Reporting a problem

The app records itself. Every touch sample, every palm verdict, and every
gesture the engine refused to start goes into a rolling buffer holding roughly
the last minute. When something goes wrong - a stray palm line, a zoom that
didn't happen - open the kebab menu and tap **Send report**. The buffer is
committed straight to the `diagnostics` branch of this repository. No copying,
no pasting, no mail.

It records continuously rather than on demand because the failures are
intermittent. You cannot start a recording for a bug you did not know was
coming.

### One-time setup

1. On GitHub: **Settings -> Developer settings -> Personal access tokens ->
   Fine-grained tokens -> Generate new token**.
2. Repository access: **Only select repositories** -> this repository.
3. Permissions: **Contents -> Read and write**. Nothing else.
4. Copy the token, then in the app: kebab menu -> **GitHub token**, paste, Save.

The token is kept in `localStorage` on that iPad and nowhere else. It is never
written into a note, into a report, or into the repository. Revoke it on GitHub
whenever you want; the app simply stops uploading.

Before relying on any of it, tap **Test GitHub connection** once. A 2012 TLS
stack talking to a 2025 API is not a given, and if that fails nothing else in
the pipeline can work.

### Reading the reports

```
git fetch origin diagnostics
git show origin/diagnostics:traces/auto/<file>.json > /tmp/t.json
node scripts/replay.js /tmp/t.json
```

Replay prints every contact, what the device decided, and what the current code
decides - plus every gesture that was attempted and refused, with the reason.
`--html <other-index.html>` replays the same input against another build, which
is how a change is shown to have altered a real verdict.

**Undo is a label.** The recorder can see what the engine decided but never
whether it was right - no sensor on this hardware reports which contact was a
palm. An undo just after a stray mark appears is you saying "that one was
wrong", and replay points at whichever contact inked just before it. So when a
palm mark shows up, undo it before sending the report.

## Recommended hardware (for this iPad)

- **Stylus**: passive capacitive disc-tip (Adonit Jot-style, or the Rs. 250-300 2-in-1 disc styluses on Daraz.pk). Active/Bluetooth styluses and Apple Pencil do NOT work on a 2012 iPad or in Safari 9.
- **Paper feel**: any matte "paper-feel" PET protector cut for 9.7-inch iPad 2/3/4-class screens (Daraz/AliExpress, ~Rs. 1,200-2,000).
- **Highly recommended**: a two-finger artist glove (~Rs. 250-400) — removes most palm contacts physically, which helps the software rejection a lot.

## Safari 9 rules (for contributors)

ES5 only. Forbidden: `let`/`const`, arrow functions, template literals, classes, `for...of`, destructuring, Promises, `fetch`, Pointer Events, Service Workers, CSS Grid, CSS custom properties, `var()`, `:focus-visible`, `aspect-ratio`, flex `gap`, `clamp(`, the `download` attribute, `Array.includes`, `Object.assign`. Touch Events + Canvas 2D + `localStorage` (in try/catch) only. After editing, validate the inline JS with `new Function(js)` and re-check every item above — a single unsupported token is a silent white screen on the iPad. 
## Development

```
node scripts/check_es5.js     # Safari 9 gate - run before every push
node scripts/test_palm.js     # palm-rejection behaviour (24 assertions)
node scripts/test_upload.js   # recorder + GitHub upload (19 assertions)
node scripts/replay.js FILE   # replay a recorded touch trace
```

`scripts/harness.js` loads the real `index.html` into Node behind a DOM stub, so
the engine is tested as it actually runs rather than as extracted units - no
build step and no changes to the app are needed to test it.

The ES5 gate matters more than it looks: a single unsupported token is a silent
white screen on the iPad with no visible error.
