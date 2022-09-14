import {
   onlinePlayerProps,
   newTableProps,
   PlayerProps,
   CardObject,
} from './cardManager/types/types';
const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const {
   getAllCards,
   shuffleCards,
   computeCardsValue,
} = require('./cardManager/cardsManager.ts');

const portNumber = 8999;
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const server = http.createServer(app);
const cards = getAllCards;
var playersOnline: onlinePlayerProps[] = [];

var RoomChannels: newTableProps = {};

const io = new Server(server, {
   cors: {
      origin: 'http://localhost:3000',
      methods: ['GET', 'POST'],
   },
});

io.on('connection', (socket: any) => {
   console.log(`[STATE-Only Connection] ${socket.id}`);
   socket.on('joinRoom', (data: any) => {
      let { roomChannel, nickName }: { roomChannel: string; nickName: string } = data;
      socket.join(roomChannel);
      playersOnline.push({
         socketId: socket.id,
         nickName: data.nickName,
         roomChannel: data.roomChannel,
      });

      // If there is property then it means that channel already exist and also is not empty
      if (RoomChannels.hasOwnProperty(roomChannel)) {
         RoomChannels[roomChannel].players.push({
            socketID: socket.id,
            nickName: nickName,
            cards: [],
            dealer: 'dealer',
         });

         if (!RoomChannels[roomChannel].hasOwnProperty('cardsOnDeck')) {
            RoomChannels[roomChannel].cardsOnDeck = shuffleCards(cards);

            // Deal cards to players
            if (
               RoomChannels[roomChannel].players.length === 2 &&
               RoomChannels[roomChannel].cardsOnDeck !== undefined
            ) {
               RoomChannels[roomChannel].players.forEach((player: any) => {
                  player.cards?.push(RoomChannels[roomChannel].cardsOnDeck?.pop());
                  if (player.dealer === 'dealer') {
                     player.cards?.push({ cardID: 'hidden', cardValue: 0 });
                     player.myTurn = 'NO';
                  } else {
                     player.cards?.push(RoomChannels[roomChannel].cardsOnDeck?.pop());
                     player.myTurn = 'YES';
                  }
               });
            }
            setTimeout(() => {
               socket.broadcast.emit('playerCards', {
                  payload: JSON.stringify(RoomChannels[roomChannel].players),
               });
               socket.emit('playerCards', {
                  payload: JSON.stringify(RoomChannels[roomChannel].players),
               });
               socket.to(roomChannel).emit('playerCards', {
                  payload: JSON.stringify(RoomChannels[roomChannel].players),
               });
            }, 2000);
            // socket.broadcast.emit('playerCards', {payload:JSON.stringify(RoomChannels[roomChannel].players)});
         }
         //givePlayersCards
      } else {
         RoomChannels = {
            ...RoomChannels,
            [roomChannel]: {
               players: [{ socketID: socket.id, nickName, cards: [], dealer: 'no' }],
            },
         };
      }

      socket.broadcast.emit('playerList', {
         message: 'TOTAL_PLAYERS',
         playersOnline: JSON.stringify(playersOnline),
      });
      socket.emit('roomJoinStatus', {
         message: 'ENTER_ROOM',
         nickName: data.nickName,
         roomChannel: data.roomChannel,
      });
      console.log(
         `[STATE- joinRoom]  Socket ID: ${socket.id}, nickName: ${nickName}, roomChannel: ${roomChannel}`
      );
   });

   socket.on('howManyPlayers', (data: any) => {
      socket.broadcast.emit('playerList', {
         message: 'TOTAL_PLAYERS',
         playersOnline: JSON.stringify(playersOnline),
      });
      socket.emit('playerList', {
         message: 'TOTAL_PLAYERS',
         playersOnline: JSON.stringify(playersOnline),
      });
      console.log('INFO RoomChannels on /info', JSON.stringify(RoomChannels));
   });

   socket.on('EVENT_ACTION', (data: any) => {
      console.log('EVENT_ACTION triggered by [', socket.id, '] ', data);
      let { nickName, roomChannel, actionEvent } = JSON.parse(data);

      if (actionEvent === 'HIT' && RoomChannels[roomChannel].players.length === 2) {
         RoomChannels[roomChannel].players.forEach((player: any) => {
            if (player.nickName === nickName) {
               console.log(
                  `${nickName} is hitting and ${JSON.stringify(
                     player.cards?.find((card: CardObject) => card.cardID === 'hidden')
                  )}`
               );
               if (
                  player.cards?.find((card: CardObject) => card.cardID === 'hidden') !=
                  undefined
               ) {
                  player.cards?.forEach((item: CardObject) => {
                     if (item.cardID === 'hidden') {
                        let card = RoomChannels[roomChannel].cardsOnDeck?.pop();
                        if (typeof card != 'undefined') {
                           let { cardID, cardValue } = card;
                           item.cardID = cardID;
                           item.cardValue = cardValue;

                           return item;
                        }
                     }
                  });

                  console.log(`FINISH ${nickName} is ${JSON.stringify(player.cards)}`);
               } else {
                  player.cards?.push(RoomChannels[roomChannel].cardsOnDeck?.pop());
               }
            }
            var cardTotal = 0;
            player.cards?.forEach((card: CardObject) => {
               cardTotal += card.cardValue;
            });
            player.cardsTotal = cardTotal;
            console.log(`TOTAL IS ${player.nickName}  ${cardTotal}  `);
         });
         //compute both players cards

         console.log(
            `Event ${actionEvent} from ${nickName} and player has cards:${RoomChannels[roomChannel].players}`
         );
         socket.broadcast.emit('playerCards', {
            payload: JSON.stringify(RoomChannels[roomChannel].players),
         });
         socket.emit('playerCards', {
            payload: JSON.stringify(RoomChannels[roomChannel].players),
         });
         socket.to(roomChannel).emit('playerCards', {
            payload: JSON.stringify(RoomChannels[roomChannel].players),
         });
      }
      if (actionEvent === 'STAY' && RoomChannels[roomChannel].players.length === 2) {
         //switching the turn
         RoomChannels[roomChannel].players.forEach((player: any) => {
            if (player.nickName === nickName) {
               if (player.myTurn === 'YES' && player.dealer === 'dealer') {
                  player.myTurn = 'NO_MORE';
               } else {
                  player.myTurn = 'NO';
               }
            } else {
               if (player.myTurn === 'NO' && player.dealer !== 'dealer') {
                  player.myTurn = 'NO_MORE';
               } else player.myTurn = 'YES';
            }
         });

         if (
            RoomChannels[roomChannel].players[0].myTurn === 'NO_MORE' &&
            RoomChannels[roomChannel].players[1].myTurn === 'NO_MORE'
         ) {
            socket.broadcast.emit('GAME_FINISHED', {
               payload: JSON.stringify({
                  winner: whosNearest21(RoomChannels[roomChannel].players),
               }),
            });

            console.log('WINNER:', whosNearest21(RoomChannels[roomChannel].players));
         }
         //compute players totalCards because they both have NO_MORE tag.
         console.log(`Event ${actionEvent} from ${nickName}`);
         socket.broadcast.emit('playerCards', {
            payload: JSON.stringify(RoomChannels[roomChannel].players),
         });
         socket.emit('playerCards', {
            payload: JSON.stringify(RoomChannels[roomChannel].players),
         });
         socket.to(roomChannel).emit('playerCards', {
            payload: JSON.stringify(RoomChannels[roomChannel].players),
         });
      }
   });

   socket.on('disconnect', (data: any) => {
      console.log('User disconnected: ', socket.id);
      var userLeaving = playersOnline.find((player) => player.socketId === socket.id);
      playersOnline = playersOnline.filter(
         (player: onlinePlayerProps) => player.socketId !== socket.id
      );

      if (userLeaving !== undefined) {
         if (RoomChannels[userLeaving.roomChannel].players.length !== 1) {
            RoomChannels[userLeaving.roomChannel].players = RoomChannels[
               userLeaving.roomChannel
            ].players.filter((player: any) => player.socketID !== userLeaving?.socketId);
         } else {
            delete RoomChannels[userLeaving.roomChannel];
         }
      }

      // Object.values(RoomChannels).forEach((room:any) => {

      // }
      console.log('Players left in room:', playersOnline);
      socket.broadcast.emit('playerList', {
         message: 'TOTAL_PLAYERS',
         playersOnline: JSON.stringify(playersOnline),
      });
   });

   console.log('INFO on disconnect:', JSON.stringify(RoomChannels));
});

// const sendTableData = () => {
//     let {guestOne, guestTwo, host, tableChannel}  = tableCards;
//     let guestOneTotal = computeCardsValue(guestOne);
//     let guestTwoTotal = computeCardsValue(guestTwo);
//     let dealerTotal = computeCardsValue(host);
//     return { tableChannel,  guestOneData: guestOne,guestTwoData: guestTwo, hostData: host, gamePlayStates: {guestOne : guestOneTotal, guestTwo:guestTwoTotal, host:dealerTotal} };
// }

app.get('/info', (req: any, res: any) => {
   console.log('INFO RoomChannels on /info', RoomChannels);
   console.log('INFO playersOnline on /info', playersOnline);
});

const whosNearest21 = (players: PlayerProps[]) => {
   let playerOne = players[0];
   let playerTwo = players[1];
   //  console.log('playerOne', playerOne);
   if (
      typeof playerOne.cardsTotal != 'undefined' &&
      typeof playerTwo.cardsTotal != 'undefined'
   ) {
      if (playerOne.cardsTotal > 21 && playerTwo.cardsTotal > 21) {
         return { message: 'DRAW', winnerData: [playerOne] };
      }
      if (playerOne.cardsTotal > 21) {
         return { message: 'WINNER', winnerData: [playerTwo] };
      }
      if (playerTwo.cardsTotal > 21) {
         return { message: 'WINNER', winnerData: [playerOne] };
      }
      if (playerOne.cardsTotal > playerTwo.cardsTotal) {
         return { message: 'WINNER', winnerData: [playerOne] };
      }

      if (playerOne.cardsTotal < playerTwo.cardsTotal) {
         return { message: 'WINNER', winnerData: [playerTwo] };
      }
      if (playerOne.cardsTotal === playerTwo.cardsTotal) {
         return { message: 'DRAW', players: [playerOne.nickName, playerTwo.nickName] };
      }
   } else return { message: 'ERROR', error: 'Players have no cards' };
};

//Create table with specific Session ID and then wait for the players to join

// const generateDeck = () => {

//   tableCards.tableChannel = tableName;
//   tableCards.cards = shuffleCards(cards);
//   let guestOne : CardObject[] = tableCards.cards.splice(0, 2);
//   let guestTwo : CardObject[] = tableCards.cards.splice(0, 2);
//   let dealer: CardObject[] = tableCards.cards.splice(0, 1);
//   let hiddenHost: CardObject[] = tableCards.cards.splice(0, 1);

//   dealer.push( {cardID: 'hidden', cardValue: 0} );
//   tableCards.guestOne.push( {cardID: guestOne[0].cardID, cardValue: guestOne[0].cardValue});
//   tableCards.guestTwo.push( {cardID: guestTwo[0].cardID, cardValue: guestTwo[0].cardValue});
//   tableCards.guestOne.push( {cardID: guestOne[1].cardID, cardValue: guestOne[1].cardValue});
//   tableCards.guestTwo.push( {cardID: guestTwo[1].cardID, cardValue: guestTwo[1].cardValue});
//   tableCards.host.push({cardID: dealer[0].cardID, cardValue: dealer[0].cardValue});

// }

// app.get('/createTable', (req:any, res:any) => {
//     let tableName = "JAJABLABLA";
//     let nickName = req.body.nickName;
//     console.log("RECEIVING:", JSON.stringify(req.body));
//     tableCards.tableChannel = tableName;
//     tableCards.cards = shuffleCards(cards);
//     let guestOne : CardObject[] = tableCards.cards.splice(0, 2);
//     let guestTwo : CardObject[] = tableCards.cards.splice(0, 2);
//     let dealer: CardObject[] = tableCards.cards.splice(0, 1);
//     let hiddenHost: CardObject[] = tableCards.cards.splice(0, 1);

//     dealer.push( {cardID: 'hidden', cardValue: 0} );
//     tableCards.guestOne.push( {cardID: guestOne[0].cardID, cardValue: guestOne[0].cardValue});
//     tableCards.guestTwo.push( {cardID: guestTwo[0].cardID, cardValue: guestTwo[0].cardValue});
//     tableCards.guestOne.push( {cardID: guestOne[1].cardID, cardValue: guestOne[1].cardValue});
//     tableCards.guestTwo.push( {cardID: guestTwo[1].cardID, cardValue: guestTwo[1].cardValue});
//     tableCards.host.push({cardID: dealer[0].cardID, cardValue: dealer[0].cardValue});

// });

// app.get('/hitGuestOne', (req:any, res:any) => {

//      let hitCard = tableCards.cards.splice(0, 1);
//     //  if(req.query.player === 'XAN'){
//       tableCards.guestOne.push({cardID: hitCard[0].cardID, cardValue: hitCard[0].cardValue});
//     // }

//     res.json(sendTableData());
// });

// app.get('/hitGuestTwo', (req:any, res:any) => {

//   let hitCard = tableCards.cards.splice(0, 1);

//    tableCards.guestTwo.push({cardID: hitCard[0].cardID, cardValue: hitCard[0].cardValue});

//  res.json(sendTableData());
// });

// app.get('/standGuestOne', (req:any, res:any) => {
//   res.json(sendTableData());
// });

// app.get('/standGuestTwo', (req:any, res:any) => {
//   res.json(sendTableData());
// });

server.listen(portNumber, () => {
   console.log('Server is running on ', portNumber);
});

// app.listen(portNumber, () => {
//   console.log("Blackjack server started! Listening on: ", portNumber);
// });
