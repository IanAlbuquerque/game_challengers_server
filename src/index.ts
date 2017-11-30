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

const clients: { id: number, ws: WebSocket }[] = [];

const gameQueue: GameQueue = new GameQueue();
const gameInstances: GameInstance[] = [];

wss.on('connection', (ws: WebSocket) => {
  console.log(`Receving connection...`)
  ws.on('message', (message: string) => {
    const msg: Msg.CS = JSON.parse(message);
    if (msg.type === Msg.CSType.CSCreateClient) {
      const createClientMsg: Msg.CSCreateClient = msg as Msg.CSCreateClient;
      const newClient = new Client(ws, createClientMsg.name);
      gameQueue.addClient(newClient);
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

  // Instances Cycle
  for (const gameInstance of gameInstances) {
    gameInstance.tick();
  }

}, 33)

//start our server
server.listen(process.env.PORT || 8999, () => {
  console.log(`Server started on port ${server.address().port} :)`);
});