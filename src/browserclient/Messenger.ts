import { MixedLogger } from '@livy/logger/lib/mixed-logger';
import { EventEmitter, EventListener } from 'eventemitter3';
import WebSocket, { MessageEvent } from 'isomorphic-ws';

import { type ActionButton } from './ActionButton';
import { ClientEvent } from './ClientEvent';

type EventTypes = {
  messageReceived: (event: MessageEvent) => void;
};

const HelloEvent = {
  clientEvent: 'hello',
};

export default class Messenger {
  private readonly logger: MixedLogger;
  private readonly eventEmitter = new EventEmitter<EventTypes>();
  private _websocket: WebSocket | undefined;

  constructor(logger: MixedLogger) {
    this.logger = logger;
  }

  private get websocket(): WebSocket {
    if (this._websocket === undefined) {
      throw new Error('websocket is not open');
    }
    return this._websocket;
  }

  public startWebsocket(): void {
    const ws = window.___streamdeck_connect;
    if (ws === undefined) {
      throw new Error('window.___streamdeck_connect variable not set!');
    }
    this._websocket = new WebSocket(`ws://${ws.host}:${ws.port}`);
    this._websocket.addEventListener('open', () => {
      this.websocket.send(JSON.stringify(HelloEvent));
    });
    this._websocket.addEventListener('message', (event) => this.eventEmitter.emit('messageReceived', event));
  }

  public on<K extends keyof EventTypes>(event: K, callback: EventListener<EventTypes, K>): void {
    this.eventEmitter.on(event, callback);
  }

  public sendButtonEvent(type: 'key-down' | 'key-up' | 'add-action' | 'remove-action', button: ActionButton): void {
    this.sendWebsocketMessage({
      payload: {
        action: 'getthisfromtheplugininfo',
        column: button.column,
        row: button.row,
        uid: 'random',
      },
      type: type,
    });
  }

  private sendWebsocketMessage(message: ClientEvent): void {
    this.logger.info('sending ws-message', message);
    this.websocket.send(JSON.stringify(message));
  }
}
