import * as express from 'express';
import * as http from 'http';
import * as WebSocket from 'ws';
import { setInterval } from 'timers';
import { GameQueue } from './game-queue';
import { GameInstance } from './game-instance';
import { Client } from './client';
import * as Msg from './msg';

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const gameQueue: GameQueue = new GameQueue();
const gameInstances: GameInstance[] = [];

wss.on('connection', (ws: WebSocket) => {
  console.log(`Receving connection...`)
  ws.on('message', (message: string) => {
    try {
      const msg: Msg.CS = JSON.parse(message);
      if (msg.type === Msg.CSType.CSCreateClient) {
        const createClientMsg: Msg.CSCreateClient = msg as Msg.CSCreateClient;
        const newClient = new Client(ws, createClientMsg.name);
        gameQueue.addClient(newClient);
      }
    } catch(err) {
      console.log('Error when parsing incoming message...');
    }
  });
});

setInterval(() => {

  // Queue Cycle
  gameQueue.tick();
  const newGameInstance: GameInstance | undefined = gameQueue.makeGameInstance();
  if (newGameInstance !== undefined) {
    gameInstances.push(newGameInstance);
  }

  let idx = 0;
  for (const gameInstance of gameInstances) {
    if (gameInstance.isClosed()) {
      gameInstances.splice(idx, 1);
      break;
    }
    idx += 1;
  }

}, 1000)

//start our server
server.listen(process.env.PORT || 8999, () => {
  console.log(`Server started on port ${server.address().port} :)`);
});