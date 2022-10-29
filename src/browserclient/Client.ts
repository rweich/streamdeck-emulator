import './index.scss';

import { BrowserConsoleHandler } from '@livy/browser-console-handler';
import { DomHandler } from '@livy/dom-handler';
import { createLogger } from '@livy/logger';
import { MixedLogger } from '@livy/logger/lib/mixed-logger';
import WebSocket, { MessageEvent } from 'isomorphic-ws';
import { is, isNumber } from 'ts-type-guards';
import whenDomReady from 'when-dom-ready';

import { ClientEvent } from './ClientEvent';

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
  private readonly logger: MixedLogger;

  constructor() {
    this.logger = createLogger('my-app-logger', {
      handlers: [new BrowserConsoleHandler({ timestamps: true })],
      mode: 'mixed',
    }) as MixedLogger;
    this.logger.info('started client', window.___streamdeck_connect);

    this.websocket = this.createWebsocket();
    whenDomReady()
      .then(() => this.addEventListeners())
      .catch((error) => this.logger.error(error));
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
    webSocket.addEventListener('message', this.onMessageFromWebsocket.bind(this));
    return webSocket;
  }

  private addEventListeners(): void {
    for (const button of document.querySelectorAll('.action__button-add')) {
      button.addEventListener('click', (event) => this.toggleButton(event, 'addPlugin'));
    }
    for (const button of document.querySelectorAll('.action__button-remove')) {
      button.addEventListener('click', (event) => this.toggleButton(event, 'removePlugin'));
    }
    for (const button of document.querySelectorAll('.action__display')) {
      button.addEventListener('mousedown', (event) => this.sendKeyEvent(event, 'keyDown'));
      button.addEventListener('mouseup', (event) => this.sendKeyEvent(event, 'keyUp'));
    }

    const clientLogContainer = document.querySelector('.log--client');
    if (clientLogContainer === null) {
      throw new Error('couldnt find client log container');
    }
    this.logger.handlers.add(new DomHandler(clientLogContainer));
  }

  private onMessageFromWebsocket(messageEvent: MessageEvent): void {
    this.logger.info('got message from websocket:', { title: messageEvent.data });
    this.setTitle(String(messageEvent.data));
  }

  private sendKeyEvent(event: Event, type: 'keyDown' | 'keyUp'): void {
    const { row, column } = this.getEventData(event);
    this.sendMessage({
      payload: {
        action: 'getthisfromtheplugininfo',
        column,
        row,
        uid: 'random',
      },
      type: type,
    });
  }

  private toggleButton(event: Event, type: 'addPlugin' | 'removePlugin'): void {
    this.logger.debug('toggleButton', { type });
    const { row, column } = this.getEventData(event);
    this.sendMessage({
      payload: {
        action: 'getthisfromtheplugininfo',
        column,
        row,
        uid: 'random',
      },
      type: type,
    });
  }

  private getEventData(event: Event): { row: number; column: number } {
    if (!is(HTMLElement)(event.target)) {
      throw new Error('togglebutton is no htmlelement');
    }
    const actionElement = event.target.closest('.action');
    if (!is(HTMLElement)(actionElement)) {
      throw new Error('no action element found for button');
    }
    const row = Number(actionElement.dataset.row);
    const column = Number(actionElement.dataset.column);
    if (!isNumber(row) || !isNumber(column)) {
      throw new Error('no row/column set in action');
    }
    return { column, row };
  }

  private sendMessage(message: ClientEvent): void {
    this.logger.info('sending ws-message', message);
    this.websocket.send(JSON.stringify(message));
  }

  private setTitle(data: string): void {
    const titleElement = this.getButtonContainer(0, 0).querySelector('.action__display');
    if (is(HTMLElement)(titleElement)) {
      titleElement.innerHTML = data.replace('\n', '<br>');
    }
  }

  private getButtonContainer(column: number, row: number): HTMLElement {
    const element = document.querySelector(`.action[data-row="${row}"][data-column="${column}"]`);
    if (!is(HTMLElement)(element)) {
      throw new Error('could not find action element');
    }
    return element;
  }
}
