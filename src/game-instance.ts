import * as WebSocket from 'ws';
import { Client } from './client';
import * as Msg from './msg';

export const NUM_PLAYERS = 2;

interface Player {
  client: Client;
  position: { x: number, y: number };
  moveVector: { x: number, y: number };
}

function floatEqual(x: number, y: number): boolean {
  return Math.abs(x - y) < 0.01;
}

export class GameInstance {

  private players: Player[] = [];

  constructor(clients?: Client[]) {
    clients = clients === undefined ? [] : clients;
    this.players = [];
    for (const client of clients) {
      this.players.push({
        client: client,
        position: { x: 0, y: 0 },
        moveVector: { x: 0, y: 0 }
      });
    }

    for (const player of this.players) {
      const client = player.client;
      client.onReceiveMessage(Msg.CSType.CSChat, (msg: Msg.CS) => {
        this.broadcastChatData(msg as Msg.CSChat, client);
      });
      client.onReceiveMessage(Msg.CSType.CSMoveStart, (msg: Msg.CS) => {
        this.movePlayerStart(player, (msg as Msg.CSMoveStart).movement)
      });
      client.onReceiveMessage(Msg.CSType.CSMoveEnd, (msg: Msg.CS) => {
        this.movePlayerEnd(player, (msg as Msg.CSMoveEnd).movement)
      });
      client.onConnectionClose(() => {
      });
    }
  }

  private movePlayerStart(player: Player, movement: Msg.PlayerMovement): void {
    switch (movement) {
      case Msg.PlayerMovement.UP:
        if (floatEqual(player.moveVector.y, 1.0)) {
          player.moveVector.y = 0.0
        }
        else if (floatEqual(player.moveVector.y, 0.0)) {
          player.moveVector.y = -1.0
        }
        break;
      case Msg.PlayerMovement.DOWN:
        if (floatEqual(player.moveVector.y, -1.0)) {
          player.moveVector.y = 0.0
        }
        else if (floatEqual(player.moveVector.y, 0.0)) {
          player.moveVector.y = 1.0
        }
        break;
      case Msg.PlayerMovement.LEFT:
        if (floatEqual(player.moveVector.x, 1.0)) {
          player.moveVector.x = 0.0
        }
        else if (floatEqual(player.moveVector.x, 0.0)) {
          player.moveVector.x = -1.0
        }
        break;
      case Msg.PlayerMovement.RIGHT:
        if (floatEqual(player.moveVector.x, -1.0)) {
          player.moveVector.x = 0.0
        }
        else if (floatEqual(player.moveVector.x, 0.0)) {
          player.moveVector.x = 1.0
        }
        break;
    }
  }

  private movePlayerEnd(player: Player, movement: Msg.PlayerMovement): void {
    switch (movement) {
      case Msg.PlayerMovement.UP:
        if (floatEqual(player.moveVector.y, -1.0)) {
          player.moveVector.y = 0.0
        }
        else if (floatEqual(player.moveVector.y, 0.0)) {
          player.moveVector.y = 1.0
        }
        break;
      case Msg.PlayerMovement.DOWN:
        if (floatEqual(player.moveVector.y, 1.0)) {
          player.moveVector.y = 0.0
        }
        else if (floatEqual(player.moveVector.y, 0.0)) {
          player.moveVector.y = -1.0
        }
        break;
      case Msg.PlayerMovement.LEFT:
        if (floatEqual(player.moveVector.x, -1.0)) {
          player.moveVector.x = 0.0
        }
        else if (floatEqual(player.moveVector.x, 0.0)) {
          player.moveVector.x = 1.0
        }
        break;
      case Msg.PlayerMovement.RIGHT:
        if (floatEqual(player.moveVector.x, 1.0)) {
          player.moveVector.x = 0.0
        }
        else if (floatEqual(player.moveVector.x, 0.0)) {
          player.moveVector.x = -1.0
        }
        break;
    }
  }

  private movePlayer(player: Player, dtSeconds: number) {
    const moveSpeed = 500.0;
    const moveVectorNorm = Math.sqrt((player.moveVector.x * player.moveVector.x) + (player.moveVector.y * player.moveVector.y));
    if (moveVectorNorm > 0.01) {
      player.position.x += player.moveVector.x / moveVectorNorm * moveSpeed * dtSeconds;
      player.position.y += player.moveVector.y / moveVectorNorm * moveSpeed * dtSeconds;
    }
  }

  public tick(): void {
    for (const player of this.players) {
      this.movePlayer(player, 33.0/1000.0);

      const client = player.client;
      const enemyPositions: { x: number, y: number }[] = [];
      for (const other of this.players) {
        if (other !== player) {
          enemyPositions.push(other.position);
        }
      }
      const msg: Msg.SCMatchTick = {
        type: Msg.SCType.SCMatchTick,
        ownPosition: player.position,
        enemyPositions: enemyPositions
      }
      client.sendMessage(msg);
    }
  }

  private broadcastChatData(data: Msg.CSChat, client: Client): void {
    const chatMsg: Msg.SCChat = {
      type: Msg.SCType.SCChat,
      timestamp: new Date().toISOString(),
      playerName: client.getName(),
      text: data.text
    }
    for (const player of this.players) {
      const client = player.client;
      client.sendMessage(chatMsg);
    }
  }
}