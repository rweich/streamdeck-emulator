import './index.scss';

import { BrowserConsoleHandler } from '@livy/browser-console-handler';
import { DomHandler } from '@livy/dom-handler';
import { createLogger } from '@livy/logger';
import { MixedLogger } from '@livy/logger/lib/mixed-logger';
import WebSocket, { MessageEvent } from 'isomorphic-ws';
import { is, isNumber } from 'ts-type-guards';
import whenDomReady from 'when-dom-ready';

import { ManifestType } from '../pluginloader/ManifestType';
import { type InitMessage, type SetTitleMessage } from '../types/SendToClientMessageTypes';
import assertType from '../utils/AssertType';
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
  private readonly logger: MixedLogger;
  private _websocket: WebSocket | undefined;
  private pluginManifest: ManifestType | undefined;

  constructor() {
    this.logger = createLogger('Client', {
      handlers: [new BrowserConsoleHandler({ timestamps: true })],
      mode: 'mixed',
    }) as MixedLogger;
    this.logger.info('started client', window.___streamdeck_connect);

    whenDomReady()
      .then(this.onDomReady.bind(this))
      .catch((error) => this.logger.error(error));
  }

  public get websocket(): WebSocket {
    if (this._websocket === undefined) {
      throw new Error('websocket is not open');
    }
    return this._websocket;
  }

  private onDomReady(): void {
    this._websocket = this.createWebsocket();
    this.addEventListeners();
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
      button.addEventListener('click', (event) => this.sendEventToWebsocket(event, 'addPlugin'));
    }
    for (const button of document.querySelectorAll('.action__button-remove')) {
      button.addEventListener('click', (event) => this.sendEventToWebsocket(event, 'removePlugin'));
    }
    for (const button of document.querySelectorAll('.action__display')) {
      button.addEventListener('mousedown', (event) => this.sendEventToWebsocket(event, 'keyDown'));
      button.addEventListener('mouseup', (event) => this.sendEventToWebsocket(event, 'keyUp'));
    }

    const clientLogContainer = document.querySelector('.log--client');
    if (clientLogContainer === null) {
      throw new Error('couldnt find client log container');
    }
    this.logger.handlers.add(new DomHandler(clientLogContainer));
  }

  private onMessageFromWebsocket(messageEvent: MessageEvent): void {
    let payload: unknown;
    try {
      payload = JSON.parse(String(messageEvent.data));
    } catch (error) {
      this.logger.error('onMessageFromWebsocket - could not json parse payload', {
        error,
        payload: String(messageEvent.data),
      });
      return;
    }
    this.logger.debug('got message from websocket:', { payload });
    if (this.isSetTitleMessage(payload)) {
      this.setTitle(payload.title);
      return;
    }
    if (this.isInitMessage(payload)) {
      this.initPlugin(payload.manifest);
      return;
    }
  }

  private initPlugin(manifest: ManifestType): void {
    this.pluginManifest = manifest;
    const iconElement = document.querySelector('.plugin-title__icon');
    if (is(HTMLImageElement)(iconElement)) {
      iconElement.src = `${manifest.Icon}.png`;
    }
    const nameElement = document.querySelector('.plugin-title__name');
    if (nameElement !== null) {
      nameElement.textContent = manifest.Name;
    }

    const template = document.querySelector('#plugin-action-template');
    if (!is(HTMLTemplateElement)(template)) {
      this.logger.error('action template not found');
      return;
    }
    const actionContainer = document.querySelector('.plugin-action-list');
    if (!is(HTMLElement)(actionContainer)) {
      this.logger.error('action container not found');
      return;
    }
    for (const action of manifest.Actions) {
      const actionHtml = template.content.cloneNode(true);
      if (!is(DocumentFragment)(actionHtml)) {
        this.logger.error('action html element not found');
        continue;
      }
      const iconElement = actionHtml.querySelector('.plugin-action__icon img');
      if (is(HTMLImageElement)(iconElement)) {
        iconElement.src = `${action.Icon}.png`;
      }
      const nameElement = actionHtml.querySelector('.plugin-action__name');
      if (is(HTMLElement)(nameElement)) {
        nameElement.textContent = action.Name;
      }
      this.logger.debug('appending action');
      actionContainer.append(actionHtml);
    }
  }

  private sendEventToWebsocket(event: Event, type: 'keyDown' | 'keyUp' | 'addPlugin' | 'removePlugin'): void {
    if (this.pluginManifest === undefined) {
      this.logger.debug('plugin not initialized');
      return;
    }
    const { row, column } = this.getEventData(event);
    this.sendWebsocketMessage({
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

  private sendWebsocketMessage(message: ClientEvent): void {
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

  private isSetTitleMessage(_message: unknown): _message is SetTitleMessage {
    const message = _message as SetTitleMessage;
    return message.hasOwnProperty('type') && message.type === 'setTitle' && message.hasOwnProperty('title');
  }

  private isInitMessage(_message: unknown): _message is InitMessage {
    const message = _message as InitMessage;
    const isInitType = message.hasOwnProperty('type') && message.type === 'init' && message.hasOwnProperty('manifest');
    if (!isInitType) {
      return false;
    }
    try {
      assertType(ManifestType, message.manifest);
    } catch {
      return false;
    }
    return true;
  }
}
