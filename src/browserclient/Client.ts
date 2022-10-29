import './index.scss';

import WebSocket, { MessageEvent } from 'isomorphic-ws';
import { Logger } from 'ts-log';
import { is, isNumber } from 'ts-type-guards';
import whenDomReady from 'when-dom-ready';

import logger from '../Logger';
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
  private readonly logger: Logger;

  constructor() {
    this.logger = logger.getLogger('Client');
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
    webSocket.addEventListener('message', this.onMessage.bind(this));
    return webSocket;
  }

  private onMessage(messageEvent: MessageEvent): void {
    this.logger.info('got message from websocket:', messageEvent);
    this.setTitle(String(messageEvent.data));
  }

  private addEventListeners(): void {
    for (const button of document.querySelectorAll('.action__button-add')) {
      button.addEventListener('click', this.onButtonAdd.bind(this));
    }
    for (const button of document.querySelectorAll('.action__button-remove')) {
      button.addEventListener('click', this.onButtonRemove.bind(this));
    }
    for (const button of document.querySelectorAll('.action__button-click')) {
      button.addEventListener('mousedown', this.onButtonDown.bind(this));
      button.addEventListener('mouseup', this.onButtonUp.bind(this));
    }
  }

  private onButtonAdd(event: Event): void {
    this.toggleButton(event, 'addPlugin');
  }

  private onButtonRemove(event: Event): void {
    this.toggleButton(event, 'removePlugin');
  }

  private onButtonDown(event: Event): void {
    const { row, column } = this.getEventData(event);
    this.sendMessage({
      payload: {
        action: 'getthisfromtheplugininfo',
        column,
        row,
        uid: 'random',
      },
      type: 'keyDown',
    });
  }

  private onButtonUp(event: Event): void {
    const { row, column } = this.getEventData(event);
    this.sendMessage({
      payload: {
        action: 'getthisfromtheplugininfo',
        column,
        row,
        uid: 'random',
      },
      type: 'keyUp',
    });
  }

  private toggleButton(event: Event, type: 'addPlugin' | 'removePlugin'): void {
    this.logger.debug('toggleButton', type);
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
    if (!is(HTMLButtonElement)(event.target)) {
      throw new Error('togglebutton is no button');
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

  private getActionElement(column: number, row: number): HTMLElement {
    const element = document.querySelector(`.action[data-row="${row}"][data-column="${column}"]`);
    if (!is(HTMLElement)(element)) {
      throw new Error('could not find action element');
    }
    return element;
  }

  private sendMessage(message: ClientEvent): void {
    this.logger.info('sending ws-message', message);
    this.websocket.send(JSON.stringify(message));
  }

  private setTitle(data: string): void {
    const titleElement = this.getActionElement(0, 0).querySelector('.action__display');
    if (is(HTMLElement)(titleElement)) {
      titleElement.innerHTML = data.replace('\n', '<br>');
    }
  }
}
