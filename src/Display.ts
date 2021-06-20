import { ConnectionType } from './Server';
import EventEmitter from 'eventemitter3';
import { Logger } from 'ts-log';
import browserSync from 'browser-sync';
import fs from 'fs';
import http from 'http';
import path from 'path';

export type DisplayButtonEvent = {
  column: number;
  row: number;
  uid: string;
};

type EventTypes = {
  /** when the plugin gets added to a button */
  'button-add-plugin': (event: DisplayButtonEvent) => void;
  /** when the plugin gets removed from a button */
  'button-remove-plugin': (event: DisplayButtonEvent) => void;
  /** when the button gets pressed */
  'button-key-down': (event: DisplayButtonEvent) => void;
  /** when the button gets released */
  'button-key-up': (event: DisplayButtonEvent) => void;
};

export default class Display {
  private readonly eventEmitter = new EventEmitter<EventTypes>();
  private readonly logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  public onPluginReady(name: string, iconData: string): void {
    // send info to browser..
  }

  public on(event: keyof EventTypes, callback: EventEmitter.EventListener<EventTypes, keyof EventTypes>): void {
    this.eventEmitter.on(event, callback);
  }

  public start(connection: ConnectionType): void {
    this.logger.info('starting display-module');
    browserSync({
      middleware: [
        {
          handle: (request: http.IncomingMessage, response: http.ServerResponse) => {
            this.logger.info('index was requested');
            const content = String(fs.readFileSync(path.resolve(__dirname + '/client/index.html')))
              .replace('{STREAMDECK_HOST}', connection.host)
              .replace('{STREAMDECK_PORT}', String(connection.port));
            response.end(content);
          },
          route: '/',
        },
      ],
      server: [path.resolve(__dirname + '/client'), path.resolve(__dirname + '/../dist/client')],
    });
  }
}
