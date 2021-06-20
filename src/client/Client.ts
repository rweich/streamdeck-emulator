import './index.scss';

import WebSocket, { MessageEvent } from 'isomorphic-ws';

import { Logger } from 'ts-log';
import logger from '../Logger';

declare global {
  interface Window {
    ___streamdeck_connect?: { host: string; port: number };
  }
}

const HelloEvent = {
  clientEvent: 'hello',
};

export default class Client {
  private readonly websocket: WebSocket;
  private readonly logger: Logger;

  constructor() {
    this.logger = logger.getLogger('Client');
    this.logger.info('started client', window.___streamdeck_connect);
    this.websocket = this.createWebsocket();
  }

  private createWebsocket(): WebSocket {
    const ws = window.___streamdeck_connect;
    if (ws === undefined) {
      throw new Error('window.___streamdeck_connect variable not set!');
    }
    const webSocket = new WebSocket(`ws://${ws.host}:${ws.port}`);
    webSocket.addEventListener('open', () => {
      webSocket.send(JSON.stringify(HelloEvent));
    });
    webSocket.addEventListener('message', this.onMessage.bind(this));
    return webSocket;
  }

  private onMessage(messageEvent: MessageEvent): void {
    this.logger.info('got message from websocket:', messageEvent);
  }
}
