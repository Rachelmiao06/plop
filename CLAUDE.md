# Plop!

A cute snowy stress-relief toy: pull a character back, roll a snowball bigger, let go. Full spec: `docs/SPEC.md`.
Decisions already made: `docs/DECISIONS.md`. Read both before changing behaviour.

@AGENTS.md

## Stack

Next.js (App Router, TypeScript, `src/`), Tailwind v4, shadcn/ui, Three.js via `@react-three/fiber` and `@react-three/drei`.
Private GitHub repo `Rachelmiao06/plop`; Vercel deploys production from `main`, previews from every PR.
No database, no accounts, no AI features, no online play.

## Folders

- `src/app/` routes only. Pages stay thin and assemble features.
- `src/features/<name>/` one folder per feature or scene: components, `content.ts` (text, timings, feel settings), short README.
- `src/components/ui/` shadcn primitives. `src/components/shared/` our own reusable parts (only when two features need one).
- `src/lib/` one file per outside tool or engine (for example `audio.ts` when sound arrives).
- `public/assets/<feature>/` images and sounds, per feature.
- `docs/` SPEC, DECISIONS.

## Look comes first (Rachel's top priority)

Rachel cares most about three things: it feels hand-drawn, it is cute, and it matches the design tokens.
A visual change is not done until it passes all of these:

- **Hand-drawn:** looks like her doodle art (thin uneven dark-brown line, light flat colour, lots of paper white,
  tiny dot eyes set far apart). Never glossy, plastic, smooth-gradient, vector or "default 3D".
- **Cute:** round, soft, a little lopsided; motion is springy and gentle, never stiff or mechanical.
- **Tokens:** colours only from `src/app/globals.css` (or `content.ts` values copied from them). If her art and the
  tokens disagree, say so and propose a token change in its own PR; never quietly invent a new colour.
- **Proof:** every visual PR shows screenshots next to the matching reference art (`art-source/`, `docs/reference/`)
  and says honestly where it still falls short.

## Rules

- A feature never edits another feature's folder. It imports shared parts.
- Colours, fonts and radius only from tokens in `src/app/globals.css`. No typed-in colours in components.
- Reuse `components/ui/` before making a new component.
- Feel numbers (spring stiffness, lag, growth rate, ranges) live in the feature's `content.ts` so they can be tuned without touching logic.
- Art is never drawn by Claude. Characters and props come from Rachel or an image model and are placed as files in `public/assets/`.
- 3D components are client components (`"use client"`); keep the canvas out of server rendering.
- Shared files: `app/layout.tsx`, `app/globals.css`, `components/ui/*`, `components/shared/*`, `lib/*`, `package.json`, `CLAUDE.md`, `.github/*`. Say so before touching one.

## Working rules

- Check which branch you are on before editing. Never build features directly on `main`.
- One feature = one folder in `features/` = one branch = one PR.
- After every meaningful change that works, commit with a descriptive message.
- When a task is done: pull main into the branch, push, open a PR from the template with screenshots and `Closes #n`, give the preview link. Never merge without Rachel's yes.
- Never commit `.env` or any key. Keys go in `.env.local` and Vercel → Settings → Environment Variables; names go in `.env.example`.
- Record any decision a later session might undo in `docs/DECISIONS.md`.
- Rachel does not use the terminal. Run commands yourself and explain each step in one plain sentence.

## Commands

`npm run dev` · `npm run lint` · `npm run typecheck` · `npm run build`
