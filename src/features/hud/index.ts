// What other features and pages may import from the score display.
export { ScoreHud } from "./ScoreHud";
export type { GainEvent, HudPlayer, KnockEvent, ScoreHudProps } from "./ScoreHud";
export { Card as PaperCard, MatchEnd, MatchStart, type EndPlayer, type MatchEndProps, type MatchStartProps } from "./Match";
export type { SnowmanLook } from "./content";
// Doodles other features draw with (read only): paper wash, pencil outline, the snowman faces, the star.
export { PaperFill, PencilFrame, SnowmanFace, StarDoodle } from "./Doodles";
