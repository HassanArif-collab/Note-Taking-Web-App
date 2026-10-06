# Backlog — Samsung Notes features still to build

Saved 2026-09-26 from the user's wish list. Refreshed 2026-09-27 from the
user's actual brief, a screen recording of Samsung Notes (frames in
`References/frames_pageadd/`) and a pass over Samsung's help pages — the
understanding and the build order are in
`References/SAMSUNG_NOTES_PAGES_HOME_SPEC.md`.

Build one at a time, copying how Samsung Notes does it.

## Gestures and pages
- ~~**Three-finger tap = redo** (two-finger tap is already undo).~~ **Done** —
  a tap with three fingers redoes what the two-finger tap undid; fingers that
  moved are a drag, never a tap.
- ~~**Pages side by side**: scroll pages left to right as well as top to bottom,
  with a smooth page-turn animation.~~ **Done** — ⋮ menu → Page layout → Across
  lays the pages across the screen (the note's own layout, saved with it, one
  undo back), and turning to a page or flicking across glides to it.
- **Two-page view — removed.** It looked bad on screen; the user asked for it
  gone. Pages still move horizontally (Page layout → Across) and turn with a
  glide, but there is no two-pages-to-a-screen view any more.
- ~~**Add a page the Samsung way**: the last page lifts to reveal a "+"
  circle, and past a mark the new page drops in with an animation.~~ **Done,
  reworked** — the lift is the scroll sitting past the edge, so the page
  follows the finger directly; the disc is a **ring that fills** as you pull
  and turns blue with a "Release to add" label when it is full. Pulling back
  down lets the lift fall, so releasing on the way down makes no page.
- ~~**Page sidebar**: thumbnails of every page in a side strip to scroll and jump.~~
  **Done** — the tab on the left edge opens a strip of thumbnails; the paper
  slides aside for it. Reshape it to Samsung's panel (frame 0): page count,
  Edit, bookmark and search along the top, a **two-column grid of numbered
  thumbnails**, the current page outlined, a **"+" tile** at the end.
- ~~**Reading mode**: view only, no writing.~~ **Done** — the hand takes the
  tool, undo, page edits, rename and the rows that change the note are all
  refused; the Reading chip (or the menu row) is the way out.

## Page view popover (from the recording, frames 15 and 20)
- A small popover from the toolbar — Samsung's "page template & settings" —
  replacing the rows buried in the three-line menu:
  - **Scroll direction**: three icon buttons — one page down the screen, one
    page across, two pages across — the chosen one highlighted and named
    underneath. It becomes the front door for Page layout and Two pages.
  - **Background colour**: a row of pastel swatches with a tick on the
    current one and dots for more rows (Samsung shows four rows).

## Page look
- **Template gallery** with pictures of each template (lined, grid, dotted,
  blank, to-do, calendar, Pages or Infinite) instead of plain buttons; apply
  to this page or to all pages.
- **Page colour picker**: choose from swatches, not a random colour per tap.
- Changing the page colour tints the whole interface to match.

## Menus and home screen
- ~~Replace the three-line menu with a proper **Settings screen in sections**,
  each setting explained, grouped like Samsung's (Writing / Page / Home /
  About).~~ **Done** — the ⋮ button opens a settings screen in six sections
  (Writing / Page / Note / Display / Advanced / About), every row labelled,
  valued and explained in a line under it.
- ~~**Home screen like Samsung's**: a grid of **note previews** showing what
  is written in each note, not a plain list.~~ **Done** — each card carries a
  miniature of the note's first page, drawn from the same paper and strokes.
- ~~**Rename a note from the home screen.**~~ **Done** — a pencil on the card.
- **Sort** the home list (favourites / title / date) and a **grid/list** toggle.
  **Done** — both in the header, remembered.
- **Folders** open with Samsung's scale-up animation (the scale animation is
  for folders, not pages). **Done** — opening a folder scales the notes up into
  place.
- A **"Folders > ..." path** and folder cards (count and name, coloured tab)
  on the home screen — the notebooks drawer covers most of this; a breadcrumb
  path under the title is still missing.

## Research finds worth copying
- **Sort pages**: long-press a thumbnail and drag it into order.
- **Note covers / book covers** (the recording's next chapter): a coloured or
  patterned cover per note and per folder.

## Built 2026-09-29 from `References/Samsung Notes.html`
- **Home rebuilt** — rail (search, All notes, Favorites, Trash, folders with
  colours), page miniatures 2–6 across, sort menu, grid/list, ⋯ menu per note
  and per folder, long-press multi-select with the blue bar, **Trash** with
  Undo and 30 days, the app's own dialogs instead of browser prompts.
- **PDF import** (page chooser; new note, or into a note after/onto a page),
  PDF pages locked under the ink.
- **Split view** — a PDF or picture beside the note, four placements,
  resizable, zoom.
- **Shapes** — triangles, tilted boxes, diamonds, pentagons, hexagons,
  circles/ellipses at any angle, arcs, angles, levelled lines, sharp corners.

## Still in that brief — the user chooses what is next
1. **Lock notes** with a password (padlock on the card, hidden miniature).
~~**Sort pages** — reorder / duplicate / delete pages from a thumbnail grid.~~ **Done 2026-09-30.**
~~**Selection bubble extras** — change colour, straighten, copy between notes.~~ **Done 2026-09-30.**
4. **Typed text formatting** — bold/italic/underline, bullet and checkbox lists.
5. **Voice recording** in a note, with a player chip.
~~**Sticky notes** — small coloured memo cards on the page.~~ **Done 2026-09-30.**
7. **Search inside notes** — typed text now; handwriting needs recognition.
8. **Export** — save a note as PDF or images, share sheet.
9. **Camera** — photograph a page straight into the note.
10. **Page templates gallery upgrade** + **landscape pages**.
~~**Note covers** for notes and folders.~~ **Done 2026-09-30.**
12. **Handwriting to text** (hard offline on an iPad 3).

## Built 2026-09-30
- **Maths answers** (Samsung's Turn on math): end a sum with = and the answer
  shows in blue, then fades. Teach my handwriting learns the user's own digits.
- **Neaten** replaced Tidy: smooth shaky strokes, each line levelled and put on
  its rule as one piece.

## Built 2026-10-01
- **Maths answers that learn**: a trained reader, the working for multi-step
  sums, Keep (full working or answer) and Fix; lasso rotate.
- **Neaten that learns the writer**: words set back on the line and their
  lean evened, by how much the note shows they wander and how precisely each
  was measured; touching strokes and dots kept together; no snapping one
  line into another. Measured with `scripts/neatcv.js` on the reference
  lines (normal-speed takes now sit as straight as the careful ones).
  Not done: evening word sizes - read off a few letter tops it misjudged
  short words and blew one up into its neighbour; would need a sturdier
  measure first.

## Fixed 2026-10-02 (reported from the iPad, measured on the recordings)
- **Two-finger zoom and scroll** with the palm on Auto: fingers at a slant
  were taken for the hand, and a pinch slower than 45px a quarter-second
  never counted. Recorded Auto zooms: 4 of 7 worked, now 7 of 7
  (`scripts/gesturecv.js`). With the lasso a second finger landing late
  started a second lasso; now it scrolls or zooms once both move.
- **Writing that vanished and came back**: on Auto, a word started lower down
  the page was kept out of sight stroke by stroke for 2.5s each. Two real
  strokes on one line now show the line at once.
- **Keep (and every button) with the hand resting**: a tap was only a tap
  when it was the only touch on the glass.

## Fixed and built 2026-10-02, afternoon (reported from the iPad)
- **Pen pop-up with the lasso or eraser**: in Auto the hold had to be on the
  line being written, which a lasso or eraser never is, so it never opened.
  An eraser that opened it also kept erasing on its way to a colour.
- **Zoom in the corner**: always shows the zoom; − and + step it, the number
  goes back to 100%.
- **Zoom window**: the strip showed the big writing only after the pen
  lifted, then redrew every stroke near the box (305 a frame on a full page);
  it draws under the pen now from a cached picture (3.3ms -> 0.1ms a frame).
  Two fingers on the page above pinch and scroll it.
- **Sticky notes**: an open one is dragged by its top strip, a folded one by
  any of it.
- **Maths Fix → Not part of it**: leaves a stray or far-off mark out, and
  learns the writer's reach or the shape as no symbol.

## Fixed 2026-10-06 (reported: "storage is full at 5MB", "the home-screen icon has none of the new features")
- **No more 5 MB ceiling**: notes move into the iPad's WebSQL database on the
  first start, by themselves - unlimited from the home-screen icon (iOS 9.3.2+),
  50 MB in Safari. localStorage keeps only the index and a passing copy.
- **The home-screen icon stays current**: it looks for a new version each time
  it comes back to the front, puts a downloaded one in place as it comes back,
  and Settings > Check for updates shows the version and gets past a stale cache.

## Pen pop-up extras (seen in the videos)
- ~~Favourite pens inside the pop-up, each with its own colour.~~ **Done** —
  the pop-up's star opens a grid of favourite pens saved whole (type, colour
  and width together) with add / edit / delete, and the docked sidebar keeps
  them in a row. Opacity is done too: a 0.1×–1× dial on the sidebar that
  multiplies the pen's own alpha.
- Colour palette sets ("Select color sets to show"), an eyedropper.
- Line styles (solid, dashed, dotted) and a "Straighten lines" toggle.
- Pen pictures made by AI, if the drawn ones are not good enough.
