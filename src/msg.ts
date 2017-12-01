export enum SCType {
  SCFindingMatch= 'SCFindingMatch',
  SCRequestAction = 'SCRequestAction',
  SCWait = 'SCWait',
  SCGameOver = 'SCGameOver'
}

export enum CSType {
  CSCreateClient = 'CSCreateClient',
  CSAction = 'CSAction'
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

export interface SCFindingMatch extends SC{
  type: SCType.SCFindingMatch;
}

export interface SCRequestAction extends SC{
  type: SCType.SCRequestAction;
  key: number;
  state: any;
}

export interface SCWait extends SC{
  type: SCType.SCWait;
  state: any;
}

export interface SCGameOver extends SC{
  type: SCType.SCGameOver;
  won: boolean;
  tie: boolean;
  winner: string;
  state: any;
}

// ---------------------
// CS
// ---------------------

export interface CSCreateClient extends CS {
  type: CSType.CSCreateClient;
  name: string;
}

export interface CSAction extends CS {
  type: CSType.CSAction;
  action: string;
  key: number;
}
