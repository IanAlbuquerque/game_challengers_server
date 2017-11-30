
import * as WebSocket from 'ws';
import { EventEmitter } from 'events';
import * as Msg from './msg';

export class Client {
  private ws: WebSocket;
  private name: string;

  private msgCallbacks: {[key: string]: ((msg: Msg.CS) => void)[] } = {};
  private closeCallbacks: (() => void)[] = [];

  constructor(ws: WebSocket, name: string) {
    this.ws = ws;
    this.name = name;

    this.ws.on('message', (message: string) => {
      const msg: Msg.CS = JSON.parse(message);
      if (this.msgCallbacks[msg.type] !== undefined) {
        for (const callback of this.msgCallbacks[msg.type]) {
          callback(msg);
        }
      }
    });

    ws.onclose = (event: {  wasClean: boolean,
                            code: number,
                            reason: string,
                            target: WebSocket }
    ) => {
      for (const callback of this.closeCallbacks) {
        callback();
      }
    }

    console.log(`New client created with name ${name}...`);
  }

  public sendMessage(msg: Msg.SC) {
    if (this.ws.readyState === this.ws.OPEN) {
      this.ws.send(JSON.stringify(msg));    
    }
  }

  public getName(): string {
    return this.name;
  }

  public onReceiveMessage(msgType: Msg.CSType, callback: (msg: Msg.CS) => void): void {
    if (this.msgCallbacks[msgType] === undefined) {
      this.msgCallbacks[msgType] = [];
    }
    this.msgCallbacks[msgType].push(callback);
  }

  public onConnectionClose(callback: () => void): void {
    this.closeCallbacks.push(callback);
  }
}