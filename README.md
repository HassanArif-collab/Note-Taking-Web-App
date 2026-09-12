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

## S-Class palm rejection (unchanged from v4)

The iPad 3 has no pen digitizer, reports constant touch radius, and no force — so rejection is behavioural, like every finger-mode note app. Every new touch is observed as a **probe** and scores itself continuously:

1. **Commit gate (Max)** — ink requires sustained speed (> 0.09 px/ms smoothed), directional coherence (> 0.42 over an 8-sample window), travel (> 6 px), and a minimum age (80 ms). Fast writers commit via an express lane (12 px at > 0.16 px/ms). 40 px of travel at writing speed always commits.
2. **Palm verdicts are permanent** — a touch that sits 400 ms with under 10 px travel is declared a palm forever; it can never wake up and steal the pen.
3. **Palm memory** — rejected palm positions are remembered for 3.5 s; a new touch landing near one is a "suspect" with 1.35× stricter thresholds.
4. **Palm teams** — two contacts landing within 100 ms and 48 px of each other are a hand landing; both become suspects.
5. **Handedness zones** (Max, Right/Left/Both) — soft suspect bands at the bottom and writing-hand side.
6. **Anti-bounce dots** — taps queue 220 ms; a re-land within 18 px cancels the dot.
7. **Mid-stroke discard** (Max) — a committed stroke that decays into slow straight drift is auto-removed live.
8. **Arbitration** — the first probe to earn ink verdicts every other live probe as palm.

| Level | Behaviour |
|-------|-----------|
| **Palm: Off** | Ink on touchdown |
| **Palm: Med** | Simple 6 px travel gate |
| **Palm: Max** (default) | Full S-Class engine |

**Honest limitations**: a fast deliberate palm slide is indistinguishable from a finger and will ink (undo or an artist glove fixes it). In Med, a slow palm drag can ink. True S-Pen-level rejection requires digitizer hardware.

## Recommended hardware (for this iPad)

- **Stylus**: passive capacitive disc-tip (Adonit Jot-style, or the Rs. 250-300 2-in-1 disc styluses on Daraz.pk). Active/Bluetooth styluses and Apple Pencil do NOT work on a 2012 iPad or in Safari 9.
- **Paper feel**: any matte "paper-feel" PET protector cut for 9.7-inch iPad 2/3/4-class screens (Daraz/AliExpress, ~Rs. 1,200-2,000).
- **Highly recommended**: a two-finger artist glove (~Rs. 250-400) — removes most palm contacts physically, which helps the software rejection a lot.

## Safari 9 rules (for contributors)

ES5 only. Forbidden: `let`/`const`, arrow functions, template literals, classes, `for...of`, destructuring, Promises, `fetch`, Pointer Events, Service Workers, CSS Grid, CSS custom properties, `var()`, `:focus-visible`, `aspect-ratio`, flex `gap`, `clamp(`, the `download` attribute, `Array.includes`, `Object.assign`. Touch Events + Canvas 2D + `localStorage` (in try/catch) only. After editing, validate the inline JS with `new Function(js)` and re-check every item above — a single unsupported token is a silent white screen on the iPad. Behavioral test suite: `node scripts/test_v5.js` (95 assertions).
