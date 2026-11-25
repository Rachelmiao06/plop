# Plop! · spec

## What it is

A cute snowy stress-relief toy. Two little characters stand on a patch of real-feeling snow.
Press a character and pull back: the snowball under their feet rolls and grows. Let go and it
flies off like a slingshot. The point is how it feels in the hand, not winning.

## How it plays

- Press and hold a character, then pull back, away from where you want to shoot.
- While pulling, the snowball really rolls on the snow, leaves a groove, and gets bigger.
- Pull to the limit and it is fully charged: it stops growing and trembles a little.
- Easing back toward the start does not shrink the ball. It only changes aim and power.
- Let go: the snowball flies the opposite way along an arc. A preview arc shows where it lands.
- Only the snowball flies. The character tumbles off and hops back to their spot.
- On a hit: the snowball bursts, the snow keeps a crater, the hit character falls and springs back.

## Scene and look

- Camera looks from above and to the side (about 30 to 40 degrees up), like a small snow diorama on a table.
- Two characters, left and right, large enough to read their faces (about a fifth of the screen height).
- The ground is realistic snow with depth: grooves and craters stay.
- Characters and props are AI-drawn, half-3D: layered flat pieces set slightly apart in depth.
- Everything else in the scene is decoration.

## Feel (the priority)

- The ball follows the finger with a little lag; a bigger ball feels heavier.
- Squash and spring-back on press, launch and hit.
- Crunchy snow sound that gets deeper as the ball grows; a thump on impact.
- A light vibration on phones.

## Two people, one device

- Phone or tablet: each person drags their own character, at the same time if they like (multi-touch).
- Computer: one mouse, so people simply take turns. No turn rules.
- One person can play both.

## Not doing

Scores, winning and losing, accounts, saving, online play.

## Tech

Next.js (App Router) + Tailwind + shadcn/ui, Three.js through React Three Fiber.
Private GitHub repo, Vercel deploys from `main`.

## First version is done when

On a phone, at the Vercel link, two people each drag a simple block character, roll a snowball
bigger, launch it, and leave a crater, and it feels good. Real art comes after that.

## Order of work

1. Feel prototype with plain shapes (pull, grow, launch, hit).
2. Pick the look (two or three named directions, choose one, set tokens).
3. Generate characters and props, drop them in as layers.
4. Sound, vibration, camera shake, polish.
