// Runs the shot measure in Node: `node src/features/game/measure/measure.mjs [rounds | old | set ids...]`.
// The features' index files pull in React and three, so the aliases point straight at their plain files.
import { createJiti } from "jiti";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const features = path.resolve(here, "../..");
const jiti = createJiti(import.meta.url, {
  alias: {
    "@/features/bowling": path.join(here, "headless-bowling.ts"),
    "@/features/pins/layout": path.join(features, "pins/layout.ts"),
    "@/features/pins/scoring": path.join(features, "pins/scoring.ts"),
    "@/features/pins": path.join(here, "headless-pins.ts"),
    "@/features/scenery": path.join(features, "scenery/content.ts"),
    "@/features/hud": path.join(here, "headless-hud.ts"),
  },
});
await jiti.import(path.join(here, process.env.MEASURE ?? "run.ts"));
