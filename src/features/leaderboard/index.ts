// What other features and pages may import from the group leaderboard (client components).
// The server route uses `rules.ts` and `rateLimit.ts` directly; storage is `src/lib/db.ts`.
export { GroupBoard, type GroupBoardProps } from "./GroupBoard";
export { SubmitScore, type SubmitScoreProps } from "./SubmitScore";
export { readNickname } from "./api";
export type { BoardEntry, Submitted } from "./api";
export type { MatchMode, Rounds } from "./rules";
