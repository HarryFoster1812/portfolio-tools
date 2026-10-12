export type CardStatus = 'UNKNOWN' | 'EXACT' | 'RANK' | 'SUIT';

export class Card {
	status: CardStatus;
	constructor() {
		this.status = 'UNKNOWN'
	}
}
