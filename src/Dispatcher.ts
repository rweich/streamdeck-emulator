import Display from './Display';
import Emulator from './Emulator';
import EventEmitter from 'eventemitter3';
import { Logger } from 'ts-log';
import { Plugin } from './plugin';
import Server from './Server';
import WebSocket from 'ws';

type EventTypes = {
  /** signals that we need to close the plugins websocket */
  'close-plugin-websocket': () => void;
};

export default class Dispatcher {
  private readonly server: Server;
  private readonly plugin: Plugin;
  private readonly emulator: Emulator;
  private readonly display: Display;
  private readonly logger: Logger;
  private readonly eventEmitter = new EventEmitter<EventTypes>();

  constructor(server: Server, plugin: Plugin, emulator: Emulator, display: Display, logger: Logger) {
    this.server = server;
    this.plugin = plugin;
    this.emulator = emulator;
    this.display = display;
    this.logger = logger;
  }

  private static isPluginRegisterEvent(payload: unknown): boolean {
    return (
      (payload as { event?: string }).hasOwnProperty('event') && (payload as { event: string }).event === 'register'
    );
  }

  private static isClientHelloEvent(payload: unknown): boolean {
    return (
      (payload as { clientEvent?: string }).hasOwnProperty('clientEvent')
      && (payload as { clientEvent: string }).clientEvent === 'hello'
    );
  }

  public run(): void {
    this.logger.debug('init dispatcher');
    this.server.on('connection', this.onConnection.bind(this));
    this.plugin.on('reset-plugin', () => {
      this.eventEmitter.emit('close-plugin-websocket');
    });
    this.plugin.on('ready', () => {
      // TODO: instead of this, just send message through ws from here?
      this.display.onPluginReady('name', 'icon-data');
      this.plugin.connectTo(this.server.connection);
    });
    this.display.start(this.server.connection);
    this.display.on('button-add-plugin', (event) => this.emulator.onDisplayButtonAdd(event));
    this.display.on('button-remove-plugin', (event) => this.emulator.onDisplayButtonRemove(event));
    this.emulator.on('send-to-display', (event) => this.display.onEmulatorMessage(event));
  }

  private onConnection(ws: WebSocket): void {
    this.logger.debug('onConnect called - adding our register-event-listener');
    ws.once('message', (data) => {
      this.logger.debug('received message', data);
      const payload = JSON.parse(data.toString());
      if (Dispatcher.isPluginRegisterEvent(payload)) {
        this.onPluginConnection(ws, data);
      } else if (Dispatcher.isClientHelloEvent(payload)) {
        this.onClientConnection(ws);
      }
    });
  }

  private onPluginConnection(ws: WebSocket, data: WebSocket.Data): void {
    this.logger.debug('message is plugin register event');
    this.eventEmitter.once('close-plugin-websocket', () => {
      this.emulator.off('send-to-plugin');
      ws.close();
    });
    this.emulator.on('send-to-plugin', (message) => ws.send(message));
    ws.on('message', (data) => this.emulator.onPluginMessage(JSON.parse(data.toString())));
    ws.emit('message', data); // TODO: not sure if the emulator needs the register event - it wont answer..
  }

  private onClientConnection(ws: WebSocket): void {
    this.logger.debug('client said hello 👋');
    this.display.on('send-to-client', (message) => ws.send(message));
    ws.on('message', (data) => this.display.onClientMessage(JSON.parse(data.toString())));
    // TODO: notify the emulator - send disappear / gone-event?
    ws.on('close', () => this.logger.info('client-ws got closed'));
  }
}
