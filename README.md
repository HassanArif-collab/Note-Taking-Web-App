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

### Tools

| Tool | What it does |
|------|--------------|
| **Pen** | Write. Tap again to open the pen tray. |
| **Eraser** | Rub out strokes. Stroke mode removes a whole line, Area mode rubs out what you touch. |
| **Lasso** | Draw a loop around ink to select it, then drag to move, pinch the corner handle to resize, or duplicate/delete. |
| **T (text)** | Tap the page and type. Text behaves like ink — movable, erasable, selectable. |
| **Hand** | One finger drags the paper instead of drawing. Double-tap resets zoom. |
| **Undo / Redo** | Up to 60 steps. |

### Gestures

- **Two fingers** — pinch to zoom (60%–260%), drag to scroll.
- **Two-finger tap** — undo. The fastest way to remove a stray palm mark.
- **Double-tap with the hand tool** — back to 100%.

### Pages

Tap the **page pill** (bottom left), or **Pages** in the menu:

- a **number** jumps to that page
- **+** inserts a blank page here and pushes everything below it down
- **-** deletes this page (it asks first, and says how many marks are on it)

Both are a single undo.

### Notebooks and folders

The **menu button** (top left) opens the notebook drawer. The **folder button**
in its header puts the current notebook inside another, or back at the top
level. A folder cannot be put inside its own child.

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
| **Max** (default) | Normal. Use this. |
| **Strict** | Refuses more of your hand, but also refuses very slow deliberate strokes. Turn it on if your palm marks the page more often than your slow strokes matter. |
| **Off** | Everything draws. For testing, or with a mouse. |

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

The app records itself continuously — the last ~25 seconds of touch input, all
the time. When something goes wrong:

1. **Undo the bad mark first.** That tells the app the mark was wrong, which is
   the only way it can learn which contact was your palm.
2. ⋮ menu → **Copy report** → the text is pre-selected, copy and paste it.

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

### Features

- **Zoom window** — write large in a strip at the bottom and have it land small
  on the page. The most useful thing left: a disc stylus cannot write small, and
  maths needs small.
- Reorder pages, and a page thumbnail view.
- Better export: multi-page PDF instead of the 4-page PNG cap, which may fail
  outright on this iPad because it builds one enormous canvas.
- Copy and paste between notes.
- A ruler / straight-edge.
- Drag notebooks in the drawer instead of typing a number.

---

## For developers

One file, `index.html`. Inline CSS, inline ES5 JavaScript. No build step, no
dependencies.

```
node scripts/check_es5.js     # Safari 9 gate - run before every push
node scripts/test_palm.js     # palm-rejection behaviour (51 assertions)
node scripts/test_recorder.js # recorder and pinch-zoom (21 assertions)
node scripts/replay.js FILE   # replay a recorded touch trace
```

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
