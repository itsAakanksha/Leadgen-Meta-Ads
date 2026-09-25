# Design System: Lead Intake

The single source of truth for how Lead Intake looks and moves. Tokens live in
`src/index.css`; this file explains them. When the two disagree, fix one of them.

## 1. Visual Theme & Atmosphere

**Soft Structuralism.** A calm, machined workspace for people who triage leads all day.
White working surfaces sit in faintly tinted trays, like glass plates in an aluminium
frame. Depth comes from soft, hue-tinted shadows and nested edges, never from heavy grey
borders. One accent (deep tangerine) marks action and progress; everything else stays neutral.

- **Density:** Daily App Balanced (5). Rows are scannable, not cramped.
- **Variance:** Offset Structured (4). Asymmetric two-column record page, strict grid within.
- **Motion:** Fluid CSS (4). One easing curve, motion only where state changes, one live pulse.

## 2. Color Palette & Roles

**Tangerine on warm stone.** Warm neutrals keep long sessions easy on the eye; a single deep
tangerine carries energy ("act on this lead") without competing with status data.

- **Frame Stone** (`oklch(0.948 0.005 70)` ≈ #EFEDEA) — app chrome: sidebar, gutter around the canvas.
- **Canvas Linen** (`oklch(0.985 0.002 75)` ≈ #FAF9F7) — the raised canvas pages are drawn on.
- **Tray Tint** (`oklch(0.216 0.006 56 / 0.04)`) — the outer shell of a double-bezel surface.
- **Pure Surface** (#FFFFFF) — inner cores of trays, inputs, popovers, dialogs.
- **Stone Ink** (`oklch(0.216 0.006 56)` ≈ #1C1917) — primary text. Never pure black.
- **Muted Stone** (`oklch(0.444 0.011 74)` ≈ #57534E) — secondary text; ~7:1 on Canvas Linen.
- **Hairline** (`oklch(0.94 0.004 70)`) — row dividers inside a surface.
- **Deep Tangerine** (`oklch(0.553 0.195 38)` ≈ #C2410C) — the only accent: primary actions,
  focus rings, pipeline progress, the live dot, the brand mark. White text on it is 5.1:1.
  Hover: `oklch(0.47 0.157 37)` ≈ #9A3412.
- **Status hues** — data, not decoration, always paired with the status word, and never orange:
  New = stone, Contacted = violet-slate, Qualified = sky, Converted = emerald, Lost = muted stone.
- **Warning Amber** (`--warning-*`) — conflicts and cold-start notices only; not a status.
- Shadows are tinted with Stone Ink, never neutral black.

## 3. Typography Rules

- **Sans:** Geist Variable. Page titles 30–32px, weight 600, tracking -0.025em. Section titles
  13px, weight 600. Body 14px.
- **Mono:** Geist Mono. Meta IDs only (form ID, lead ID).
- **Numbers:** tabular figures (`.tabular`) wherever values line up.
- **Case:** sentence case everywhere. No uppercase wide-tracked labels ("eyebrows").
- **Wrapping:** `text-wrap: balance` on headings, `pretty` on paragraphs.
- **Banned:** Inter, Roboto, system-default stacks, serif faces.

## 4. Component Stylings

- **Surface (double-bezel):** outer tray (Tray Tint, 1px ring at 5% ink, 6px padding, 20px radius)
  around an inner core (Pure Surface, inset 1px top highlight, 14px radius). Used only for the
  main working areas: the leads view, the record, the activity feed, dialogs.
- **Buttons:** primary = tangerine pill; a trailing arrow sits in its own 28px circle that nudges
  right on hover. Secondary = white pill with a whisper ring. Press = scale 0.98. Focus = 3px
  tangerine ring at 50%.
- **Inputs & selects:** 10px radius, white fill, ring border, tangerine focus ring. Label above,
  error below.
- **Badges:** 6px radius, tinted fill, inset ring, leading dot. They read as data chips, not pills.
- **Avatars:** rounded squares (30% radius), neutral gradient, initials only.
- **Loaders:** shimmering skeletons in the exact shape of the content. Spinners only inside a
  button that is saving.
- **Empty / error states:** an icon tile inside a small tray, one sentence, one action.

## 5. Layout Principles

- Sidebar on Frame Silver (desktop); content on a raised, rounded canvas with a faint grain.
- Content max width 72rem; page padding 16px mobile, 40px desktop.
- Record page: `minmax(0,1fr) 24rem`; the activity column sticks while the record scrolls.
- Below 768px every multi-column layout is a single column; tap targets are at least 44px.
- Grid over flex maths. No overlapping content.

## 6. Motion & Interaction

- **Easing:** `cubic-bezier(0.32, 0.72, 0, 1)` for every transition and entrance. No `linear`,
  no `ease-in-out`.
- **Entrances:** 8px fade-up, 320ms, staggered 40ms per row (capped).
- **State changes:** the status tab indicator slides between tabs; the pipeline fill grows; the
  new status badge pops in.
- **Perpetual:** exactly one — the live dot next to "Updated …" pulses slowly.
- **Performance:** animate only `transform` and `opacity`. Blur only on the sticky mobile bar.
  Grain lives on a fixed, pointer-events-none layer.
- `prefers-reduced-motion` collapses all of it.

## 7. Anti-Patterns (Banned)

- Emojis; pure black; a second accent colour; neon or outer glows; purple/blue gradients.
- Uppercase eyebrow labels; Title Case headings.
- Generic 1px grey card borders as the only depth cue; `shadow-md` style dark shadows.
- Circular loading spinners for content loading.
- Modals for things that fit inline; decorative motion that explains nothing.
- AI copy clichés ("Elevate", "Seamless", "Unleash"); exclamation marks in success messages.
