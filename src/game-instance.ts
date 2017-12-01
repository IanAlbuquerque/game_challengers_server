import * as WebSocket from 'ws';
import { Client } from './client';
import * as Msg from './msg';
import { setTimeout } from 'timers';

export const NUM_PLAYERS = 2;

const TURN_TIMEOUT_MS = 100;
const TURNS_LIMIT = 20;

interface Point {
  x: number,
  y: number
}

interface Size {
  w: number,
  h: number
}

interface Player {
  client: Client;
}

interface GameState {
  size: Size;
  walls: Point[];
  food: Point[];
  position: Point;
  enemy: Point;
  score: number;
  turn: number;
}

enum Action {
  HOLD = 'HOLD',
  UP = 'UP',
  RIGHT = 'RIGHT',
  DOWN = 'DOWN',
  LEFT = 'LEFT'
}

const ACTIONS: Action[] = [Action.HOLD, Action.UP, Action.RIGHT, Action.DOWN, Action.LEFT];

export class GameInstance {

  private players: Player[] = [];

  private receivedAction: Action | undefined = undefined;

  private currentKey: number;
  private currentPlayer: number;
  private size: Size;
  private walls: Point[];
  private food: Point[];
  private positions: Point[];
  private score: number; // score[0] - score[1]
  private turn: number;

  private closeCallbacks: (() => void)[] = [];
  private closedGame: boolean = false;

  constructor(clients?: Client[]) {
    this.closedGame = false;
    clients = clients === undefined ? [] : clients;
    this.players = [];
    for (const client of clients) {
      this.players.push({
        client: client
      });
    }

    let playerIndex = 0;
    for (const player of this.players) {
      const client = player.client;
      client.onReceiveMessage(Msg.CSType.CSAction, (msg: Msg.CS) => {
        if (this.currentKey === (msg as Msg.CSAction).key) {
          for (const action of ACTIONS) {
            if ((msg as Msg.CSAction).action === action) {
              this.receivedAction = (msg as Msg.CSAction).action as Action;
            }
          }
        } else {
          console.log(`${player.client.getName()} key mismatch!`);
        }
      });
      client.onConnectionClose(() => {
      });
      playerIndex += 1;
    }

    this.loadInitialState();

    this.sendStates();
    setTimeout(() => { this.nextTurn() }, TURN_TIMEOUT_MS);
  }

  public onClose(callback: () => void): void {
    this.closeCallbacks.push(callback);
  }

  public isClosed(): boolean {
    return this.closedGame;
  }

  private doPlayerAction(playerIndex: number, action: Action): void {
    const newPosition: Point = { x: this.positions[playerIndex].x, y: this.positions[playerIndex].y };
    switch(action) {
      case Action.HOLD:
        break;
      case Action.UP:
        newPosition.y -= 1;
        break;
      case Action.DOWN:
        newPosition.y += 1;
        break;
      case Action.LEFT:
        newPosition.x -= 1;
        break;
      case Action.RIGHT:
        newPosition.x += 1;
        break;
    }
    let isWall: boolean = false;
    let isEnemy: boolean = false;
    let foodFoundIndex: number | undefined = undefined;
    let isOutOfBounds: boolean = false;

    const otherPlayerPosition: Point = this.positions[(playerIndex + 1) % 2];

    if (!(newPosition.x >= 0 && newPosition.x < this.size.w && newPosition.y >= 0 && newPosition.y < this.size.h)) {
      isOutOfBounds = true;
    }

    if (newPosition.x === otherPlayerPosition.x && newPosition.y === otherPlayerPosition.y ) {
      isEnemy = true;
    }

    for (const wall of this.walls) {
      if (wall.x === newPosition.x && wall.y === newPosition.y) {
        isWall =  true;
        break;
      }
    }

    let i = 0;
    for (const food of this.food) {
      if (food.x === newPosition.x && food.y === newPosition.y) {
        foodFoundIndex = i;
        break;
      }
      i++;
    }

    if (!isWall && !isEnemy && !isOutOfBounds) {
      this.positions[playerIndex] = newPosition;
      if (foodFoundIndex !== undefined) {
        this.score += (-1)**(playerIndex);
        this.food.splice(foodFoundIndex, 1);
      }
    }

    this.turn += playerIndex;    
  }

  private isEndGame() {
    return this.food.length === 0 || this.turn >= TURNS_LIMIT;
  }

  private closeGame() {
    const states: GameState[] = [
      {
        size: this.size,
        walls: this.walls,
        food: this.food,
        position: this.positions[0],
        enemy: this.positions[1],
        score: this.score,
        turn: this.turn
      },
      {
        size: this.size,
        walls: this.walls,
        food: this.food,
        position: this.positions[1],
        enemy: this.positions[0],
        score: this.score * -1,
        turn: this.turn
      }
    ]

    const winnerMessage: Msg.SCGameOver = {
      type: Msg.SCType.SCGameOver,
      winner: '',
      tie: false,
      won: true,
      state: undefined
    }
    const loserMessage: Msg.SCGameOver = {
      type: Msg.SCType.SCGameOver,
      winner: '',
      tie: false,
      won: false,
      state: undefined
    }
    let winnerIdx = 0;
    let loseIdx = 0;
    if (this.score > 0) {
      winnerIdx = 0;
      loseIdx = 1;
      winnerMessage.winner = this.players[0].client.getName();
      loserMessage.winner = this.players[0].client.getName();
    } else if (this.score > 0) {
      winnerIdx = 1;
      loseIdx = 0;
      winnerMessage.winner = this.players[1].client.getName();
      loserMessage.winner = this.players[1].client.getName();
    } else {
      winnerIdx = 0;
      loseIdx = 1;
      winnerMessage.winner = ''
      loserMessage.winner = ''
      winnerMessage.won = false;
      loserMessage.won = false;
      winnerMessage.tie = true;
      loserMessage.tie = true;
    }
    winnerMessage.state = states[winnerIdx];
    loserMessage.state = states[loseIdx];
    this.players[winnerIdx].client.sendMessage(winnerMessage);
    this.players[loseIdx].client.sendMessage(loserMessage);
    this.closedGame = true;
  }

  private nextTurn(): void {
    if (this.receivedAction === undefined) {
      // random action
      console.log(`${this.players[this.currentPlayer].client.getName()} timeout!`);
      this.receivedAction = ACTIONS[Math.floor(Math.random()*ACTIONS.length)];
    }
    this.doPlayerAction(this.currentPlayer, this.receivedAction);

    if (this.isEndGame()) {
      this.closeGame();
      return;
    }

    this.receivedAction = undefined;
    this.sendStates();
    setTimeout(() => { this.nextTurn() }, TURN_TIMEOUT_MS);
  }

  private sendStates(): void {
    const otherPlayer: number = this.currentPlayer;
    this.currentPlayer = (this.currentPlayer + 1) % 2;

    const gameStateCurrentPlayer: GameState = {
      size: this.size,
      walls: this.walls,
      food: this.food,
      position: this.positions[this.currentPlayer],
      enemy: this.positions[otherPlayer],
      score: this.score * ((-1)**this.currentPlayer),
      turn: this.turn
    }

    const gameStateOtherPlayer: GameState = {
      size: this.size,
      walls: this.walls,
      food: this.food,
      position: this.positions[otherPlayer],
      enemy: this.positions[this.currentPlayer],
      score: this.score * ((-1)**otherPlayer),
      turn: this.turn
    }

    this.currentKey = Math.random();
    this.players[this.currentPlayer].client.sendMessage({ type: Msg.SCType.SCRequestAction, key: this.currentKey, state: gameStateCurrentPlayer } as Msg.SCRequestAction);
    this.players[otherPlayer].client.sendMessage({ type: Msg.SCType.SCWait, state: gameStateOtherPlayer } as Msg.SCWait);
  }

  private loadInitialState(): void {
    this.currentPlayer = 0;
    this.size = { w: 10, h: 10 };
    this.walls = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 3, y: 0 },
      { x: 4, y: 0 },
      { x: 5, y: 0 },
      { x: 6, y: 0 },
      { x: 7, y: 0 },
      { x: 8, y: 0 },
      { x: 9, y: 0 },
      { x: 9, y: 1 },
      { x: 9, y: 2 },
      { x: 9, y: 3 },
      { x: 9, y: 4 },
      { x: 9, y: 5 },
      { x: 9, y: 6 },
      { x: 9, y: 7 },
      { x: 9, y: 8 },
      { x: 9, y: 9 },
      { x: 8, y: 9 },
      { x: 7, y: 9 },
      { x: 6, y: 9 },
      { x: 5, y: 9 },
      { x: 4, y: 9 },
      { x: 3, y: 9 },
      { x: 2, y: 9 },
      { x: 1, y: 9 },
      { x: 0, y: 9 },
      { x: 0, y: 8 },
      { x: 0, y: 7 },
      { x: 0, y: 6 },
      { x: 0, y: 5 },
      { x: 0, y: 4 },
      { x: 0, y: 3 },
      { x: 0, y: 2 },
      { x: 0, y: 1 },
      { x: 3, y: 1 },
      { x: 3, y: 2 },
      { x: 3, y: 3 },
      { x: 3, y: 4 },
      { x: 8, y: 3 },
      { x: 7, y: 3 },
      { x: 6, y: 3 },
      { x: 4, y: 8 },
      { x: 4, y: 7 },
      { x: 4, y: 6 },
      { x: 3, y: 6 },
      { x: 5, y: 6 },
      { x: 6, y: 6 }
    ];
    this.food = [
      { x: 2, y: 2 },
      { x: 7, y: 7 },
      { x: 3, y: 8 },
      { x: 8, y: 1 },
      { x: 4, y: 4 }
    ];
    this.positions = [
      { x: 1, y: 1 },
      { x: 8, y: 8 }
    ];
    this.score = 0;
    this.turn = 0;
  }

}