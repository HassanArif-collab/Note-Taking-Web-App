# Samsung Notes — pages, page view, home & folders (spec + build plan)

Saved 2026-09-27. Sources: the user's screen recording of Samsung Notes, the
user's written brief (verbatim at the end), and a pass over Samsung's own
help pages.

## 1. The recording

`C:\Users\hp739\Videos\Screen Recordings\Screen Recording 2026-09-27 104958.mp4`
— 8.87 s, 1506×840, a phone recording of a Samsung Notes tutorial playing on
YouTube (chapters: **page template & settings**, then **book covers**).

Frames extracted at 4 fps into `References/frames_pageadd/` (35 files,
`frame_NNNN_0.25s.png`). Key frames:

| Frame | What it shows |
|---|---|
| 0, 10, 17, 34 | Note open with the **thumbnail panel** on the left: page count ("2/4"), **Edit**, bookmark, search on top; a **two-column grid of page thumbnails** numbered underneath; the current page outlined in orange; a **"+" tile** at the end of the grid; a small bookmark badge on each thumb. |
| 15, 20 | The **page-template-and-settings popover** (caption reads "page template & settings"): **Scroll direction** = three icon buttons (one page down, one page across, two pages across), the chosen one highlighted and named below ("2-page horizontal"); **Background colour** = a row of pastel swatches with a tick on the current one and **dots for more rows**. |
| 10, 17, 20, 34 | The **two-page horizontal** view itself: two full pages side by side filling the screen, a thin gutter, the note's pink background, everything at a comfortable reading zoom. |
| 5, 30 | Chapter card "book covers" — Samsung's coloured/patterned covers for notes and folders. |

## 2. What Samsung actually offers (research)

- `samsung.com/us/support/answer/ANS10001384` — Layout + **Scroll direction**
  when creating a note; Page style = **Individual pages** or **Infinite
  scrolling page**; sort the home list by date/title; Move notes to folders;
  pinch zoom.
- `samsung.com/us/support/answer/ANS10004548` — folders and **subfolders**
  with a colour each (Manage folders → Create folder → name + colour);
  twelve page templates; template/tab/style/colour defaults; template can be
  changed before or after writing and the ink follows the template.
- YouTube summary (videohighlight, "SAMSUNG NOTES – 20 features in 11
  minutes") — ⋮ → **Page template**: blank, grid, lines, music, calendar, …;
  **Page setting** → background colour; scroll direction is 2 options in
  portrait and **3 in landscape** (the third being *2-page horizontal*).
- `insights.samsung.com` (10 tips, Mar 2025) — menu → **Page template**
  (wide/narrow lines, graph, to-do); Settings → **Page Style and Template** →
  Infinite scrolling page; menu → **Sort pages** = long-press a page and drag
  it into order; home grid shows a **miniature screenshot of each note**,
  switchable to list or thumbnails, sortable by created/modified/title.
- One UI 8 notes (`androidauthority.com`) — the default-note-style menu got a
  new landscape layout and **redesigned scroll-direction and colour
  selectors** (the popover in our frames is that redesign).

## 3. How the page is added in Samsung (from the user's description)

Not in the recording — this is how the user describes it and what must be
copied:

1. On the last page, scroll up a little: the **page lifts**, and underneath
   it a **circle with a "+"** is revealed.
2. Keep pulling. The circle grows/the page rises further.
3. Past a certain point, letting go **adds the new page with an animation**
   (it drops into place).

Our current build only stretches the end with a disc and adds the page on
release — no lifting page, no circle underneath, no arrival animation. The
user: *"for now there is nothing like this."*

## 4. Brief → where it lives

| The user's words | Status |
|---|---|
| Two-finger tap undo, three-finger tap redo | **Done** (two-finger was already there, three-finger added 2026-09-27) |
| Pages left-to-right, good animation between pages | **Done** — Page layout → Across + glide/turn |
| Two-page scroll, one view two pages | Built, **but "looking very bad on screen" → redo** (see §1 frame 20 for the target) |
| Reading mode, read only | **Done** |
| Add page by scrolling past the end | Built, **needs the Samsung lift + circle + animation** (§3) |
| Page sidebar, scroll and choose | **Done**, reshape to §1 frame 0 |
| Page templates with pictures, apply to one page or all | Backlog → **plan step 4** |
| Page colour = pick from swatches, not random; tints the whole UI | Backlog → **plan step 5** |
| Three-line menu is a bad UX; sections like Samsung's | Backlog → **plan step 6** |
| Home: rename a note there, note previews instead of a boring list, folder path, not intuitive | Backlog → **plan step 7** |
| Folders, with the scale-up animation (the animation is for folders, not pages) | Backlog → **plan step 8** |
| "+ circle" page creation | **plan step 2** |

## 5. Build plan (one at a time, each with tests)

1. **Page-view popover** — one small popover from the toolbar replacing the
   buried rows: *Scroll direction* (three icons: down / across / two pages,
   chosen one highlighted and named) and *Background colour* (swatch row, tick
   on the current, dots for more rows). It is the front door for Page layout,
   Two pages and page colour. Tests: icon states, applying each direction,
   colour swatch applies and is remembered.
2. **Page creation, Samsung's way** — pull the last page up; it lifts to show
   a "+" circle; past a mark the page drops in with an animation. Works in
   both layouts. Tests: lift distance, circle appears, release under/over the
   mark, undo, no page added in reading mode.
3. **Redo the two-page view** — match frame 20: two full pages, clean gutter,
   the note's colour, stable zoom, no page-number jump. Tests: pair turns
   together, pill reads `1 / 4  50%`, layout switch keeps the page.
4. **Template gallery with pictures** — lined, grid, dotted, blank, to-do,
   calendar shown as images; apply to *this page* or *all pages*.
5. **Page colour swatches** — a proper picker (no random-per-tap) and the
   tint follows into the interface (desk, chrome, thumbnail background).
6. **Settings screen in sections** — replace the three-line menu; every row
   labelled and explained, grouped like Samsung's (Writing / Page / Home /
   About).
7. **Home screen** — preview cards showing what is written in each note,
   rename in place, folder path, sort, grid/list.
8. **Folders** — create with name + colour, navigate in, and the scale-up
   animation when opening one.

## 6. The user's brief, verbatim (2026-09-27)

> "THis is great for using, I love it man this thing you just done, the zoom
> in the scroll with two fingers is very smooth to use man, for now we are
> adding two fingers click to undo to go to forward in time, I think we can
> add in the feature of the three fingers tap. Also, a feature of not just
> top to right pages but from left to right, and good animation while moving
> between pages. That three line menu is very bad user expereince. Not able
> to view anything what is in what setting, the samsung note have proper
> sections for all of the settings, you can check the guide on how to use
> samsung notes and then see about how the things work in there, the page
> templates got a folder with visually shown what things will look like not
> just a button with nothing on what is in it, like how would one know that
> the pages and the infinite exist, there is no kind of User exxperience and
> user interface in our current app. Aso, those notes on, I can't rename a
> while on the main page, also, that page is not intuitive, also, what is in
> the each note should be shown like the samsung have like a preview not just
> a boring list. Also, as you know the color of the pages are not visible you
> can just click on the change color and get a random color click again get a
> color not option to select. You should act as a User expereince designer,
> copy from samsung notes to know how things should work. There is a page
> template option with many pages templates, you can choose if you want to
> apply that template to one page or all of the pages. I think you should
> search for something that tells all of the features in samsung notes in
> depth and then we can copy it. Also, as you know there is a view in which
> you can see all of the pages like in the sidebar, which you can scroll to
> see or choose, them also chanignt the page color changes the whole UI color,
> I am wathcing a vidoe there is also, two page scroll where in one view you
> see two pages. A reading mode which is for the reading only no writting,
> Also, very beautifull animation of notes view scaling in beautifull scale up
> animation in a line, it is really pleaseing. Also, they have folder options
> to navigate into things, you should look at the lates images of the ui to
> recreate it. Also, createing new page is like you scroll up a bit more and
> you see a new page add circle when you scroll more another page gets added
> in it. Sorry that scale animation is for the folders not for the pages."
