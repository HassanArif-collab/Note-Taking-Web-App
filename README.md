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
- **Offline storage** — everything in `localStorage`, saved automatically

## Palm rejection (v3)

A 2012 iPad has no active digitizer, and iOS 9 Safari reports touch radius as the spec default (1) — so the old radius-only check could never fire. v3 replaces it with behavioural heuristics:

- **Movement gate** — a touch only starts inking after it travels ~5 px from its touchdown point. A resting palm stays still; writing moves. Nothing is lost: the touchdown point is replayed when the stroke commits, and a quick no-movement tap still draws a dot.
- **Identifier lock** — once a stroke starts, only its own touch drives it; every other touch is ignored.
- **Stroke commit cancels unproven touches** — when your finger/stylus starts writing while the palm is already resting, the palm is permanently declared a palm for that gesture.
- **Radius check** — kept for devices that do report contact area (harmless on iPad 3).

The **Palm** toolbar button cycles three levels:

| Level | Behaviour |
|-------|-----------|
| **Palm: Off** | Original v2 behaviour — ink on touchdown |
| **Palm: Med** (default) | Movement gate + identifier lock |
| **Palm: Max** | Med + multi-touch gate: while 2+ touches are on screen, nothing may start writing |

While you test with your hand: in **Med**, a resting palm leaves no marks; in **Max**, even a palm that slides cannot draw, but writing requires a solo touch (lift everything, then write). When the capacitive stylus arrives, **Med** is the level that lets you rest your palm while writing with it.

## Safari 9 rules (for contributors)

ES5 only. Forbidden: `let`/`const`, arrow functions, template literals, classes, `for...of`, destructuring, Promises, `fetch`, Pointer Events, Service Workers, CSS Grid, CSS custom properties, `var()`, `:focus-visible`, `aspect-ratio`, flex `gap`, the `download` attribute, `Array.includes`, `Object.assign`. Touch Events + Canvas 2D + `localStorage` (in try/catch) only. After editing, validate the inline JS with `new Function(js)` and re-check every item above — a single unsupported token is a silent white screen on the iPad.
