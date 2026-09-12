# MathNotes

A single-file, dependency-free HTML5 handwriting app for taking math notes.
Built specifically for **Safari 9 on iOS 9.3.5** (iPad 3rd generation, 2012).

The entire app is one file: [`index.html`](./index.html). No build step, no
frameworks, no npm install, no Service Worker. Open it in Safari and it works.

---

## Why this exists

The target user is a university math student whose only writing device is a
2012 iPad stuck on iOS 9.3.5. The App Store rejects every modern app
("not compatible"), so the only path is a plain web page that uses APIs Safari 9
already understands: Touch Events, Canvas 2D, `localStorage`, and `toDataURL`.

Everything is written in strict ES5. The forbidden list is enforced by code
review (no `let`/`const`, no arrow functions, no template literals, no Promises,
no fetch, no Pointer Events, no Service Workers, no CSS Grid, no frameworks).

---

## Run it locally

Just open `index.html` in any browser. For desktop testing of the touch path,
use Chrome DevTools device emulation, or just use the mouse — mouse events are
wired into the same drawing engine as touch events.

---

## Desktop testing checklist (verify before deploying)

Run through these on a laptop with a mouse before pushing to the web host:

1. **Page loads with no console errors.** Open DevTools → Console. Should be
   completely clean.
2. **Pen draws a smooth stroke.** Click and drag on the canvas. Stroke should
   be smooth (quadratic curves), not jagged.
3. **Single click makes a dot.** Click once without moving. A filled dot
   should appear (single-point stroke renders as a small circle).
4. **Three colors work.** Click black, blue, red in turn and draw a stroke
   with each. Active color button shows a white border + blue ring.
5. **Three widths work.** Click S, M, L and draw. Strokes should be visibly
   different thickness.
6. **Selecting a color or width auto-switches back to Pen tool** if you were
   in Eraser mode.
7. **Object eraser deletes whole strokes.** Switch to Erase, click on any
   stroke. The whole stroke disappears, not just a piece.
8. **Undo after draw.** Draw a stroke, tap Undo. Stroke vanishes.
9. **Undo after erase.** Draw 3 strokes, erase the middle one, tap Undo.
   The middle stroke should reappear.
10. **Undo after clear.** Draw several strokes, tap Clear, confirm. Canvas
    empties. Tap Undo. All strokes should come back.
11. **Multiple undo levels.** Draw 5 separate strokes. Tap Undo 5 times.
    Each tap removes one stroke. Tap Undo a 6th time — nothing happens
    (stack empty).
12. **Clear confirms.** Tap Clear. A `confirm()` dialog appears. Cancel it
    — nothing deleted. Tap Clear again, confirm — strokes gone.
13. **Page navigation.** Tap Next. Page indicator changes to "2 / 50".
    Draw something. Tap Prev. Canvas should be empty (different page).
    Tap Next — your drawing is still there (page 2 was auto-saved).
14. **Mid-stroke page switch flushes.** Start drawing a stroke, and while
    still dragging, use the keyboard or click Next. The in-progress stroke
    is finalized on the original page, not the new one.
15. **Two rapid strokes.** Draw stroke A, lift mouse, immediately draw
    stroke B. Both should be on the canvas, neither corrupted.
16. **PNG export.** Tap PNG. An overlay appears with an `<img>` of the
    current page and the instruction text. On desktop, right-click the
    image → Save Image As. Tap Close to dismiss.
17. **Resize re-renders.** Resize the browser window. Canvas resizes and
    all strokes re-render correctly.
18. **Private mode / storage failure.** In Chrome, open DevTools →
    Application → Storage → check "Block cookies/site data" (or use
    Incognito with a tweak). Reload. A yellow warning bar should appear
    at the top, and the app should still work — just not persist.
19. **Persistence.** Draw something, refresh the page. Stroke should
    reappear.
20. **Persistence across pages.** Draw on page 1, go to page 5, draw
    something different, refresh. You should land on page 5 with its
    own strokes. Go back to page 1 — its strokes are still there.

---

## Deployment to GitHub Pages (recommended free host)

### Why GitHub Pages

| Host | HTTPS | TLS works on Safari 9 | Free | No credit card | Reachable from Pakistan |
|---|---|---|---|---|---|
| **GitHub Pages** | Yes | Yes (TLS 1.2) | Yes (public repo) | Yes | Yes |
| Neocities | Yes | Maybe (cipher drift) | Yes | Yes | Yes |
| Netlify Drop | Yes | Yes | Yes | Yes | Yes |
| Cloudflare Pages | Yes | Risky (may force TLS 1.3) | Yes | Yes | Yes |

**Recommendation: GitHub Pages.** The repo is already on GitHub, so it's
literally one toggle. TLS 1.2 is supported, which Safari 9 requires. No
cipher drift risk. Free forever for public repos. Reachable from Pakistan
without VPN.

### Click-by-click deploy

You already have the code in this repo (the file is `index.html`). To publish
it as a website:

1. Open https://github.com in Safari or any browser. Log in.
2. Go to your repo: **HassanArif-collab/Note-Taking-Web-App**.
3. Click the **Settings** tab (top right of the repo page, not the account settings).
4. In the left sidebar, click **Pages** (under "Code and automation").
5. Under **Build and deployment → Source**, pick **Deploy from a branch**.
6. Under **Branch**, select `main` and `/ (root)` folder.
7. Click **Save**.
8. Wait 30–90 seconds. Refresh the page. A green box will appear with the URL:
   `https://hassanarif-collab.github.io/Note-Taking-Web-App/`
9. Open that URL in Safari on the iPad. The app should load.

### Add to Home Screen (iPad) — makes it feel native

1. Open **Safari** on the iPad (not Chrome — only Safari can install web apps).
2. Type the GitHub Pages URL into the address bar.
3. Wait for the page to fully load.
4. Tap the **Share icon** (square with an up-arrow, top of the Safari toolbar).
5. In the share sheet, scroll down and tap **Add to Home Screen**.
6. Edit the name if you want (default is "MathNotes").
7. Tap **Add** in the top right.
8. You now have a MathNotes icon on your home screen. Tap it — the app
   opens in fullscreen, no Safari chrome, status bar black.

---

## V2 Roadmap (advice only — not built)

### (a) "Access my notes from anywhere"

**Problem.** `localStorage` is per-device. Clear Safari data, switch iPads,
or even just clear website data once and the notes are gone.

**Constraint you cannot escape.** Modern sync SDKs (Firebase JS SDK v9+,
Supabase JS v2, AWS Amplify) all use `fetch` + Promises + ES modules. None
of these run on Safari 9. **Do not** try to load them. They will silently
fail with a white screen.

**What WILL work on Safari 9.** Hand-rolled XHR against a REST endpoint,
JSON in / JSON out. Two practical options:

1. **Supabase REST.** Skip the JS SDK entirely. Use the auto-generated
   PostgREST endpoint: `https://YOUR-PROJECT.supabase.co/rest/v1/notes`.
   - Auth: anon key in the `apikey` header. For login, hit the Supabase
     auth REST endpoint (`/auth/v1/token?grant_type=password`) with XHR.
   - Payload: store one row per page: `{ user_id, page_index, strokes_json }`.
   - The Supabase REST API returns plain JSON. `JSON.parse(xhr.responseText)`
     is all you need.
   - **Caveat:** Supabase's TLS may stop supporting Safari 9's ciphers at some
     point. Test before relying on it.

2. **Tiny custom backend.** A free Render/Railway/Cloudflare Worker that
   exposes 3 endpoints: `/login`, `/get?since=TIMESTAMP`, `/save` (POST
   JSON). Store notes as a JSON blob keyed by user. Cloudflare Workers
   support TLS 1.2 and are free up to 100k req/day.

**Recommended path.** Start with Supabase REST because it needs zero
backend code. Write a thin `sync.js` module using only XHR that:
- On boot, fetches the latest pages JSON for the logged-in user.
- On every `saveToStorage()` call, also fires a debounced XHR PUT to the
  REST endpoint.
- Handles 401 by showing a "log in" overlay.

Keep the sync layer behind a feature flag so the app still works offline
when the user is not logged in.

### (b) "No data loss even when offline"

**What Safari 9 gives you for free.** The app is a static HTML file, so
once it's loaded (or cached via "Add to Home Screen"), it opens without
network. Notes are already in `localStorage`, which works offline. So
the offline baseline is actually OK.

**What Safari 9 cannot give you.** No Service Workers — so you can't
programmatically cache the HTML file from JS. If the user clears Safari
cache, the next open requires network to re-download the HTML. Add to
Home Screen works around this (the icon launches from a cached copy).

**Recommended v1.5 safety net — manual Backup / Restore.** Because
`<a download>` does not work on Safari 9, you cannot trigger a file
download. Two workarounds that DO work on Safari 9:

1. **Long-press image trick (per-page).** Already implemented in v1 for
   single-page PNG. For full backup, generate one giant PNG per page (or
   a grid of all 50 pages) and show them in the export overlay. User
   long-presses each → Save Image → manually saved to Photos.

2. **JSON copy-paste block (full backup, recommended).** Add a "Backup
   All" button that:
   - Stringifies all 50 pages into one JSON string.
   - Shows it in a `<textarea>` (read-only, full-screen overlay).
   - User taps "Select All" → "Copy".
   - User pastes into Notes app / email / anywhere.
   To restore, "Restore" button shows an empty `<textarea>`, user pastes
   JSON, taps "Restore" — `JSON.parse` + `loadFromStorage`-style merge.

**Queue for sync.** When you build the sync layer in (a), keep a local
`pendingSync` array in `localStorage`. Every stroke change pushes an entry.
When XHR succeeds, pop the entry. When offline, the queue just grows; on
reconnect, drain it. This way nothing is lost during offline windows.

### (c) "Premium smooth iPhone-like look"

**Good news: the engine never needs to change.** v1 deliberately separates
Section A (engine: touch, stroke model, storage, rendering) from Section B
(toolbar/UI: button wiring, tool state). To reskin, you only touch:

- The CSS block at the top of `<style>`.
- The toolbar HTML markup.
- The `initUI()` function (button IDs / classes).

**Recommended v2 design tokens** (Safari 9 supports all of these):

- **Palette:** dark toolbar `#1c1c1e`, accent `#0a84ff`, surface `#2c2c2e`,
  canvas `#ffffff` (light) and `#000000` (dark mode if you want).
- **Typography:** `-apple-system` font stack — already used.
- **Translucency:** `background: rgba(44,44,46,0.85); -webkit-backdrop-filter:
  blur(20px) saturate(180%);` — works on Safari 9. Apply to toolbar.
- **Spacing:** 8 / 12 / 16 / 24 px scale.
- **Corner radius:** 8 / 12 / 16 px scale.
- **Animations:** CSS transforms only. `transition: -webkit-transform 200ms
  cubic-bezier(0.4, 0, 0.2, 1);` for button press feedback (`scale(0.96)`
  on `:active`). Avoid animating `top`/`left`/`width`/`height` — they cause
  layout thrash. Only animate `transform` and `opacity`.
- **Touch feedback:** `-webkit-tap-highlight-color: rgba(255,255,255,0.08)`
  on buttons (already set).

**iOS-style niceties you can add without rewriting the engine:**

1. **Springy toolbar hide.** When user starts a stroke, slide the toolbar
   down with `-webkit-transform: translateY(60px)` and grow the canvas.
   On stroke end, slide it back. Pure CSS, pure transform.
2. **Page-flip transition.** When navigating pages, animate the canvas
   with `-webkit-transform: translateX(±100%)` then snap to new page.
3. **Color picker as a popover.** Long-press the color button to open a
   palette sheet (more than 3 colors). Use CSS transform animations only.
4. **Dark mode.** Add a CSS class on `<body>` to flip the canvas background
   to `#000000` and the strokes to light variants. Store the preference
   in `localStorage`.

All of this is possible without touching Section A. The engine doesn't
care what color the toolbar is or how the buttons animate.

---

## Known limitations of v1

These are intentional scope cuts. v1 is functional, not pretty.

1. **No palm rejection.** A palm resting on the canvas while writing will
   draw an unwanted stroke. Workaround: write with the iPad flat and lift
   your palm.
2. **No pressure sensitivity.** The iPad 3's screen + a capacitive stylus
   cannot detect pressure. Stroke width is fixed per stroke.
3. **Rendering re-renders the whole page on each touchmove.** Fine for
   ~30 strokes per page; will lag if a page has hundreds of long strokes.
   v2 should cache a snapshot of the committed strokes and only redraw
   the in-progress stroke on top.
4. **Undo stack is per-page and in-memory only.** If you reload the page
   or close Safari, undo history is lost. Strokes themselves persist.
5. **No infinite scroll / canvas pan.** The canvas is exactly the size
   of the screen. Long derivations need to span multiple pages.
6. **No pinch-to-zoom on the canvas.** Blocked intentionally (it would
   conflict with iOS gesture handling). If you need finer detail, switch
   to a smaller stroke width.
7. **localStorage limit ~5 MB.** ~50 pages × 50 strokes × 50 points each
   is roughly 1–2 MB, well within the limit. Heavy users could exceed
   it. The app shows a warning when `setItem` throws.
8. **Export is current-page PNG only.** No PDF export, no multi-page
   export, no vector (SVG) export. v1.5 should add JSON backup (see V2
   roadmap).
9. **No text typing.** Pure handwriting. If you want to mix typed text,
   write a v2 layer that renders typed text as a stroke approximation.
10. **Single-touch only.** Two-finger gestures are not interpreted.
    A second finger during a stroke will not draw a second stroke (the
    first touch owns the gesture).
11. **No shape recognition.** Hand-drawn circles stay hand-drawn. A v2
    "shape snap" feature could detect approximate circles/lines and
    snap them to perfect shapes.
12. **Status bar overlap.** In standalone (Add to Home Screen) mode with
    `apple-mobile-web-app-status-bar-style: black`, the canvas starts
    below the status bar — no overlap. In Safari browser mode, the URL
    bar takes the top. Either way, no strokes are hidden, but the very
    top of the canvas is close to the system UI.
13. **PNG export resolution = canvas pixels.** On Retina iPad 3 the PNG
    is 2048×~1400, which is fine for notes but not print-quality.
14. **GitHub Pages requires internet to load the first time.** After
    "Add to Home Screen", the cached copy opens offline. But if Safari
    cache is cleared, the next open needs network.
