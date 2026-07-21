# Product

## Register

product

## Users

Individuals and small teams running Basecamp's Shape Up methodology who need a quick visual snapshot of scope progress. They arrive ad hoc (often mid-standup or while writing an update), make or adjust a chart in under a minute, and share it into Slack, GitHub, or a document. No accounts, no onboarding; many users land directly on a shared link someone else made.

## Product Purpose

The fastest way to make and share a hill chart. The entire chart state lives in the URL; sharing a link or a PNG is the product's whole job. Success: a chart created, updated, and shared in under a minute, and a shared link that renders identically for the recipient.

## Brand Personality

Clean, professional, lightweight. A precise little tool, not a toy. Note: the current hand-drawn RoughJS styling predates this direction; future visual work should move toward a crisp, neutral feel rather than leaning further into sketchiness.

## Anti-references

- Whimsical hand-drawn sketchiness as the identity (the tool should read as dependable, not doodled).
- Heavyweight PM SaaS dashboards (Jira-like density, panels, endless configuration).

## Design Principles

- The chart is the product: every pixel of chrome must justify itself against the hill.
- State lives in the URL, never in an account: anything that breaks link fidelity breaks the product.
- Degrade gracefully: blocked CDNs, offline use, and malformed shared links must never dead-end the app.
- Share surfaces are first-class: the exported PNG and the shared link must match what's on screen.

## Accessibility & Inclusion

- Keyboard-accessible chrome: all buttons, inputs, and modals operable by keyboard, with visible focus and Escape to dismiss.
- Respect prefers-reduced-motion.
- Known future item (out of current scope): keyboard-draggable scope dots (ARIA slider pattern).
