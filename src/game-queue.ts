import { GameInstance, NUM_PLAYERS } from './game-instance';
import { Client } from './client';
import * as Msg from './msg';

export class GameQueue {
    private clients: Client[] = [];
  
    constructor(clients?: Client[]) {
      this.clients = clients === undefined ? [] : clients;
    }

    public addClient(client: Client): void {
      console.log(`Client ${client.getName()} added to game queue....`);
      this.clients.push(client);
    }

    public makeGameInstance(): GameInstance | undefined {
      if ( this.clients.length >= NUM_PLAYERS) {
        const clientsArray: Client[] = [];
        console.log(`Creating game instance with clients:`);
        for (let i = 0; i < NUM_PLAYERS; i++) {
          console.log(`> ${this.clients[0].getName()}`);
          clientsArray.push(this.clients.shift() as Client);
        }
        const newGameInstance: GameInstance = new GameInstance(clientsArray);
        return newGameInstance;
      }
      return undefined;
    }

    public tick(): void {
      for (const client of this.clients) {
        client.sendMessage({ type: Msg.SCType.SCFindingMatch });
      }
    }
  }