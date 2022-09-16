export interface onlinePlayerProps {
  socketId: string;
  nickName: string;
  roomChannel: string;
}

export interface CardObject {
  cardID: string;
  cardValue: number;
}
export interface TableProps {
  tableChannel: string;
  cards: any[];
  guestOne: CardObject[];
  guestTwo: CardObject[];
  host: CardObject[];
  hiddenHostCard?: CardObject[];
}
export interface PlayerProps {
  socketID: string;
  nickName: string;
  cards?: CardObject[];
  dealer?: string;
  myTurn?: string;
  cardsTotal?: number;
}
export interface newTableProps {
  [key: string]: {
    cardsOnDeck?: undefined | CardObject[];
    players: PlayerProps[];
    hiddenHostCard?: CardObject[];
  };
}
export interface CardsPlayer {
  socketID: string;
  nickName: string;
  cards: CardObject[];
  dealer?: string;
  myTurn?: string;
}
