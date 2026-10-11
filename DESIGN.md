# Envoy — Design system

The current product uses a restrained letter-and-dossier visual language. This document records the implemented system and identifies design work still needed. Product scope is defined in [PRODUCT.md](PRODUCT.md).

## Theme and color

Design tokens live in `envoy/src/app/globals.css`. The interface supports light and dark appearances. Inspect the current theme controls and tokens before changing colors.

| Token | Use |
|---|---|
| `--canvas` | Page background. |
| `--surface` | Cards, panels and inputs. |
| `--sunken` | Toolbars, window chrome and active navigation. |
| `--ink`, `--ink-2`, `--ink-3` | Primary, secondary and quieter text. |
| `--rule`, `--rule-strong` | Borders and separators. |
| `--brand` | Envoy navy, including the logo and primary sending treatment. |
| `--brand-deep`, `--brand-line` | Navy landing sections and their grid details. |
| `--carbon`, `--link` | Generated text, source treatments and links. |
| Status colors and backgrounds | Supported, uncertain and failed states, always paired with text. |

Template editor colors have consistent meanings: sender details are yellow, recipient variables green, generated sections blue, and unresolved placeholders red. Never rely on these colors alone; provide text labels and accessible names.

## Typography and layout

Use Brygada 1918 for display headings and letter-like content, and Schibsted Grotesk for controls and body text. Reuse existing spacing, border, shadow and button styles. Keep line length comfortable for reading a company brief and an email side by side.

The real interface is the primary visual material. `components/marketing/Fragments.tsx` contains illustrative product fragments using fictional companies; these must remain distinguishable from real customer evidence.

## Product presentation

- Start each mode with a small number of primary inputs. Keep optional filters expandable.
- Show a compact fit reason, target role/contact, criterion statuses and draft preview first. Offer detailed research and source context on demand.
- Retain the user's editable template. Explain which sections will change for each company.
- Keep unavailable addresses visible for research; show why they cannot be selected for sending.
- Give explicit feedback after saving, queueing, cancelling and encountering a failure.
- Name simulated outbox actions clearly. A demo result must not look like proof of real delivery.

The current numeric fit display should be de-emphasized or removed during the simplified profile update. It is not a validated confidence measure. The current shared demo account also needs isolation before concurrent visitors can explore it reliably.

## Landing-page claims

Explain the workflow with concrete examples. Do not promise a fixed number of people, verified addresses or a source supporting every sentence. Distinguish company facts from suggested project ideas.

Some contacts are looked up automatically during research in the current pipeline; do not say lookups happen only after user selection. Show cost figures as estimates unless a linked measurement explains the batch, vendors, failures and accounting method.

If pricing is shown, use two proposed choices: **Free**, with in-product ads and limited credits, and **Business**, ad-free at **$29/month with 200+ monthly research credits**. Add “Proposed launch pricing.” Do not display unavailable billing or advertising as implemented features.

## Deck and supporting visuals

Keep the Envoy logo, a thin line near the top of each slide, consistent alignment and a clear hierarchy. Use a manual-workflow comparison, the three conceptual stages and a simple Free/Business pricing table. Label future modes and Sales/Executive/Teams options as roadmap items. Use Adam and Jiwoo's names without inventing customer logos or endorsements.

## Accessibility checks

Target WCAG 2.2 AA. Verify contrast in both themes, keyboard focus, labelled controls, status text, narrow-screen layouts and reduced-motion behavior. These are acceptance targets, not a claim that a complete accessibility audit has passed. Check source links and draft editing with the keyboard as well as a pointer.
