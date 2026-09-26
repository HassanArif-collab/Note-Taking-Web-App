# Samsung Notes Pen Selection Tool Popup — Complete UI Specification

> Frame-verified from `Pen selection tool popup.mp4` (228.6s, 1280x720, 30fps) and Samsung Notes UPDATE tutorial transcript.

---

## 1. System Overview — Two-Mode Architecture

The Samsung Notes pen popup has **two distinct modes** that serve different purposes:

| Mode | Trigger | Position | Persistence | Purpose |
|------|---------|----------|-------------|---------|
| **Circular Disc (Radial)** | S Pen button quick-press | Centered on pen tip | Transient (auto-dismiss) | Quick color/pen/size selection |
| **Docked Sidebar** | Long-press or drag from edge | Right edge of screen | Persistent until dismissed | Full pen management, favorites, configuration |

---

## 2. Mode 1: Circular Disc (Radial Wheel)

### 2.1 Appearance
- **Shape**: Circular disc, semi-transparent/frosted glass background
- **Background**: White/light frosted glass with subtle blur (NOT dark charcoal)
- **Size**: ~180–200px diameter (on 1280×720 viewport)
- **Border**: None or very subtle 1px light gray
- **Shadow**: Soft drop shadow for depth

### 2.2 Layout (Concentric Rings)

```
            [Color Dot - Top]
                 |
    [Color] ----[CENTER]---- [Color]
     [Dot]   [Pen Icon]      [Dot]
    [Color] --[SIZE]--- [Color]
     [Dot]                 [Dot]
            [Star/Color]
```

**Center Zone (~60px diameter):**
- Active pen type icon (ballpoint tip, fountain nib, etc.)
- Shows current pen type visually

**Inner Ring (~80px from center):**
- Size indicator text (e.g., "91") displayed to the left of center
- Current pen size preview dot

**Outer Ring (~90px from center):**
- Color dots arranged in a circle (11 preset colors + current color)
- Each dot: ~14–16px diameter
- Spacing: ~30° apart around the ring

**Bottom of Disc:**
- Home icon (house shape) — returns to default state
- Pen icon — switches to pen type selection mode
- Star icon — opens favorites

### 2.3 Color Dots on Ring (11 Presets + Active)
Arranged clockwise around the outer ring:
1. Black (#000000)
2. Gray (#808080)
3. Red (#FF0000)
4. Orange (#FF8C00)
5. Yellow (#FFD700)
6. Teal (#008080)
7. Green (#00C853)
8. Blue (#2979FF)
9. Dark Blue (#1565C0)
10. Purple (#7B1FA2)
11. Pink (#E91E63)
+ Active color indicator (current selection, slightly larger)

### 2.4 Interactions
- **Tap color dot**: Selects color, dot animates to center
- **Drag along ring**: Live preview of colors as finger/S Pen moves
- **Tap center icon**: Opens pen type sub-menu
- **Tap star**: Opens favorites panel
- **Tap outside disc**: Dismisses disc
- **S Pen button quick-press**: Toggle disc open/close

---

## 3. Pen Type Selection Sub-Menu (From Disc)

### 3.1 Trigger
Tap the central pen icon while disc is open.

### 3.2 Appearance
- Replaces color dots with pen type icons in the outer ring
- Center shows the currently selected pen type
- ~7 pen type options arranged in a circle

### 3.3 Pen Types (7 visible)
1. **Ballpoint Pen** — thin tip, cylindrical body
2. **Fountain Pen** — angled nib, classic look
3. **Calligraphy Pen** — wide flat tip
4. **Pencil** — wooden body, graphite tip
5. **Highlighter** — wide chisel tip, transparent body
6. **Brush Pen** — tapered flexible tip
7. **Eraser** — rectangular block

### 3.4 Selection Behavior
- Tap a pen type to select it
- Selected pen moves to center of disc
- Disc returns to color selection mode with new pen active
- Animation: pen icons scale in from 0→1 with slight bounce

---

## 4. Size Control Mode (From Disc)

### 4.1 Trigger
Drag the size indicator or tap the size value.

### 4.2 Appearance
- Central icon changes to current pen type
- Size value displayed prominently (e.g., "91")
- Circular slider appears around the disc
- Small dots mark size steps along the arc

### 4.3 Size Steps
6 discrete thickness levels:
1. Extra Fine (~1px)
2. Fine (~2px)
3. Medium (~4px)
5. Bold (~6px)
6. Extra Bold (~8px)
7. Jumbo (~12px)

### 4.4 Interaction
- Drag clockwise = increase size
- Drag counter-clockwise = decrease size
- Size value updates in real-time
- Haptic feedback at each step boundary

---

## 5. Mode 2: Docked Sidebar

### 5.1 Trigger
- Long-press on the floating pen tool button
- Drag from right edge of screen
- Tap the dock/pin icon in the disc

### 5.2 Appearance
- **Position**: Right edge of screen, vertically centered
- **Shape**: Rounded rectangle panel
- **Width**: ~80–100px
- **Height**: ~400–500px (fills most of vertical space)
- **Background**: White/light with slight transparency
- **Border**: Subtle left border or shadow

### 5.3 Layout (Top to Bottom)

```
┌─────────────┐
│  Color      │  ← Color picker circle
│  Picker     │
├─────────────┤
│  Pen Type   │  ← Vertical list of pen types
│  Icons      │     (5-7 icons stacked)
│  ↓          │
│  ↓          │
├─────────────┤
│  Size       │  ← Size slider (vertical)
│  Slider     │     with +/- buttons
├─────────────┤
│  Opacity    │  ← Opacity slider (vertical)
│  Slider     │
├─────────────┤
│  Favorites  │  ← Star icon section
│  Grid       │     Grid of saved pens
├─────────────┤
│  [+] Add    │  ← Add new favorite
│  [×] Close  │  ← Close sidebar
└─────────────┘
```

### 5.4 Color Picker (Top of Sidebar)
- **Shape**: Circular wheel
- **Size**: ~70px diameter
- **Colors**: 11 preset colors + custom color option
- **Custom color**: Grid icon (3×3 dots) opens full color picker
- **Selection**: Tap color dot, ring highlights around selected color
- **Live preview**: Pen stroke preview updates as colors are browsed

### 5.5 Pen Type List (Vertical)
Each pen type shown as a vertical icon:
- **Ballpoint**: Thin black tip
- **Fountain**: Angled gold/silver nib
- **Calligraphy**: Wide flat tip
- **Pencil**: Wooden body with graphite
- **Highlighter**: Wide chisel tip, semi-transparent body
- **Brush**: Tapered flexible tip

Selected pen has highlighted background or border.

### 5.6 Size Slider (Vertical)
- **Orientation**: Vertical
- **Track**: Thin line, ~200px tall
- **Thumb**: Circular dot, ~16px diameter
- **Buttons**: "+" at top, "−" at bottom
- **Range**: 6 discrete steps (matching disc sizes)
- **Preview**: Line thickness preview next to slider

### 5.7 Opacity Slider (Vertical)
- **Orientation**: Vertical, below size slider
- **Track**: Gradient from transparent to opaque
- **Thumb**: Circular dot
- **Range**: 0% to 100%
- **Preview**: Stroke preview with current opacity

### 5.8 Favorites Section
- **Star icon**: Toggle favorites panel
- **Grid layout**: 4 columns × variable rows
- **Each cell**: Pen type icon + color indicator
- **Tooltip on hover**: "Pen, [Color], [Size]" (e.g., "Pen, Ultraviolet, 6")
- **Empty state**: "+" button to add first favorite

---

## 6. Favorites Management

### 6.1 "Add Favorite Pen" Panel

**Title**: "Add favorite pen" (top-left, bold)

**Layout**:
```
┌──────────────────────────────────────────┐
│ Add favorite pen                         │
├──────────────────────────────────────────┤
│ [Ballpoint][Fountain][Callig][Pencil]    │  ← Pen type row
│ [Highlight][Brush][Eraser]              │
├──────────────────────────────────────────┤
│ Size: ─────────●────────── +             │  ← Size slider
│ ════════════════════════                 │  ← Thickness preview
├──────────────────────────────────────────┤
│ ● ● ● ● ● ● ●  [⊞]                     │  ← Color palette row
├──────────────────────────────────────────┤
│ Cancel                    Done           │  ← Action buttons
└──────────────────────────────────────────┘
```

**Pen Type Row**:
- 7 pen type icons in a horizontal row
- Selected pen type has highlighted background
- Each icon: ~40×40px

**Size Slider**:
- Horizontal orientation
- Left: "−" button
- Right: "+" button
- Track: Stepped pattern showing thickness progression
- Thumb: Circular, follows the stepped pattern
- Below slider: Thick line preview of current size

**Color Palette Row**:
- 7 preset color dots in a row
- Colors: Black, Dark Gray, Blue, Blue, Purple, Red, Orange (based on frame)
- Grid icon (⊞) at right end opens full color picker
- Selected color has ring highlight

**Action Buttons**:
- "Cancel" (left) — discards changes
- "Done" (right) — saves favorite

### 6.2 Favorites Grid (Edit Mode)

**Trigger**: Tap "Edit" or long-press favorites area

**Header**:
- "⋮" (more options) icon
- "↕" (reorder/drag) icon  
- "×" (close) icon

**Grid**:
- 4 columns × 3+ rows
- Each cell: Pen icon with color indicator
- **Drag handle**: Small grip icon on each cell for reordering
- **Delete mode**: "Delete" text label appears, cells show "×" badges

**Footer**:
- "Cancel" button (left)
- "Done" button (right)
- "+" button (add new favorite)

### 6.3 Favorite Pen Properties
Each saved favorite stores:
- **Pen type**: Ballpoint, Fountain, Calligraphy, Pencil, Highlighter, Brush
- **Size**: 1–6 (discrete steps)
- **Opacity**: 0–100%
- **Color**: Hex value from palette

---

## 7. Toolbar Integration

### 7.1 Top Toolbar Pen Icons
The main toolbar shows pen-related icons:
- Pen tool icon (active pen)
-Eraser icon
- Selection tool
- Color dots (quick color access)

### 7.2 Floating Pen Button
- **Position**: Right edge of screen, middle
- **Size**: ~40px circle
- **Icon**: Pen tip symbol
- **Behavior**: Quick-press opens disc, long-press opens sidebar

### 7.3 Toolbar Dropdown Panel
When tapping pen icons in toolbar, a dropdown panel appears:

**Header**:
- Settings icon (gear)
- Edit mode toggle
- Close (×) button

**Body**:
- Grid of favorite pens (4 columns × 3 rows)
- Each cell: Pen icon + color dot
- Tooltip on long-press: "Pen, [Color], [Size]"

**Footer**:
- "+" button to add new favorite

---

## 8. Animations & Transitions

### 8.1 Disc Open Animation
- **Duration**: 200ms total
- **Scale**: 0.2 → 1.0 (ease-out)
- **Opacity**: 0 → 1 (0–120ms)
- **Transform**: 0 → 1 (160ms ease-out)
- **Color dots**: Staggered fade-in, 20ms delay per dot

### 8.2 Disc Close Animation
- **Duration**: 150ms
- **Scale**: 1.0 → 0.8 (ease-in)
- **Opacity**: 1 → 0
- **Transform**: Slight upward drift

### 8.3 Pen Type Selection Animation
- **Icon swap**: Crossfade 100ms
- **Size change**: Scale bounce (1.0 → 1.1 → 1.0) 150ms

### 8.4 Sidebar Open Animation
- **Slide in**: From right edge, 250ms ease-out
- **Backdrop**: Subtle dim overlay (optional)

### 8.5 Color Dot Selection
- **Selected dot**: Scale 1.0 → 1.3 → 1.0 (bounce)
- **Ring highlight**: Fade in 100ms around selected dot
- **Center color preview**: Crossfade 80ms

### 8.6 Favorites Panel Animation
- **Open**: Scale 0.9 → 1.0 + fade 0 → 1 (200ms)
- **Close**: Reverse of open
- **Drag reorder**: Spring physics on drop

### 8.7 Pen Stroke Preview
- **Live update**: 16ms (60fps) throttled preview updates
- **Color change**: Instant swap
- **Size change**: Smooth interpolation

---

## 9. Interaction Patterns

### 9.1 S Pen Button Behaviors
| Action | Result |
|--------|--------|
| Quick press (tap) | Toggle circular disc |
| Long press | Open docked sidebar |
| Double press | Switch between pen/eraser |
| Press while drawing | Quick color picker |

### 9.2 Touch Gestures on Disc
| Gesture | Result |
|---------|--------|
| Tap color dot | Select color |
| Drag along ring | Browse colors (live preview) |
| Tap center | Open pen type menu |
| Tap star | Open favorites |
| Tap outside | Dismiss disc |
| Swipe up | Dismiss disc |

### 9.3 Sidebar Interactions
| Gesture | Result |
|---------|--------|
| Tap pen type | Select pen |
| Drag size slider | Adjust thickness |
| Drag opacity slider | Adjust transparency |
| Tap color dot | Select color |
| Tap grid icon | Open full color picker |
| Tap star | Toggle favorites panel |
| Tap + | Add new favorite |
| Drag favorite cell | Reorder favorites |
| Tap × | Close sidebar |

---

## 10. Color System

### 10.1 Preset Colors (11)
| # | Name | Hex | Position |
|---|------|-----|----------|
| 1 | Black | #000000 | Ring position 1 |
| 2 | Gray | #808080 | Ring position 2 |
| 3 | Red | #FF0000 | Ring position 3 |
| 4 | Orange | #FF8C00 | Ring position 4 |
| 5 | Yellow | #FFD700 | Ring position 5 |
| 6 | Teal | #008080 | Ring position 6 |
| 7 | Green | #00C853 | Ring position 7 |
| 8 | Blue | #2979FF | Ring position 8 |
| 9 | Dark Blue | #1565C0 | Ring position 9 |
| 10 | Purple | #7B1FA2 | Ring position 10 |
| 11 | Pink | #E91E63 | Ring position 11 |

### 10.2 Color Picker Wheel (Sidebar)
- Full hue ring with saturation/brightness square
- Hex value display
- Recent colors row
- RGB/HSB sliders

### 10.3 Color Indicator
- **Disc mode**: Large dot on outer ring
- **Sidebar mode**: Dot in color picker wheel
- **Toolbar**: Color dot in toolbar shows current color

---

## 11. Pen Type Icons (Visual Descriptions)

### Ballpoint Pen
- Thin cylindrical body
- Small rounded tip
- Metal clip
- Color: Silver/gray body with colored tip

### Fountain Pen
- Wider body with angled nib
- Gold/silver nib detail
- Classic pen shape
- Color: Black body with gold nib

### Calligraphy Pen
- Wide flat tip (chisel shape)
- Thicker body
- Color: Dark body with wide tip

### Pencil
- Wooden hexagonal body
- Graphite tip
- Pink eraser at end
- Color: Yellow/wood body

### Highlighter
- Wide chisel tip
- Semi-transparent body
- Bright color (yellow/green/pink)
- Color: Matches ink color

### Brush Pen
- Tapered flexible tip
- Thicker body
- Color: Dark body with flexible tip

### Eraser
- Rectangular block shape
- Pink/white color
- Flat edges

---

## 12. Positioning & Sizing

### 12.1 Disc Position
- **Default**: Centered on S Pen tip position
- **Boundary**: Stays within screen bounds
- **Offset**: ~20px above pen tip to avoid occlusion

### 12.2 Disc Dimensions
- **Diameter**: 180–200px (1280×720 viewport)
- **Color dot size**: 14–16px diameter
- **Center icon size**: 40–50px
- **Spacing between rings**: 30–40px

### 12.3 Sidebar Dimensions
- **Width**: 80–100px
- **Height**: 400–500px (or fit content)
- **Position**: Right edge, vertically centered
- **Margin from edge**: 0–10px
- **Border radius**: 12–16px

### 12.4 Favorites Grid
- **Cell size**: 60×60px
- **Gap**: 8–10px
- **Columns**: 4
- **Rows**: Variable (scrollable)

---

## 13. States & Transitions

### 13.1 Disc States
1. **Closed**: Not visible
2. **Opening**: Scale 0.2→1, fade in
3. **Open (Color Mode)**: Full disc with color ring
4. **Open (Pen Type Mode)**: Pen icons in ring
5. **Open (Size Mode)**: Size slider visible
6. **Closing**: Scale 1→0.8, fade out

### 13.2 Sidebar States
1. **Closed**: Not visible
2. **Opening**: Slide in from right
3. **Open (Default)**: Full sidebar visible
4. **Open (Favorites Expanded)**: Favorites grid visible
5. **Open (Add Favorite)**: Configuration panel visible
6. **Closing**: Slide out to right

### 13.3 Favorites Panel States
1. **Collapsed**: Star icon only
2. **Expanded**: Grid visible
3. **Edit Mode**: Drag handles and delete badges visible
4. **Add Mode**: "Add favorite pen" panel visible

---

## 14. Visual Theme

### 14.1 Background
- **Disc**: Semi-transparent white/frosted glass (rgba(255,255,255,0.85))
- **Sidebar**: White (#FFFFFF) with subtle shadow
- **Panels**: White with 1px light gray border

### 14.2 Text
- **Primary**: Dark gray (#333333)
- **Secondary**: Medium gray (#666666)
- **Size value**: Bold, dark (#000000)

### 14.3 Icons
- **Color**: Dark gray/black (#333333)
- **Active state**: Blue (#2979FF) highlight
- **Inactive**: Gray (#999999)

### 14.4 Shadows
- **Disc**: 0 4px 16px rgba(0,0,0,0.15)
- **Sidebar**: -2px 0 12px rgba(0,0,0,0.1)
- **Panels**: 0 2px 8px rgba(0,0,0,0.12)

### 14.5 Border Radius
- **Disc**: 50% (perfect circle)
- **Sidebar**: 12–16px
- **Buttons**: 8px
- **Color dots**: 50% (circles)

---

## 15. Accessibility

### 15.1 Touch Targets
- Minimum 44×44px for all interactive elements
- Color dots: 44px hit area (even if visual is 16px)

### 15.2 Screen Reader
- All buttons have aria-labels
- Color names announced on selection
- Size values announced

### 15.3 High Contrast
- Focus indicators on all interactive elements
- Minimum 3:1 contrast ratio for borders
- Minimum 4.5:1 contrast ratio for text

---

## 16. Implementation Notes

### 16.1 CSS Architecture
```css
/* Disc container */
.pen-wheel {
  position: fixed;
  width: 200px;
  height: 200px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(10px);
  box-shadow: 0 4px 16px rgba(0,0,0,0.15);
  transform: scale(0.2);
  opacity: 0;
  transition: transform 0.16s ease-out, opacity 0.12s;
}

.pen-wheel.active {
  transform: scale(1);
  opacity: 1;
}

/* Color ring */
.pen-wheel-colors {
  position: absolute;
  width: 100%;
  height: 100%;
}

/* Color dot */
.color-dot {
  position: absolute;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  transition: transform 0.15s ease;
}

.color-dot.selected {
  transform: translate(-50%, -50%) scale(1.3);
}

/* Center pen icon */
.pen-center {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 50px;
  height: 50px;
}
```

### 16.2 JavaScript Interaction
```javascript
// Disc toggle
function togglePenDisc() {
  const disc = document.getElementById('penWheel');
  disc.classList.toggle('active');
}

// Color selection
function selectColor(color) {
  document.documentElement.style.setProperty('--pen-color', color);
  // Update center preview
  // Animate selection
}

// Size adjustment
function adjustSize(size) {
  document.documentElement.style.setProperty('--pen-size', size);
  // Update preview stroke
}
```

### 16.3 Animation Libraries
- Use CSS transitions for simple animations
- Use Web Animations API for complex sequences
- Use `requestAnimationFrame` for live previews
- Consider `framer-motion` or `gsap` for spring physics

---

## 17. Differences from Current Codebase

The current `index.html` implementation uses:
- **Dark charcoal theme** (#202227) — Samsung uses **light/frosted glass**
- **Single circular disc** — Samsung has **two modes** (disc + sidebar)
- **No favorites system** — Samsung has **full favorites management**
- **No size/opacity sliders** — Samsung has **dedicated sliders**
- **No pen type sub-menu** — Samsung has **pen type selection in disc**

**Key changes needed**:
1. Switch from dark to light/frosted glass theme
2. Add docked sidebar mode
3. Implement favorites grid with add/edit/delete
4. Add size and opacity sliders
5. Add pen type selection sub-menu
6. Implement drag-to-reorder for favorites
7. Add color picker wheel in sidebar
8. Add S Pen button event handling
9. Implement staggered animations for disc open
10. Add tooltip support for favorites

---

## 18. Reference Frames Summary

| Frame | Time | Shows |
|-------|------|-------|
| f_0040.0s | 40s | Circular disc with color ring, frosted glass |
| f_0045.0s | 45s | Horizontal pen type tray (7 pens) |
| f_0050.0s | 50s | Favorites tray with + button |
| f_0055.0s | 55s | Size control mode, value "91" |
| f_0060.0s | 60s | Color preview circle in disc |
| f_0070.0s | 70s | Pen tray with colored highlights |
| f_0080.0s | 80s | Toolbar dropdown with favorites grid |
| f_0085.0s | 85s | "Add" / "Delete" edit mode |
| f_0090.0s | 90s | Favorites grid with Cancel/Done |
| f_0095.0s | 95s | Pen grid with Delete mode |
| f_0100.0s | 100s | "Add favorite pen" configuration panel |
| f_0110.0s | 110s | Favorites grid with tooltip "Pen, Ultraviolet, 6" |
| f_0120.0s | 120s | Horizontal pen tray (5 pens) |
| f_0130.0s | 130s | Circular disc with drawing preview |
| f_0160.0s | 160s | Circular disc with brown pen |
| f_0170.0s | 170s | Color picker wheel in top-right |
| f_0180.0s | 180s | Color picker with red selected |
| f_0190.0s | 190s | "Add favorite pen" with red colors |
| f_0200.0s | 200s | Color picker wheel (expanded) |
| f_0210.0s | 210s | Docked sidebar with pen types |

---

*Specification generated from frame analysis of Samsung Notes pen selection tool popup video.*
*All measurements approximate, based on 1280×720 viewport.*
