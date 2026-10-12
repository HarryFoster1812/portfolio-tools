import { Card } from "./Card";

export class Player {
	cards: Card[] = [];
	name: string = $state("");
	constructor(name) {
		this.name = name;
		for(let i=0; i<4;i++){
			this.cards.push(new Card());
		}
	}
}
