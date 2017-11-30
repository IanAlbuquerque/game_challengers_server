export enum SCType {
  SCChat = 'SCChat',
  SCFindingMatch= 'SCFindingMatch',
  SCMatchTick= 'SCMatchTick'
}

export enum CSType {
  CSCreateClient = 'CSCreateClient',
  CSChat = 'CSChat',
  CSMoveStart = 'CSMoveStart',
  CSMoveEnd = 'CSMoveEnd',
}

export interface SC {
  type: SCType;

}

export interface CS {
  type: CSType;
}

// ---------------------
// SC
// ---------------------

export interface SCChat extends SC {
  type: SCType.SCChat;
  timestamp: string;
  playerName: string;
  text: string; 
}


export interface SCFindingMatch extends SC{
  type: SCType.SCFindingMatch
}

export interface SCMatchTick extends SC{
  type: SCType.SCMatchTick;
  ownPosition: { x: number, y: number };
  enemyPositions: { x: number, y: number}[];
}

// ---------------------
// CS
// ---------------------

export interface CSCreateClient extends CS {
  type: CSType.CSCreateClient;
  name: string;
}

export interface CSChat extends CS {
  type: CSType.CSChat;
  text: string;
}

export enum PlayerMovement {
  UP,
  DOWN,
  LEFT,
  RIGHT
}

export interface CSMoveStart extends CS {
  movement: PlayerMovement;
}

export interface CSMoveEnd extends CS {
  movement: PlayerMovement;
}