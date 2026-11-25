// Public surface of the game feature. Import from "@/features/game" only.
export { Game } from "./Game";
export { GAME, TEXT } from "./content";
export { createGame, type Game as GameRules, type GameState, type Stage } from "./rules";
// The players' names (asked on the start card, remembered on this device): the share sheet signs invites with them.
export { readNames, savePlayerOne, serverNames, shownName, subscribeNames, type Names } from "./names";
