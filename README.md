# MathNotes v4.0 "Samsung Edition"

A single-file HTML5 handwriting app for university math notes — built for and tested against **Safari 9 / iOS 9.3.5** (iPad 3rd generation, 2012). No frameworks, no build step, no dependencies: one `index.html` with inline CSS and inline ES5 JavaScript.

**Use it here:** https://hassanarif-collab.github.io/Note-Taking-Web-App/

## What v4 changes

v4 is a ground-up redesign to feel like **Samsung Notes on a Galaxy Tab**:

- **Scrolling lined paper** — a continuous vertical document of discrete pages (ruled lines every 38 px, page numbers in the gaps, blank/grid/dotted templates in the ⋮ menu).
- **Two-finger scrolling with momentum** — pan with two coherent fingers, flick for momentum, exactly like a tablet notes app. Writing is never blocked.
- **Samsung-style chrome** — white header, floating right-edge tool capsule (pen / eraser / undo / redo), pen palette with live stroke previews.
- **5 real pen renderers** — Ballpoint (constant), Fountain (velocity-tapered width), Calligraphy (direction-dependent chisel width), Pencil (grainy double pass), Highlighter (wide, translucent, butt caps). 12 colors, 6-step thickness with live preview.
- **Tile-cached rendering** — finished strokes are baked into 256 px offscreen tiles, so scrolling composites tiles instead of redrawing every stroke (big win on a 2012 iPad). Live ink draws one segment per move; nothing per-move touches the DOM.
- **Notes home + notebooks** — Samsung-style card grid, FAB "new note", notebook drawer. Old v2 data migrates automatically (each old page becomes a note).
- **S-Class palm rejection** — see below.
- **Eraser with stroke and area modes**, movement-gated so a resting palm cannot erase; undo/redo (60 levels); PNG export (first 3 pages); dark paper option; autosave (700 ms debounced, flushed on pagehide).

## S-Class palm rejection (v4)

The iPad 3 has no pen digitizer, reports constant touch radius, and no force — so rejection is behavioural, like every finger-mode note app. v4 observes every new touch as a **probe** and scores it continuously:

1. **Commit gate (Max)** — ink requires *sustained speed* (> 0.09 px/ms smoothed), *directional coherence* (> 0.42 over an 8-sample window), *travel* (> 6 px), and a minimum age (80 ms). Fast writers commit via an express lane (12 px at > 0.16 px/ms). 40 px of travel at writing speed always commits.
2. **Palm verdicts are permanent** — a touch that sits 400 ms with under 10 px travel is declared a palm forever; it can never wake up and steal the pen, no matter how much it drifts after your finger lifts.
3. **Palm memory** — rejected palm positions are remembered for 3.5 s; a new touch landing near one is a "suspect" with 1.35× stricter thresholds. When a suspect proves itself as ink, nearby palm memory is cleared (learning).
4. **Palm teams** — two contacts landing within 100 ms and 48 px of each other are a hand landing; both become suspects.
5. **Handedness zones** (Max, settable Right/Left/Both) — a soft suspect band on the bottom 104 px and the writing-hand side 112 px (never a hard block).
6. **Anti-bounce dots** — taps are queued 220 ms; a re-land within 18 px cancels the dot (palm bounce chains leave nothing).
7. **Mid-stroke discard** (Max) — a committed stroke that decays into slow, straight drift (> 600 ms, < 0.022 px/ms, straightness > 0.93) is auto-removed live with a toast. Deliberate slow lines (fraction bars at ~0.12 px/ms) are far above the discard line and are safe.
8. **Arbitration** — the first probe to earn ink verdicts every other live probe as palm; new touches arriving mid-stroke are palms.

| Level | Behaviour |
|-------|-----------|
| **Palm: Off** | Ink on touchdown (old behaviour) |
| **Palm: Med** | Simple 6 px travel gate — for ultra-slow writers (trades palm safety for forgiveness) |
| **Palm: Max** (default) | Full S-Class engine above |

**Honest limitations** (physics, not software): a fast deliberate palm *slide* across the screen is indistinguishable from a finger and will ink (every finger-mode app shares this; undo, or an artist glove, fixes it). In Med, a slow palm drag can ink. True S-Pen-level rejection requires the pen digitizer hardware those tablets have.

## Recommended hardware (for this iPad)

- **Stylus**: passive capacitive disc-tip (e.g. Adonit Jot-style, or the Rs. 250-300 2-in-1 disc styluses on Daraz.pk). Active/Bluetooth styluses and Apple Pencil do NOT work on a 2012 iPad or in Safari 9.
- **Paper feel**: any matte "paper-feel" PET protector cut for 9.7-inch iPad 2/3/4-class screens (Daraz/AliExpress, ~Rs. 1,200-2,000). The Paperlike brand has no legacy 9.7 size.
- **Highly recommended**: a two-finger artist glove (~Rs. 250-400 on Daraz) — removes most palm contacts physically, which helps the software rejection a lot.

## Safari 9 rules (for contributors)

ES5 only. Forbidden: `let`/`const`, arrow functions, template literals, classes, `for...of`, destructuring, Promises, `fetch`, Pointer Events, Service Workers, CSS Grid, CSS custom properties, `var()`, `:focus-visible`, `aspect-ratio`, flex `gap`, `clamp(`, the `download` attribute, `Array.includes`, `Object.assign`. Touch Events + Canvas 2D + `localStorage` (in try/catch) only. After editing, validate the inline JS with `new Function(js)` and re-check every item above — a single unsupported token is a silent white screen on the iPad. Behavioral test suite: `node scripts/test_v4.js` (41 assertions).
