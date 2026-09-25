# MathNotes

A handwriting notes app for a **2012 iPad 3 running iOS 9.3.5**, used with a cheap
passive stylus. One HTML file, no install, works offline.

**Open it:** https://hassanarif-collab.github.io/Note-Taking-Web-App/

Add it to your Home screen (Share → Add to Home Screen) and it opens full-screen
like a real app.

---

## Using it

### Writing

Pick a pen from the toolbar and write. Five pens — ballpoint, fountain,
calligraphy, pencil, highlighter — each remembering its own colour and
thickness, with 24 colours to choose from.

- **Three favourite pens** sit in the toolbar, each holding pen, colour and
  width together. Tap one to write with it; tap the one you hold to change it.
- **The pen wheel** — the dark bubble at the page edge (Samsung's "pens in
  pop-up view"). Tap it: pens, six widths and colours on one disc, one tap
  each. Start writing and it closes; a tap on the page just closes it. Drag
  the bubble up or down. It sits on the side away from your writing hand.
- **Scribble to erase** — scratch back and forth over writing and it goes.
  Undo once to get it back with the scribble kept as ink; twice to remove
  the scribble too. Shading under a curve does not erase the curve.

### Tools

| Tool | What it does |
|------|--------------|
| **Pen** | Write. Tap again to open the pen tray. |
| **Eraser** | Rub out strokes. Stroke mode removes a whole line, Area mode rubs out what you touch. |
| **Lasso** | Draw a loop around ink to select it, then drag to move, pinch the corner handle to resize, or cut/copy/duplicate/delete. With something copied, tap with the lasso — in any note — and **Paste** appears right there. |
| **T (text)** | Tap the page and type. Text behaves like ink — movable, erasable, selectable. |
| **Hand** | One finger drags the paper instead of drawing. Double-tap resets zoom. |
| **Undo / Redo** | Up to 60 steps. |

### Gestures

- **Two fingers** — pinch to zoom (60%–260%), drag to scroll. Works in Glove
  mode too: two fingers landing together and moving up or down scroll.
- **Two-finger tap** — undo. The fastest way to remove a stray palm mark.
- **Double-tap with the hand tool** — back to 100%.

### Pages

Tap the **page pill** (bottom left), or **Pages** in the menu, and you get a
grid of thumbnails of every page. Tap one to go there — the page you are on
is outlined in blue. **Insert page here** adds a blank page and pushes
everything below it down; **Delete this page** removes it (it asks first, and
says how many marks are on it). Each is a single undo.

**⋮ menu → Page type → Endless** makes the note one long page with no page
breaks and always a screen of blank paper below the last line. New notes
follow the last choice.

### Notebooks and folders

The **menu button** (top left) opens the notebook drawer. The **folder button**
in its header puts the current notebook inside another, or back at the top
level. A folder cannot be put inside its own child.

### Zoom window — for writing small

**⋮ menu → Zoom window.** The bottom of the screen becomes a strip that
magnifies a small box of the page. Write large in the strip; it lands small
in the box, at about a third the size.

The box walks along the line on its own as you reach its right edge, and wraps
to the next line at the margin, so a whole line can be written without
touching anything else. To put it somewhere else, **tap the page above** —
while the strip is open the page is for aiming, not writing.

This exists because a passive disc stylus **cannot** write small. The contact
patch is several millimetres across and its reported centre wanders inside it,
so below roughly a centimetre the letters are limited by the hardware, not by
your hand. Writing large and landing small sidesteps that entirely, which is
why it matters most for maths.

### Photos

**Menu → Insert photo** puts a picture from the camera roll on the page — handy
for a textbook problem you want to work on. It behaves like ink: lasso it to
move or resize, erase it, undo it. It is shrunk before saving, because a full
camera photo would fill the whole storage allowance on its own.

### Backing up — do this

**Menu → Backup and restore → Copy my notes**, then paste the block into an email
to yourself, or Apple Notes, or Drive. Anywhere outside this browser.

iOS can clear a web app's storage without warning and the app cannot stop it. A
backup makes that a non-event. To restore — on this iPad or any other device —
open the same panel, paste the block in, and tap **Restore**. It merges by note,
so running it twice is safe.


### Settings (the ⋮ menu)

Paper template (ruled, grid, dotted, blank), line spacing, paper colour, dark
theme, writing hand, and palm rejection.

### Palm rejection

| Setting | What it means |
|---------|---------------|
| **Max** (default) | Normal. Use this when writing bare-handed. |
| **Strict** | Refuses more of your hand, but also refuses very slow deliberate strokes. Turn it on if your palm marks the page more often than your slow strokes matter. |
| **Glove** | **Use this if you are wearing an artist's glove.** Every contact is the pen, because your hand is not on the glass to be mistaken for one. |

### Glove

This is not a degraded mode — it is the one with no guessing in it, and
everything the guessing costs comes straight back:

| | Max | Glove |
|---|---|---|
| Ink appears | 160–320ms after the pen lands | on the first sample |
| Small marks kept | 16 of 27 | all of them |
| Strokes retracted mid-word | sometimes | never |
| Stray marks from your hand | ~4 per 10 lines | none, because your hand never touches |

Everything that is not rejection still works: two fingers pinch and scroll,
a two-finger tap undoes, and a tap leaves a dot. Nothing can take a stroke
away in this mode except a pinch — that is enforced in one place rather than
at each rule, so a rule added later cannot quietly reopen the hole.

The rejection engine exists only because this iPad reports no pressure, no
contact size and no stylus id — it has to infer from a moving point what a
piece of fabric simply prevents. A ~Rs. 300 glove supplies what the hardware
cannot, and the software gets simpler, faster and more accurate the moment it
no longer has to guess.

Tap the **Palm** chip in the top bar to cycle between them.

Your iPad has no pen digitizer — it cannot tell a stylus from a knuckle, so
rejection is based purely on how a contact *behaves*. It is good, not perfect.
A stray mark now and then is expected; undo it and carry on.

---

## Recommended kit

- **Stylus** — a passive capacitive disc-tip (Adonit Jot style, or the cheap
  2-in-1 disc styluses on Daraz). Apple Pencil and active/Bluetooth styluses do
  **not** work on a 2012 iPad.
- **Artist glove** (~Rs. 250–400) — **the single biggest improvement you can
  make.** It physically stops your palm touching the glass, which solves
  completely what software can only approximate.
- **Paper-feel screen protector** — matte PET cut for 9.7-inch iPads, if you
  want the texture.

---

## Reporting a problem

### The quick way

⋮ menu → **Copy report** → the text is pre-selected. Copy it and paste it into
the chat. The app records itself continuously, so it already has the last ~25
seconds. Undo the bad mark first — that marks it as wrong.

### The way that actually fixes things

**⋮ → Testing drills.** Ten short drills that each tell you what to do —
*rest your hand and do not write*, *palm off, small marks only* — and record
themselves while you do it.

The difference is that a drill knows the right answer **before** you start, so
nothing has to be explained afterwards. A stray mark in *palm-rest* is a
failure, full stop. A missing mark in *pen-small* is a failure, full stop. That
turns "the writing experience is bad" into a number that can be watched going
down.

To send them straight to the developer's machine instead of copying text, see
**Testing drills** under For developers. Without that they fall back to
copy/paste and still work.

There is also ⋮ → **Touch capabilities**, which reports what your screen
actually measures. On an iPad 3 the answer is nothing — no contact size, no
pressure — which is why rejection has to be behavioural.

---

## Not built yet

Ideas worth doing, kept here so they are not forgotten. Nothing below is
implemented.

### Better palm rejection

- **Decide late, draw early.** Show ink the instant you move, but only *commit*
  it ~200ms later using hindsight — did the contact stop? did another start
  writing? Retract what loses. Biggest remaining win, and it would also remove
  the ~130ms delay before ink appears. (Two narrow cases already work this way:
  a small mark and a stroke that dies at the lift are both judged after the
  fact. Doing it for everything is the unbuilt part.)
- **Winner-take-all.** At any moment only one contact can be the pen. Rank all
  live contacts and let only the clear winner draw, instead of judging each one
  alone against fixed thresholds.
- **Remember where the hand lives.** Build a map of the glass over the whole
  session — areas that repeatedly host short-lived contacts are palm territory.
- **Calibration.** Ask once: *rest your hand as if writing, don't write.* Record
  what your palm looks like, instead of guessing.
- **Learn your grip.** Measure the offset between your pen tip and your palm
  over a few strokes, then predict where your palm will be. The current numbers
  are guesses about a generic hand.
- **Two-finger tap to undo.** Makes a stray mark a reflex instead of a trip to
  the toolbar.

### Palm rejection, still to come

- **Latency.** Ink appears ~130ms after you start moving, because a contact
  has to earn the right to draw before it draws anything. This is the largest
  single reason writing feels bad, and "decide late, draw early" above is what
  removes it.

### Handwriting, still to come

The measurements above point at one thing and rule out the rest.

**Cusp-aware smoothing.** Smoothing is applied evenly along a stroke,
including across the point of a `v` and the crossing of an `x` — so the app
is actively rounding off the corners a fast hand is already struggling to
keep. Detect high-curvature points and stop smoothing through them. It is
the only candidate with both a picture and a number behind it.

Honest ceiling: part of the corner loss is the hand, not the app. At speed
the `x` crossing is genuinely shorter before anything touches it, and no
software recreates a stroke that was never made. Expect crisper, not equal
to careful.

**Ruled out by measurement, not by argument:** more alignment work (-8% and
+2%), letter-size normalisation and slant correction (both inside this
hand's own variation), and Bézier re-encoding — see the comment above
`drawSmoothSeg`, which records why.

### Features

- Reorder pages, and a page thumbnail view.
- Better export: multi-page PDF instead of the 4-page PNG cap, which may fail
  outright on this iPad because it builds one enormous canvas.
- A ruler / straight-edge.
- From Samsung Notes: a "new note" window choosing template, cover and page
  type up front; templates per note rather than one for all.
- Drag notebooks in the drawer instead of typing a number.

---

## For developers

One file, `index.html`. Inline CSS, inline ES5 JavaScript. No build step, no
dependencies.

```
node scripts/check_es5.js     # Safari 9 gate - run before every push
node scripts/test_palm.js     # palm-rejection behaviour (60 assertions)
node scripts/test_recorder.js # recorder, pinch-zoom, drills (29 assertions)
node scripts/test_backup.js   # storage and backup (20 assertions)
node scripts/test_features.js # pages, folders, photos, zoom window (35 assertions)
node scripts/serve.js         # serve the app to the iPad, collect recordings
node scripts/score.js         # replay every recording, print a scoreboard
node scripts/train.js         # refit the pen/palm scorer to traces/
node scripts/train.js --dry   # ...report only, change nothing
node scripts/replay.js FILE   # replay one recording, contact by contact
```

### Testing drills

The engine was tuned for a long time against contacts that were invented
rather than recorded, which is how it came to erase real handwriting: there
had never been a recording of a pen writing small to test against. Drills fix
that at the source.

```bash
node scripts/serve.js
```

It prints a LAN address. Open that on the iPad — same wifi — instead of the
GitHub Pages URL, then ⋮ → **Testing drills**. Each drill records itself and
posts straight into `traces/`. Then:

```bash
node scripts/score.js
```

Uploading to GitHub failed because a 2012 TLS stack cannot negotiate a modern
HTTPS endpoint. Plain HTTP on the LAN has no TLS to fail, and serving the app
from the same origin means no CORS and no mixed-content block either. On the
real site `canUpload()` is false and drills fall back to copy/paste.

If the iPad cannot reach it: check both are on the same wifi, allow Node
through the Windows firewall, and pause any VPN (Cloudflare WARP will route
the iPad away from your LAN).

See `traces/README.md` for what `want` means and why `fixture-*.json` files
are not evidence.

`scripts/harness.js` loads the real `index.html` into Node behind a DOM stub, so
the engine is tested exactly as it runs. `scripts/replay.js` replays a trace and
prints what the device decided against what the current code decides; add
`--html <other.html>` to compare two builds on the same input.

### Safari 9 rules

ES5 only. No `let`/`const`, arrow functions, template literals, classes,
`for...of`, Promises, `fetch`, Pointer Events, CSS Grid, CSS custom properties,
flex `gap`, `clamp()`, the `download` attribute, `Array.includes`,
`Object.assign`. Touch Events, Canvas 2D and `localStorage` (in try/catch) only.

**A single unsupported token is a silent white screen on the iPad**, with no
error anyone can see. `check_es5.js` is not optional.

### Handwriting: what was measured, and what it settled

Tidy handwriting straightens a line of writing, levels exponents and
subscripts, and evens the gaps between words. It works. It is also, on this
user's real handwriting, **not worth having** — and that is a measurement,
not an opinion.

A reference corpus decides it. The same phrase is written twice: once slowly
and as neatly as possible (the target) and once at normal speed (the input).
"Did a change improve the writing" then means "did the input move closer to
the target", which is a number. Two neat takes, not one, because neat against
neat is the noise floor — how much a hand varies when it is trying its
hardest — and any gain smaller than that is indistinguishable from the same
person writing again.

```bash
node scripts/refscore.js            # score the corpus in traces/
node scripts/refscore.js --html old.html
node scripts/fakecorpus.js DIR      # a corpus with KNOWN damage, to prove
                                    # the scoreboard before anyone writes
```

Record it on the tablet: menu → Testing drills → **Start the reference
session**. One screen, no timer, no countdown — write, tap Done, the next
phrase appears.

What it found:

| | joined-up | printed |
|---|---|---|
| symbols per line | 5 | 18 |
| overall closed | **-8%** | **+2%** |

Joined-up writing arrives as roughly **one stroke per word**, so a line is
five word-blobs and a baseline fitted through five points is mostly noise.
There are only five things alignment can physically move, which is exactly
what "it only moves some strokes here and there" means from the inside.

Printed letters give enough symbols to measure properly, and only one defect
clears the noise floor:

```
                 floor    gap     after   closed
line tilt        0.47     0.20    0.23    nothing wrong
sits on the line 0.02     0.04    0.05    -3%
letter size      0.12     0.14    0.14    within noise
slant spread     0.63     1.14    1.00    within noise
word gaps        0.14     0.09    0.12    within noise
SHAKE            0.08     0.49    0.49    0%
```

**The geometry of this handwriting is fine.** Lines straight, slant
consistent, letter sizes inside the writer's own variation. What degrades at
speed is stroke quality — and rendering the takes and looking at them says
the same thing: the crossing of an `x` disappears, the point of a `v` rounds
off, a `w` collapses. Every failure is a **corner**.

Three ways this scoreboard lied before it was fixed, each worth knowing:

- **Slant was measured over a full turn.** `atan2` puts an upstroke and a
  downstroke of the same slant 180° apart, and printed letters are full of
  both, so a perfectly consistent hand read as 145° of spread. A 24.7°
  "defect" was reported that did not exist.
- **One take of each is not enough.** Shake across four printed takes came
  out neat 2.31 / 2.23, normal 3.05 / 2.07 — one normal take shakier than
  both neat ones, the other smoother than both. Scoring the first pair
  reports a large defect, the second reports none, and neither is true.
  Every take is used now.
- **Session progress lived only in memory**, so a reload restarted at take
  one and four takes of one phrase were filed under the name of another. The
  ink was right and the label was wrong, which is worse — a wrong label gets
  believed.

### The scorer

Everything below this was a threshold on one quantity, chosen by hand, and
that approach has a ceiling this project reached: a palm and a pen overlap on
every measurement taken alone — duration, speed, straightness, travel, all of
them. They do not overlap on all twenty-two at once.

So a contact is described by twenty-two numbers and they are weighed together.
The weights are **fitted to the recordings in traces/**, where a drill said in
advance whether the hand or the pen was on the glass. `scripts/train.js` does
the fitting and writes `PEN_W` into `index.html`; the device only ever
evaluates a dot product, which an iPad 3 does in microseconds.

The features are computed by `index.html` itself through a live replay, so the
numbers fitted offline are produced by the exact code that runs on the device
and cannot drift from it.

Measured leave-one-recording-out — never scored on a recording it trained on:
**100% of pen contacts kept, 86% of palm contacts stopped.**

Two things to know before retraining:

- **Two features are masked on purpose.** "How far down the page" and "how far
  to the writing-hand side" score well, because every pen drill so far was
  written across the middle — so "low and to the right" perfectly predicts palm
  *in this corpus* and predicts nothing on a real page, where people write in
  the corners. Unmasked, the fit refuses a normal stroke in the bottom-right
  outright. `test_palm.js` catches it.
- **The score is a veto, not a replacement.** The hand-written lanes decide when
  something looks like writing; the score decides whether *this* contact is the
  one doing it. The lanes already pass every recorded pen stroke; what they
  cannot do is turn a palm away.

### How palm rejection works

Every touch starts as a *probe* and has to earn the right to draw. In short: it
must move like writing (sustained speed, coherent direction, real travel), and
several independent rules can take that right away again — before or after it
starts drawing.

The rules that matter most, each found by replaying a real recording from the
device:

- **Travel is measured on the glass, not on the page.** Zoom and scroll change
  page coordinates, so a stationary contact appeared to move whenever the view
  moved — enough on its own to make a resting palm draw.
- **A pen moves and then lifts; a palm settles and stays.** A stroke that goes
  still and never recovers is removed. The call is made at the lift, because
  while both are still down a pen hesitating mid-word and a palm settling are
  arithmetically identical - the difference is only whether the contact carries
  on afterwards.
- **A small mark is judged after it has lifted.** A comma or a minus sign is too
  short and too slow to prove itself while it is being drawn, so it is allowed
  retroactively: a palm does not land, travel deliberately and leave again
  inside a fifth of a second.
- **Committing does not make a contact trustworthy.** A palm blob whose centroid
  snaps between two lobes hops 30–40px a sample; that reads as motion, so the
  check runs on committed strokes too.
- **A hand is one rigid object.** Three or more contacts moving together are one
  hand. Two are left alone — that is a pan.
- **iOS tells us.** A `touchcancel` means the system judged the touch spurious,
  so the stroke is dropped rather than committed.
- **Contacts arriving together are a hand**, not a pen tip.
- **The pen can take the ink back.** The hand usually lands before the pen tip,
  so a later contact behaving like writing can evict one behaving like a palm.

**Known ceiling:** a palm *dragged* at writing speed is indistinguishable from
writing and will draw. `scripts/test_palm.js` contains a test asserting exactly
that, so it is recorded as a limit rather than mistaken for a bug later.
