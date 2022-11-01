import { MixedLogger } from '@livy/logger/lib/mixed-logger';
import browserSync from 'browser-sync';
import { EventEmitter, EventListener } from 'eventemitter3';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';

import { ButtonEventData } from './browserclient/ButtonEventData';
import { ClientEvent } from './browserclient/ClientEvent';
import { ManifestType } from './pluginloader/ManifestType';
import { ConnectionType } from './Server';
import { type InitMessage, type LogMessage, type SetTitleMessage } from './types/SendToClientMessageTypes';

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
  'send-to-client': (event: SetTitleMessage | InitMessage | LogMessage) => void;
};

/** emulates the streamdeck display and handles everything related to the browserclient */
export default class Display {
  private readonly eventEmitter = new EventEmitter<EventTypes>();
  private readonly pluginPath: string;
  private readonly logger: MixedLogger;
  private pluginManifest: ManifestType | undefined;

  constructor(pluginPath: string, logger: MixedLogger) {
    this.pluginPath = pluginPath;
    this.logger = logger;
  }

  public onPluginReady(manifest: ManifestType): void {
    this.pluginManifest = manifest;
    this.logger.info('onPluginReady - sending init event to the client (even if it might not be ready yet)');
    this.eventEmitter.emit('send-to-client', { manifest, type: 'init' });
  }

  public onLogFromPlugin(level: 'debug' | 'info' | 'warning' | 'error', message: string, payload: unknown): void {
    this.eventEmitter.emit('send-to-client', { level, message, payload, type: 'log' });
  }

  public on<K extends keyof EventTypes>(event: K, callback: EventListener<EventTypes, K>): void {
    this.eventEmitter.on(event, callback);
  }

  public onClientInit(): void {
    if (this.pluginManifest === undefined) {
      this.logger.debug('onClientInit - plugin not ready yet - cant send manifest to client');
      return;
    }
    this.logger.debug('onClientInit - sending manifest to client');
    this.eventEmitter.emit('send-to-client', { manifest: this.pluginManifest, type: 'init' });
  }

  public startBrowserClient(connection: ConnectionType): void {
    this.logger.info('starting browser-client');
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
      server: [path.resolve(dirname + '/../dist/browserclient'), this.pluginPath],
    });
  }

  public onClientMessage(jsonPayload: unknown): void {
    this.logger.debug('onClientMessage - got message:', { message: jsonPayload });
    if (!this.isEventPayload(jsonPayload)) {
      this.logger.error('not a client-event-payload: ' + JSON.stringify(jsonPayload));
      return;
    }
    switch (jsonPayload.type) {
      case 'key-up':
        this.eventEmitter.emit('button-key-up', jsonPayload.payload);
        break;
      case 'key-down':
        this.eventEmitter.emit('button-key-down', jsonPayload.payload);
        break;
      case 'add-action':
        this.eventEmitter.emit('button-add-plugin', jsonPayload.payload);
        break;
      case 'remove-action':
        this.eventEmitter.emit('button-remove-plugin', jsonPayload.payload);
        break;
      default:
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const completeCheck: never = jsonPayload.type;
    }
  }

  public onEmulatorMessage(title: string): void {
    // TODO: make more generic than just set-title
    this.eventEmitter.emit('send-to-client', { title, type: 'setTitle' });
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
