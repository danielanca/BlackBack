
type bleky  =  {
    cardID: string;
    cardValue: number;
}

const CardPacks = {
    cards: ['A', '1', '2', '3','4', '5', '6', '7','8','9','10','J','Q','K'],
    values: [11,1,2,3,4,5,6,7,8,9,10,10,10,10],
    suits: ['S', 'H', 'D', 'C'],
    
    get getAllCards () {
        return this.cards.reduce(  (acc: bleky[], card:string  )  => {
            this.suits.forEach( (suit:string) => { 
                acc.push({cardID: `${card}-${suit}`, cardValue: this.values[this.cards.indexOf(card)]});
            });
            return acc;
        }, []);
    }
}

exports.shuffleCards = (cards: bleky[]) => {
    for (let i = cards.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [cards[i], cards[j]] = [cards[j], cards[i]];
    }
    return cards;
};
exports.computeCardsValue = (cards: bleky[]) => {
    let value = 0;
    cards.forEach( cardItem=> {
        value += cardItem.cardValue;
    })

    return value;
}
exports.getAllCards = CardPacks.getAllCards;

