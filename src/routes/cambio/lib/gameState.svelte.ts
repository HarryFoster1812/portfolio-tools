import { Game } from "../types/Game.svelte";

export const gameState = $state({
	game: new Game(),
});
