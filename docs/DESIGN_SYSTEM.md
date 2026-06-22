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

## Principles
1. Monochrome by default; color only when it carries meaning.
2. Surfaces defined by hairlines, not shadows.
3. One accent at a time (blue primary, gold secondary).
4. Generous spacing, tight letter-tracking on large type.
