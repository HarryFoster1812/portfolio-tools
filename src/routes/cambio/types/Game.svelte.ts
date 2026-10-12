import { Player } from "./Player.svelte";

export class Game {
	players: Player[] = $state([new Player("Player 0"), new Player("Player 1")]);
	mainPlayer: Player | null = $state(null);

	constructor() {
		if (this.players.length > 0) {
			this.mainPlayer = this.players[0];
		}
	}

	addPlayer(player: Player): void {
		if (!this.players.includes(player)) {
			this.players.push(player);
		}
	}

	removePlayer(player: Player): void {
		this.players = this.players.filter((p) => p !== player);
	}

	removePlayersTo(index: number): void {
		const mainPlayerIndex = this.players.indexOf(this.mainPlayer);

		if (mainPlayerIndex >= index) {
			this.mainPlayer = this.players[0] ?? null;
		}
		this.players = this.players.slice(0, index);
	}
}
