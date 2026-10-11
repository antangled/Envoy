# Design

Envoy's visual system, introduced in the redesign modeled on Attio, Linear, and Granola. The pre-redesign UI is preserved at the git tag `v1-original-design`.

## Theme

Light by default, with a full dark theme from the same tokens (`prefers-color-scheme`). Neutrals carry a very slight tint toward the brand navy (OKLCH hue 268). All tokens live in `envoy/src/app/globals.css`.

## Color roles

| Token | Role |
|---|---|
| `--canvas` | Page background |
| `--surface` | Cards, windows, inputs |
| `--sunken` | Toolbars, window chrome, active nav |
| `--ink`, `--ink-2`, `--ink-3` | Text, from primary to quiet; all meet WCAG AA on canvas |
| `--rule`, `--rule-strong` | Hairlines and hover borders |
| `--brand` (`#1c2a87`) | The logo navy; also the Send button (`--seal`) |
| `--brand-deep`, `--brand-line` | The drenched navy panels on the landing page and their grid lines |
| `--carbon`, `--carbon-line`, `--link` | Text Envoy wrote, and citations |
| `ok`, `warn`, `bad` (+ `-bg`) | Status only, always paired with a text label |

Setup's template colors keep their meaning everywhere: yellow is filled from your details, green changes per person, blue (carbon) is researched by Envoy, red is a placeholder you still need to replace.

## Typography

- **Brygada 1918** (`font-serif`): display headings, page titles, and the email letter itself. A 1918 book face with letterhead formality.
- **Schibsted Grotesk** (`font-sans`): every interface label, control, table, and body paragraph.
- Avoid `tabular-nums` on text with punctuation (prices, times, emails): Schibsted's tabular figures widen periods and colons.

## Patterns

- **Section ledes** (landing): one plain statement in ink, then a muted continuation in `--ink-3`, in the serif.
- **Product fragments as imagery**: landing visuals are real interface pieces built from app tokens (`components/marketing/Fragments.tsx`), using fictional `.example` companies.
- **Buttons**: `primary` (ink), `seal` (navy, sending only), `quiet` (bordered surface), `ghost` (inline link). 36px tall except ghost.
- **Motion**: one orchestrated hero entrance on the landing page (rise, lift, highlight sweep, source pop), all ease-out and disabled under reduced motion. Product screens use only short state transitions.
