export type onlinePlayerProps = {
   socketId: string;
   nickName: string;
   roomChannel: string;
};

export type CardObject = {
   cardID: string;
   cardValue: number;
};
export type TableProps = {
   tableChannel: string;
   cards: any[];
   guestOne: CardObject[];
   guestTwo: CardObject[];
   host: CardObject[];
   hiddenHostCard?: CardObject[];
};
export type PlayerProps = {
   socketID: string;
   nickName: string;
   cards?: CardObject[];
   dealer?: string;
   myTurn?: string;
   cardsTotal?: number;
};
export type newTableProps = {
   [key: string]: {
      cardsOnDeck?: undefined | CardObject[];
      players: PlayerProps[];
      hiddenHostCard?: CardObject[];
   };
};
