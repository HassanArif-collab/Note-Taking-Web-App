# MathNotes

A single-file HTML5 handwriting app for university math notes — built for and tested against **Safari 9 / iOS 9.3.5** (iPad 3rd generation, 2012). No frameworks, no build step, no dependencies: one `index.html` with inline CSS (flexbox + `-webkit-` prefixes) and inline ES5 JavaScript.

**Use it here:** https://hassanarif-collab.github.io/Note-Taking-Web-App/

## Features

- **Notebooks** — multiple notebooks, create / rename / delete (long-press a cover)
- **Pages** — unlimited pages per notebook with a thumbnail page sheet
- **4 pens** — Pen, Marker, Highlighter (multiply blend), Pencil
- **12 colors** and 5 stroke sizes
- **Object eraser** — tap a stroke to delete the whole stroke
- **Undo / Redo** — 100 levels per page
- **Dark mode**
- **PNG export** — long-press the exported image to save to Photos
- **Offline storage** — everything in `localStorage`, saved automatically (500 ms debounced, flushed when you leave the page)

## Palm rejection (v3.1)

A 2012 iPad has no active digitizer, and iOS 9 Safari reports touch radius as the spec default (1) — so the old radius-only check could never fire. v3 uses behavioural heuristics:

- **Movement gate** — a touch only starts inking after it travels ~5 px from its touchdown point. A resting palm stays still; writing moves. Nothing is lost: the touchdown point is replayed when the stroke commits.
- **Arbitration** (new in v3.1) — several touches may be "pending" at once; the first one to travel far enough commits, and every other touch is instantly declared a palm. This replaces v3.0's multi-touch gate, which rejected *every new stroke* whenever the palm was still resting on the screen (strokes failed until you lifted the palm completely).
- **Anti-bounce tap-dots** (new in v3.1) — a quick no-movement tap no longer inks instantly. It waits 200 ms: if the same spot is touched again immediately (a rocking/bouncing palm), the dot is dropped; if the pen commits a stroke meanwhile, the dot was real and inks at once. Taps shorter than 80 ms are pure noise and never dot.
- **Identifier lock** — once a stroke starts, only its own touch drives it; every other touch is ignored.
- **Settle rule / stale purge** (Max only) — a touch that has sat still for 600 ms must travel 16 px (not 5) to ink, so palm creep and repositioning slides never draw; stationary touches are declared palms the moment a fresh touch lands.
- **Radius check** — kept for devices that do report contact area (harmless on iPad 3).

The **Palm** toolbar button cycles three levels:

| Level | Behaviour |
|-------|-----------|
| **Palm: Off** | Original v2 behaviour — ink on touchdown |
| **Palm: Med** (default) | Movement gate + arbitration + anti-bounce dots |
| **Palm: Max** | Med + late-arrival penalty (12 px) + settle rule (16 px) + stale purge |

When the capacitive stylus arrives, **Max** is the level to write with the palm resting (Max keeps palm creep from inking between strokes); **Med** feels a touch snappier at stroke start. Remaining honest limitation: a *slow deliberate* palm drag while nothing else is on screen in **Med** can still ink a stray line (undo fixes it), and a single isolated palm bounce that never re-lands can still leave one dot.

### v3.1 performance fixes (iPad 3)

- The pending-indicator ring no longer follows the touch on every `touchmove` (that forced a relayout at 60 Hz).
- The canvas rect is cached per touchdown instead of queried per touch point per move.
- Pen style is applied once per stroke instead of once per segment.
- Note saving is debounced at 500 ms (was 120 ms) and force-flushed on `pagehide`/`beforeunload`, so the full-notebook serialisation no longer freezes right as you start the next stroke.

## Safari 9 rules (for contributors)

ES5 only. Forbidden: `let`/`const`, arrow functions, template literals, classes, `for...of`, destructuring, Promises, `fetch`, Pointer Events, Service Workers, CSS Grid, CSS custom properties, `var()`, `:focus-visible`, `aspect-ratio`, flex `gap`, the `download` attribute, `Array.includes`, `Object.assign`. Touch Events + Canvas 2D + `localStorage` (in try/catch) only. After editing, validate the inline JS with `new Function(js)` and re-check every item above — a single unsupported token is a silent white screen on the iPad.
