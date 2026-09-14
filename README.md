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
| **Palm: Off** | Ink on touchdown (testing, and for a mouse) |
| **Palm: Max** (default) | Full engine |
| **Palm: Strict** | Full engine, every speed threshold x2.6 |

**Strict is a trade, not an upgrade.** A palm drifting steadily at ~0.16 px/ms
is arithmetically identical to slow careful writing - same speed, same
direction coherence, same travel. Nothing in the touch stream separates them.
Strict refuses the drift by demanding more speed, which also refuses genuinely
slow strokes. Use it when your hand marks the page more than your slow strokes
matter; leave it off otherwise. The choice is yours to make per session, not
one to bake in.

There used to be a **Med** level. It was a bare "moved 6 px, so it is ink" gate
with no suspicion, no veto and no arbitration - it read as partial protection
while giving essentially none, which is worse than offering nothing. It is gone,
and anything saved on it is migrated to Max.

**A palm contact does not move - its centroid does.** The digitizer
reports the centre of a contact patch, and as a palm patch grows or deforms
that centre snaps between lobes: in one recording a contact that never went
anywhere hopped 39px in 9ms, repeatedly, back and forth, and another threw its
centroid 81px in the 31ms after landing. Three rules follow from that. A
contact's opening 60ms is treated as the patch settling and counted as no
travel at all. A sample that moves implausibly far and fast for a hand updates
the position but is not counted as movement. And speed is a median over a short
window rather than a running average, because an average lets a single hop
commit a stroke while a median ignores it.

The giveaway is the rhythm: a hand that really accelerates produces
*consecutive* fast samples, while a deforming blob produces an isolated hop with
stillness on both sides. Two isolated hops and the contact is judged a palm.

**Committing does not make a contact trustworthy.** The jump detector runs on
committed strokes too, not only on probes. A palm blob whose centroid snaps
between two lobes hops 30-40px a sample, which reads as motion, defeats the
dwell test, and holds the ink - so the stroke is dropped when the hopping
pattern appears, at any point in its life.

**A pen moves and then lifts; a palm settles and stays.** A committed stroke
that stops going anywhere - staying inside a 14px circle for 300ms - while the
contact is still down is a hand settling, not a stroke being drawn, and it is
removed. Measured as displacement rather than speed on purpose: a settling palm
creeps at 0.03-0.09 px/ms, which no speed threshold separates from careful
writing, but its net displacement is nearly zero while a slow stroke keeps
going somewhere.

**A hand is one rigid object.** Three or more contacts translating together
are one hand, and the ones that could still become ink are refused. Two are
deliberately left alone - that is a pan, and the gesture engine owns it.

**Measured, and abandoned: contact jitter as a size proxy.** The idea was that
a large soft contact would have a noisier centroid than a small rigid disc,
giving an inferred contact size. Real recordings refuse it - palm contacts on
this digitizer creep in smooth 1px steps and are positionally *stable*. The
hypothesis did not survive the data.

**Check what the digitizer actually reports.** Kebab menu -> **Touch
capabilities**, after drawing once. Every threshold in this engine exists
because we believed the hardware reports no contact size and no pressure - and
that belief came from reading `touch.radiusX` alone. The app now observes every
vendor-prefixed twin as well (`webkitRadiusX`, `webkitForce`, and the rest) and
keeps the maximum seen, distinguishing *absent* from *always zero*.

On an iPad 3 / iOS 9.3.5 the answer is **nothing**: `radiusX` is not merely zero,
the property does not exist; `force` exists and is permanently 0; every other
channel is absent. The `radiusX` guards still in the engine are therefore dead
code on this device, kept only because another device might answer differently.

**A cancelled contact is free palm evidence.** iOS fires `touchcancel` when it
decides a touch was spurious - a hand landing, too many contacts, a system
gesture taking over. That is the digitizer telling us the contact was not
deliberate, and the engine used to commit the stroke anyway.

**Contacts that arrive together are a hand.** Several contacts in one
`touchstart`, or one landing while three others are already down, is a hand
meeting the glass. The pairwise team rule only ever saw two at a time.

**A resting palm is not one contact.** On this digitizer it is a storm of
them, appearing and vanishing every 20-100ms. Any two of them look like a pinch
pair, so gesture detection requires contacts that have survived 150ms and a
separation change of 45px before it believes a pinch, and a gesture whose
members change identity re-baselines rather than scaling across two different
pairs of contacts.

**Travel is measured on the glass, not on the page.** `docPoint()` divides by
the live zoom and adds the live scroll, so measuring a probe in document space
makes a stationary contact appear to travel whenever the view moves - and a
palm-triggered zoom is then enough on its own to commit a resting palm as ink.

**Anchored pinch (one finger planted, the other sliding) is not supported.**
With no stylus id and no contact radius, a single sliding contact cannot be
told apart from a pen stroke, and it commits as ink before a pinch can form.
Guessing would mean occasionally turning a real stroke into a zoom.

**Honest limitations**: a fast deliberate palm slide is still indistinguishable
from a finger and will ink (undo or an artist glove fixes it). In Med, a slow
palm drag can ink. True S-Pen-level rejection requires digitizer hardware - no
amount of software gets all the way there on 2012 capacitive hardware.

## Reporting a problem

The app records itself. Every touch sample, every palm verdict, and every
gesture the engine refused to start goes into a rolling buffer holding roughly
the last 25 seconds. It records continuously rather than on demand because the
failures are intermittent - you cannot start a recording for a bug you did not
know was coming.

When something goes wrong:

1. **Undo the stray mark.** That is not just cleanup - it labels the data. The
   recorder can see what the engine decided but never whether it was *right*;
   no sensor on this hardware reports which contact was a palm. An undo just
   after a bad mark is you saying "that one was wrong".
2. Kebab menu -> **Copy report**. The text is pre-selected; copy and paste it.

Replay it against the engine:

```
node scripts/replay.js report.json
```

Replay prints every contact, what the device decided, what the current code
decides, and every gesture that was attempted and refused with the reason.
`--html <other-index.html>` replays the same input against another build.

## Recommended hardware (for this iPad)

- **Stylus**: passive capacitive disc-tip (Adonit Jot-style, or the Rs. 250-300 2-in-1 disc styluses on Daraz.pk). Active/Bluetooth styluses and Apple Pencil do NOT work on a 2012 iPad or in Safari 9.
- **Paper feel**: any matte "paper-feel" PET protector cut for 9.7-inch iPad 2/3/4-class screens (Daraz/AliExpress, ~Rs. 1,200-2,000).
- **Highly recommended**: a two-finger artist glove (~Rs. 250-400) — removes most palm contacts physically, which helps the software rejection a lot.

## Safari 9 rules (for contributors)

ES5 only. Forbidden: `let`/`const`, arrow functions, template literals, classes, `for...of`, destructuring, Promises, `fetch`, Pointer Events, Service Workers, CSS Grid, CSS custom properties, `var()`, `:focus-visible`, `aspect-ratio`, flex `gap`, `clamp(`, the `download` attribute, `Array.includes`, `Object.assign`. Touch Events + Canvas 2D + `localStorage` (in try/catch) only. After editing, validate the inline JS with `new Function(js)` and re-check every item above — a single unsupported token is a silent white screen on the iPad. 
## Development

```
node scripts/check_es5.js     # Safari 9 gate - run before every push
node scripts/test_palm.js     # palm-rejection behaviour (47 assertions)
node scripts/test_recorder.js # recorder + pinch-zoom (15 assertions)
node scripts/replay.js FILE   # replay a recorded touch trace
```

`scripts/harness.js` loads the real `index.html` into Node behind a DOM stub, so
the engine is tested as it actually runs rather than as extracted units - no
build step and no changes to the app are needed to test it.

The ES5 gate matters more than it looks: a single unsupported token is a silent
white screen on the iPad with no visible error.
