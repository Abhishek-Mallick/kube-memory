# Design — kube-memory

Locked design system for the kube-memory web app. Dashboard and marketing pages share tokens, type, and interaction voice.

## Genre

modern-minimal — developer infra tool (Linear / Stripe school)

## Macrostructure family

- **Marketing pages:** Workbench — hero + tabbed demo + feature grid + MCP band
- **App pages:** Workbench — page header + primary content + optional side panel

## Theme

- `--color-paper` dark band: oklch(0.148 0.004 228.8)
- `--color-paper-2`: oklch(0.218 0.008 223.9)
- `--color-ink`: oklch(0.987 0.002 197.1)
- `--color-ink-2`: oklch(0.723 0.014 214.4)
- `--color-rule`: oklch(1 0 0 / 10%)
- `--color-accent`: oklch(0.72 0.14 195) — cyan signal for active states
- `--color-focus`: oklch(0.72 0.14 195)

## Typography

- Display / headings: Geist Mono Variable, weight 500, roman
- Body: Inter Variable, weight 400
- Mono: Geist Mono Variable for code and MCP snippets

## Spacing

4-point named scale in `client/tokens.css`. Use `var(--space-*)` in CSS; Tailwind utilities in TSX.

## Motion

- Easings: `--ease-out`, `--ease-in`, `--ease-in-out`
- Card hover: translateY(-1px) + border brighten, 180ms `--ease-out`
- Reduced motion: opacity-only, ≤150ms

## Microinteractions

- Silent success via Sonner toasts (copy, save)
- Copy buttons show "Copied" state for 2s
- Hover delay 0 on buttons; 800ms on tooltips

## CTA voice

- Primary: filled, `--radius-md`, verb-first ("Create key", "Configure")
- Secondary: outline, same radius

## Per-page allowances

- Marketing: terminal demo card, tabbed memory loop
- App: no enrichment — status cards and tables carry the page

## What pages MUST share

- Wordmark: kube-memory (Geist Mono)
- Accent on active nav, status dots, focus rings
- Page header pattern: title + description + primary action
- Interactive card hover treatment

## What pages MAY differ on

- Side panel (API Keys MCP setup)
- Grid density (connectors vs keys table)
