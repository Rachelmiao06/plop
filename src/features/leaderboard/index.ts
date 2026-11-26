// What other features and pages may import from the group leaderboard (client components).
// The server route uses `rules.ts` and `rateLimit.ts` directly; storage is `src/lib/db.ts`.
export { BoardSheet, GroupBoard, type BoardSheetProps, type BoardState, type GroupBoardProps } from "./GroupBoard";
export { SnowmanPile } from "./SnowmanPile";
export { SplatNotice, type SplatNoticeProps } from "./SplatNotice";
export { SubmitScore, type SubmitScoreProps } from "./SubmitScore";
export { readNickname } from "./api";
export type { BoardEntry, Submitted } from "./api";
export type { MatchMode, Rounds } from "./rules";
export { teamName } from "./rules";
