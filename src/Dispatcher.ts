import Emulator from './Emulator';
import EventEmitter from 'eventemitter3';
import { Logger } from 'ts-log';
import { Plugin } from './plugin';
import Server from './Server';
import WebSocket from 'ws';

type EventTypes = {
  'should-close-ws': () => void;
};

export default class Dispatcher {
  private readonly server: Server;
  private readonly plugin: Plugin;
  private readonly emulator: Emulator;
  private readonly logger: Logger;
  private readonly eventEmitter = new EventEmitter<EventTypes>();

  constructor(server: Server, plugin: Plugin, emulator: Emulator, logger: Logger) {
    this.server = server;
    this.plugin = plugin;
    this.emulator = emulator;
    this.logger = logger;
  }

  private static isPluginRegisterEvent(payload: unknown): boolean {
    return (
      (payload as { event: string }).hasOwnProperty('event') && (payload as { event: string }).event === 'register'
    );
  }

  public run(): void {
    this.logger.debug('init dispatcher');
    this.server.on('connection', this.onConnection.bind(this));
    this.plugin.connectTo(this.server.connection);
    this.plugin.on('reset-plugin', () => {
      this.eventEmitter.emit('should-close-ws');
    });
    this.plugin.on('ready', () => {
      this.plugin.connectTo(this.server.connection);
    });
  }

  private onConnection(ws: WebSocket): void {
    this.logger.debug('onConnect called - adding our register-event-listener');
    ws.once('message', (data) => {
      this.logger.debug('received message', data);
      const payload = JSON.parse(data.toString());
      if (Dispatcher.isPluginRegisterEvent(payload)) {
        this.logger.debug('message is plugin register event');
        this.eventEmitter.once('should-close-ws', () => {
          this.emulator.off('send-to-plugin');
          ws.close();
        });
        this.emulator.on('send-to-plugin', (message) => ws.send(message));
        ws.on('message', (data) => this.emulator.onPluginMessage(JSON.parse(data.toString())));
        ws.emit('message', data);
      }
    });
  }
}
