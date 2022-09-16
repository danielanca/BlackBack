const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

const {
  onlinePlayerProps,
  newTableProps,
  PlayerProps,
  CardObject,
} = require('./cardManager/types/types');
const {
  getAllCards,
  shuffleCards,
  computePlayerCards,
} = require('./cardManager/cardsManager.ts');

const portNumber = 8999;
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const server = http.createServer(app);
const cards = getAllCards;
var playersOnline: typeof onlinePlayerProps[] = [];
var RoomChannels: typeof newTableProps = {};

const io = new Server(server, {
  cors: {
    origin: 'https://blackjackanca.herokuapp.com/',
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
    let { nickName: currentNickName, roomChannel, actionEvent } = JSON.parse(data);

    if (actionEvent === 'HIT' && RoomChannels[roomChannel].players.length === 2) {
      //1
      RoomChannels[roomChannel].players.forEach((player: any, index: number) => {
        if (player.nickName === currentNickName) {
          console.log(
            `${currentNickName} is hitting and ${JSON.stringify(
              player.cards?.find((card: typeof CardObject) => card.cardID === 'hidden')
            )}`
          );
          //CHECK IF PLAYER HAS THE HIDDEN CARD
          if (
            player.cards?.find((card: typeof CardObject) => card.cardID === 'hidden') !=
            undefined
          ) {
            player.cards?.forEach((item: typeof CardObject) => {
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
          } else {
            //POP a card from DECK and add it to the player
            player.cards?.push(RoomChannels[roomChannel].cardsOnDeck?.pop());
          }
          //ONLY THE HITTER IS CHECKED
          //for EACH player, compute the CardTOTAL here
          var cardTotal = 0;
          player.cards?.forEach((card: typeof CardObject) => {
            cardTotal += card.cardValue;
          });
          player.cardsTotal = cardTotal;
          //2
          if (player.cardsTotal > 21) {
            if (player.dealer != 'dealer') {
              if (player.myTurn === 'YES') {
                player.myTurn = 'NO_EXCEEDED';
                RoomChannels[roomChannel].players.forEach((theOtherPlayer: any) =>
                  theOtherPlayer.nickName !== currentNickName
                    ? (theOtherPlayer.myTurn = 'YES')
                    : null
                );
              }
            } else if (player.dealer === 'dealer') {
              if (player.myTurn === 'YES') {
                player.myTurn = 'NO_MORE';
                RoomChannels[roomChannel].players.forEach((theOtherPlayer: any) =>
                  theOtherPlayer.nickName !== currentNickName
                    ? (theOtherPlayer.myTurn = 'NO_MORE')
                    : null
                );
              }
            }
          }
        }
        console.log(`Computing: ${computePlayerCards(player.cards)} of ${player.nickName}`);
      });
      // whosTurnIsHandler(RoomChannels[roomChannel].players, currentNickName);
    } else if (actionEvent === 'STAY' && RoomChannels[roomChannel].players.length === 2) {
      RoomChannels[roomChannel].players.forEach((player: any, index: number) => {
        if (player.nickName === currentNickName) {
          if (player.dealer != 'dealer') {
            player.myTurn = 'NO_MORE';
            RoomChannels[roomChannel].players.forEach((player: typeof PlayerProps) =>
              player.nickName !== currentNickName ? (player.myTurn = 'YES') : null
            );
          } else {
            if (player.myTurn === 'YES') {
              player.myTurn = 'NO_MORE';
              RoomChannels[roomChannel].players.forEach(
                (theOtherPlayer: any) => (theOtherPlayer.myTurn = 'NO_MORE')
              );
            }
          }

          var cardTotal = 0;
          player.cards?.forEach((card: typeof CardObject) => {
            cardTotal += card.cardValue;
          });
          player.cardsTotal = cardTotal;
        }
      });
      // whosTurnIsHandler(RoomChannels[roomChannel].players, currentNickName);
    }
    console.log(
      `SENDING BOTH PLAYERS STATS: ${RoomChannels[roomChannel].players[0].myTurn}  ${RoomChannels[roomChannel].players[1].myTurn} `
    );
    checkisThereAWinner(RoomChannels[roomChannel].players, socket);
    console.log(
      `Event ${actionEvent} from ${currentNickName} and player has cards:${RoomChannels[roomChannel].players}`
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

    //compute if one of the players card are exceeding 21 and if so, send a message to the other player that he won
    //or is having 21 card.
  });

  socket.on('disconnect', (data: any) => {
    console.log('User disconnected: ', socket.id);
    var userLeaving = playersOnline.find((player) => player.socketId === socket.id);
    playersOnline = playersOnline.filter(
      (player: typeof onlinePlayerProps) => player.socketId !== socket.id
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
    console.log('Players left in room:', playersOnline);
    socket.broadcast.emit('playerList', {
      message: 'TOTAL_PLAYERS',
      playersOnline: JSON.stringify(playersOnline),
    });
  });

  console.log('INFO on disconnect:', JSON.stringify(RoomChannels));
});

app.get('/info', (req: any, res: any) => {
  console.log('INFO RoomChannels on /info', RoomChannels);
  console.log('INFO playersOnline on /info', playersOnline);
});
const checkisThereAWinner = (RoomChannelObject: typeof PlayerProps[], socket: any) => {
  if (RoomChannelObject[0].myTurn === 'NO_MORE' && RoomChannelObject[1].myTurn === 'NO_MORE') {
    setTimeout(() => {
      socket.broadcast.emit('GAME_FINISHED', {
        payload: whosNearest21(RoomChannelObject),
      });
      socket.emit('GAME_FINISHED', {
        payload: whosNearest21(RoomChannelObject),
      });
    }, 1500);
  }
};
const whosNearest21 = (players: typeof PlayerProps[]) => {
  let playerOne = players[0];
  let playerTwo = players[1];
  if (
    typeof playerOne.cardsTotal != 'undefined' &&
    typeof playerTwo.cardsTotal != 'undefined'
  ) {
    if (playerOne.cardsTotal > 21 && playerTwo.cardsTotal > 21) {
      return { message: 'DRAW', players: [...[playerOne], ...[playerTwo]] };
    }
    if (playerOne.cardsTotal > 21) {
      return { message: 'WINNER', players: [playerTwo] };
    }
    if (playerTwo.cardsTotal > 21) {
      return { message: 'WINNER', players: [playerOne] };
    }
    if (playerOne.cardsTotal > playerTwo.cardsTotal) {
      return { message: 'WINNER', players: [playerOne] };
    }

    if (playerOne.cardsTotal < playerTwo.cardsTotal) {
      return { message: 'WINNER', players: [playerTwo] };
    }
    if (playerOne.cardsTotal === playerTwo.cardsTotal) {
      return {
        message: 'DRAW',
        players: [...[playerOne], ...[playerTwo]],
      };
    }
  } else return { message: 'ERROR', error: 'Players have no cards' };
};

const whosTurnIsHandler = (players: typeof PlayerProps[], currentNickname: string) => {
  players.forEach((player: any) => {
    if (player.nickName === currentNickname) {
      if (player.myTurn === 'YES' && player.dealer !== 'dealer') {
        console.log(` ${player.nickName}[Guest] is hitting!`);
      }
      if (player.myTurn === 'NO_EXCEEDED' && player.dealer !== 'dealer') {
        //the opponent
        players.forEach((player) =>
          player.nickName !== currentNickname ? (player.myTurn = 'YES') : null
        );
      }
    }
    // if (player.nickName === currentNickname) {
    //   if (player.myTurn === 'YES' && player.dealer === 'dealer') {
    //     player.myTurn = 'NO_MORE';
    //   } else {
    //     player.myTurn = 'NO';
    //   }
    // } else {
    //   if (player.myTurn === 'NO' && player.dealer !== 'dealer') {
    //     player.myTurn = 'NO_MORE';
    //   } else player.myTurn = 'YES';
    // }
  });
};
server.listen(portNumber, () => {
  console.log('Server is running on ', portNumber);
});
