import browserSync from 'browser-sync';
import { EventEmitter, EventListener } from 'eventemitter3';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { Logger } from 'ts-log';

import { ButtonEventData } from './browserclient/ButtonEventData';
import { ClientEvent } from './browserclient/ClientEvent';
import { ConnectionType } from './Server';

type EventTypes = {
  /** when the plugin gets added to a button */
  'button-add-plugin': (event: ButtonEventData) => void;
  /** when the plugin gets removed from a button */
  'button-remove-plugin': (event: ButtonEventData) => void;
  /** when the button gets pressed */
  'button-key-down': (event: ButtonEventData) => void;
  /** when the button gets released */
  'button-key-up': (event: ButtonEventData) => void;
  /** signals that the message should be sent to the client-ws */
  'send-to-client': (message: string) => void;
};

/** emulates the streamdeck display and handles everything related to the browserclient */
export default class Display {
  private readonly eventEmitter = new EventEmitter<EventTypes>();
  private readonly logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  public onPluginReady(name: string, iconData: string): void {
    // send info to browser ...
  }

  public on<K extends keyof EventTypes>(event: K, callback: EventListener<EventTypes, K>): void {
    this.eventEmitter.on(event, callback);
  }

  public start(connection: ConnectionType): void {
    this.logger.info('starting display-module');
    // eslint-disable-next-line unicorn/prefer-module
    const dirname = __dirname;
    browserSync({
      middleware: [
        {
          handle: (request: http.IncomingMessage, response: http.ServerResponse) => {
            this.logger.info('index was requested');
            const content = String(fs.readFileSync(path.resolve(dirname + '/browserclient/index.html')))
              .replace('{STREAMDECK_HOST}', connection.host)
              .replace('{STREAMDECK_PORT}', String(connection.port));
            response.end(content);
          },
          route: '/',
        },
      ],
      server: [path.resolve(dirname + '/browserclient'), path.resolve(dirname + '/../dist/browserclient')],
    });
  }

  public onClientMessage(jsonPayload: unknown): void {
    this.logger.debug('onClientMessage - got message:', jsonPayload);
    if (!this.isEventPayload(jsonPayload)) {
      this.logger.error('not a client-event-payload: ' + JSON.stringify(jsonPayload));
      return;
    }
    switch (jsonPayload.type) {
      case 'keyUp':
        this.eventEmitter.emit('button-key-up', jsonPayload.payload);
        break;
      case 'keyDown':
        this.eventEmitter.emit('button-key-down', jsonPayload.payload);
        break;
      case 'addPlugin':
        this.eventEmitter.emit('button-add-plugin', jsonPayload.payload);
        break;
      case 'removePlugin':
        this.eventEmitter.emit('button-remove-plugin', jsonPayload.payload);
        break;
      default:
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const completeCheck: never = jsonPayload.type;
    }
  }

  public onEmulatorMessage(event: string): void {
    this.eventEmitter.emit('send-to-client', event);
  }

  private isEventPayload(jsonPayload: unknown): jsonPayload is ClientEvent {
    const data = jsonPayload as ClientEvent;
    return (
      data.hasOwnProperty('type')
      && data.hasOwnProperty('payload')
      && data.payload.hasOwnProperty('action')
      && data.payload.hasOwnProperty('column')
      && data.payload.hasOwnProperty('row')
      && data.payload.hasOwnProperty('uid')
    );
  }
}
