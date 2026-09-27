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
- **Two-page view — built, but it looks bad on screen.** Redo it Samsung's
  way (recording frame 20): two full pages side by side filling the view, a
  thin clean gutter, the note's own background colour, a stable comfortable
  zoom, and the page pill counting pairs (`1 / 4  50%`).
- **Add a page the Samsung way** (replaces the plain pull): on the last page,
  scroll up a little and the **page lifts to reveal a "+" circle underneath**;
  keep pulling past a mark and the new page **drops in with an animation**.
  The stretch-and-disc exists but the lift, the circle and the arrival
  animation do not — the user reports "there is nothing like this".
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
- Replace the three-line menu with a proper **Settings screen in sections**,
  each setting explained, grouped like Samsung's (Writing / Page / Home /
  About).
- **Home screen like Samsung's** (reference: the user's "Folders" screenshot):
  big "Folders" title with counts, folder cards (count and name, coloured tab),
  a "Folders > ..." path, sort by title, and a grid of **note previews**
  showing what is written in each note, not a plain list.
- **Rename a note from the home screen.**
- **Folders** open with Samsung's scale-up animation (the scale animation is
  for folders, not pages).

## Research finds worth copying
- **Sort pages**: long-press a thumbnail and drag it into order.
- **Note covers / book covers** (the recording's next chapter): a coloured or
  patterned cover per note and per folder.

## Pen pop-up extras (seen in the videos)
- ~~Favourite pens inside the pop-up, each with its own colour.~~ **Done** —
  the pop-up's star opens a grid of favourite pens saved whole (type, colour
  and width together) with add / edit / delete, and the docked sidebar keeps
  them in a row. Opacity is done too: a 0.1×–1× dial on the sidebar that
  multiplies the pen's own alpha.
- Colour palette sets ("Select color sets to show"), an eyedropper.
- Line styles (solid, dashed, dotted) and a "Straighten lines" toggle.
- Pen pictures made by AI, if the drawn ones are not good enough.
