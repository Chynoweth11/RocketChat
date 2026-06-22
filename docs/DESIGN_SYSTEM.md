# SubShield Design System

> Calm, monochrome, hairline-defined surfaces with a single institutional accent.
> Reference language: **Apple · Stripe · Linear · Morgan Stanley.**

Status: **capturing references** — more to be added before app-wide rollout.
Rollout is **on hold** until all references are in; this doc is the source of truth.
Font decision: **Roboto everywhere** (see Typography).

---

## Foundation — Color

Near-monochrome base · institutional blue · antique gold · earned status.

### Dark (sidebar / primary action)
| Token | Hex | Use |
|---|---|---|
| `--ss-ink` | `#0E1422` | Deepest ink surface |
| `--ss-ink-btn` | `#11192A` | Primary action button |
| `--ss-ink-btn-hover` | `#1D2840` | Action hover |
| `--ss-nav-dark` | `#0D1320` | Sidebar |
| `--ss-nav-dark-raise` | `#121A2C` | Sidebar raised layer |

### Neutral / text
| Token | Hex | Use |
|---|---|---|
| `--ss-ink` (text) | `#1D1D1F` | Primary text |
| `--ss-muted` | `#6E6E73` | Secondary text |
| `--ss-faint` | `#86868B` | Tertiary / labels |
| `--ss-line-strong` | `#D9D9DE` | Strong divider |
| `--ss-line` | `#E6E6EB` | Default hairline |
| `--ss-line-soft` | `#F0F0F2` | Soft divider |

### Blue — institutional accent
| Token | Hex | Use |
|---|---|---|
| `--ss-brand` | `#2552B5` | Accent (verify) |
| `--ss-brand-strong` | `#1A3C8A` | Hover / pressed |
| `--ss-brand-soft` | `#EEF2FB` | Tinted fill |
| `--ss-brand-line` | `#D3DCEF` | Tinted border (verify) |
| `--ss-brand-ink` | `#1A3678` | Text on tint |

### Gold — antique secondary accent
| Token | Hex | Use |
|---|---|---|
| `--ss-gold` | `#9C7B3E` | Accent |
| `--ss-gold-strong` | `#856630` | Hover |
| `--ss-gold-soft` | `#F8F2E6` | Tinted fill |
| `--ss-gold-line` | `#E7D8BB` | Tinted border |
| `--ss-gold-text` | `#6F5526` | Text on tint |

### Surfaces
| Token | Hex | Use |
|---|---|---|
| `--ss-surface` | `#FFFFFF` | Cards |
| `--ss-surface-soft` | `#FAFAFA` | Inset panels |
| `--ss-surface-sunken` | `#F5F5F7` | App canvas |
| `--ss-surface-nav` | `#ECECF0` | Active nav item |

---

## Status system

A small colored **dot + calm text**. Color is *earned* — a real gap, a near
renewal — **never decorative**.

| Status | Dot | Example labels |
|---|---|---|
| Brand | blue `--ss-brand` | Active · Verified |
| Success | green | Current · Delivered |
| Warning | gold `--ss-gold` | Review soon · Aging |
| Danger | red | Critical · Expired |
| Neutral | gray `--ss-faint` | — |

---

## Typography

**Resolved:** **Roboto everywhere.** The reference family names (SF Pro, Inter,
Newsreader, JetBrains Mono) are superseded — Roboto is the only font. The scale,
weights, and tracking below still apply, rendered in Roboto.

Weight mapping for Roboto (which ships 300/400/500/700/900):
590 → **500**, 640 → **700**, 780 → **700/900**.

| Role | Size | Weight | Tracking |
|---|---|---|---|
| Display | 34 | 780 | -0.026em |
| H2 | 22 | 640 | — |
| H3 | 17 | 640 | — |
| Body | 14 | 400 | — |
| Small | 13 | 400 | — |
| Eyebrow | 11 | 600 | +0.06em (uppercase) |

Weight ramp: Medium 500 · Semibold 590 · Bold 640 · Heavy 780.

---

## Spacing & Radii

4px base grid · 16px card padding · 10px controls · full pills for status.

| Token | px |  | Token | px |
|---|---|---|---|---|
| `--space-1` | 4 |  | `--space-7` | 28 |
| `--space-2` | 8 |  | `--space-8` | 32 |
| `--space-3` | 12 |  | `--space-10` | 40 |
| `--space-4` | 16 |  | `--space-12` | 48 |
| `--space-5` | 20 |  |  |  |
| `--space-6` | 24 |  |  |  |

| Radius | px | Use |
|---|---|---|
| `--radius-sm` | 8 | Chips, small fills |
| `--radius-control` | 9 | Buttons, inputs |
| `--radius-inner` | 12 | Nested panels |
| `--radius-card` | 14 | Cards |
| `--radius-pill` | 999 | Status pills, switches |

---

## Elevation

Premium, restrained depth · cards earn a whisper-soft lift · modals go deeper.

| Level | Token | Notes |
|---|---|---|
| Resting | `--shadow-xs` | + hairline border |
| Hover | `--shadow-sm` | Card hover lift |
| Popover | `--shadow-md` | Menus, popovers |
| Modal | `--shadow-lg` | Dialogs |

---

## Components

### Buttons
Ink-primary for the **one** decisive action; secondary, danger, ghost for the rest.

| Variant | Look |
|---|---|
| Ink primary | Dark `--ss-ink-btn` fill, white text (e.g. Upload policy, Submit) |
| Secondary | White fill, `--ss-line` border, ink text (Add manually) |
| Danger | Red fill, white text (Delete) |
| Ghost | No fill, ink/brand text, optional arrow (Review →) |
| Icon-only | Square, ghost or soft `…` menu |

- **Sizes:** Medium · Small · Small soft.
- **States:** loading (spinner + "Sending…", disabled look) · disabled (muted gray).

### Metrics
Eyebrow label + big value + one quiet support line.
`ANNUAL PREMIUM / $10,935 / 6 policies` · `TRACKED SAVINGS / $1,195/yr / +$540` ·
`COVERAGE HEALTH / 92 / Strong`. Grouped inside a bordered metrics panel.

### Coverage card
Eyebrow (`COVERAGE`) → title → `carrier · renews in N days` → tag row.
Tags: status dot pill (`• Workers' Comp`), id chip (`WC-90183321`),
type chip (`DECLARATION`), accent chip (`Growth plan`, brand-tinted).

### Status tiles (Status & Notes)
Row of labeled tiles, each = eyebrow + icon + value + sub:
`DOT STATUS / • Active / No action required` · `POLICY STATUS / ◇ Current / Updated …` ·
`REVIEW STATUS / ◷ Review soon / Next review in N days` · `RISK STATUS / Low` ·
`VERIFIED / 100% / All requirements met`. Dark app header bar above page title.
Update rows: icon tile + title + body + right meta (label + DATE + time) + chevron.

### Forms
Crisp inputs, refined labels. Required fields marked with red `*`.
- **Fieldset:** eyebrow section label (`APPLICANT DETAILS`) bordering grouped fields.
- **TextField:** label above, hairline border, 9px radius, soft placeholder.
- **Select:** same frame + chevron.
- **FilterChip:** pill with label + count (`Declarations 4`); active = filled/bordered.
- **Switch:** pill track, dark when on (`--ss-ink-btn`).

---

## Principles
1. Monochrome by default; color only when it carries meaning.
2. Surfaces defined by hairlines, not shadows.
3. One accent at a time (blue primary, gold secondary).
4. Generous spacing, tight letter-tracking on large type.
5. Exactly one ink-primary action per view; everything else recedes.
6. 4px grid governs all spacing; radii are consistent per element class.
