import { MixedLogger } from '@livy/logger/lib/mixed-logger';
import { EventEmitter } from 'eventemitter3';
import { Data as WebSocketData, WebSocket } from 'ws';

import Display from './Display';
import Emulator from './Emulator';
import { PluginLoader } from './pluginloader';
import Server from './Server';

type EventTypes = {
  /** signals that we need to close the plugins websocket */
  'close-plugin-websocket': () => void;
};

/** takes events from the Server, Plugin, etc. and forwards them to the correct recipient */
export default class Dispatcher {
  private readonly server: Server;
  private readonly pluginLoader: PluginLoader;
  private readonly emulator: Emulator;
  private readonly display: Display;
  private readonly logger: MixedLogger;
  private readonly eventEmitter = new EventEmitter<EventTypes>();

  constructor(server: Server, plugin: PluginLoader, emulator: Emulator, display: Display, logger: MixedLogger) {
    this.server = server;
    this.pluginLoader = plugin;
    this.emulator = emulator;
    this.display = display;
    this.logger = logger;
  }

  private static isPluginRegisterEvent(payload: unknown): boolean {
    return (
      (payload as { event?: string }).hasOwnProperty('event')
      && (payload as { event: string }).event === 'registerPlugin'
    );
  }

  private static isBrowserClientHelloEvent(payload: unknown): boolean {
    return (
      (payload as { clientEvent?: string }).hasOwnProperty('clientEvent')
      && (payload as { clientEvent: string }).clientEvent === 'hello'
    );
  }

  private static isPiRegisterEvent(payload: unknown): boolean {
    return (
      (payload as { event?: string }).hasOwnProperty('event')
      && (payload as { event: string }).event === 'registerPropertyInspector'
    );
  }

  public run(): void {
    this.logger.debug('init dispatcher');
    this.server.on('connection', this.onConnection.bind(this));
    this.pluginLoader.on('reset-plugin', () => {
      this.eventEmitter.emit('close-plugin-websocket');
    });
    this.pluginLoader.on('ready', (manifest) => {
      this.display.onPluginReady(manifest);
      this.pluginLoader.connectTo(this.server.connection);
    });
    this.pluginLoader.on('log', this.display.onLogFromPlugin.bind(this.display));

    this.display.startBrowserClient(this.server.connection);
    this.display.on('button-add-plugin', (event) => this.emulator.onDisplayButtonAdd(event));
    this.display.on('button-remove-plugin', (event) => this.emulator.onDisplayButtonRemove(event));
    this.display.on('button-key-down', (event) => this.emulator.onDisplayButtonDown(event));
    this.display.on('button-key-up', (event) => this.emulator.onDisplayButtonUp(event));

    this.emulator.on('send-to-display', (message) => this.display.onEmulatorMessage(message));
  }

  private onConnection(ws: WebSocket): void {
    this.logger.debug('onConnect called - adding our register-event-listener');
    ws.once('message', (data) => {
      this.logger.debug('received message', { message: data.toString() });
      const payload = JSON.parse(data.toString());
      if (Dispatcher.isPluginRegisterEvent(payload)) {
        this.onPluginConnection(ws, data);
      } else if (Dispatcher.isPiRegisterEvent(payload)) {
        this.onPiConnection(ws);
      } else if (Dispatcher.isBrowserClientHelloEvent(payload)) {
        this.onBrowserClientConnection(ws);
      }
    });
  }

  private onPluginConnection(ws: WebSocket, data: WebSocketData): void {
    this.logger.debug('message is plugin register event');
    this.eventEmitter.once('close-plugin-websocket', () => {
      this.emulator.off('send-to-plugin');
      ws.close();
    });
    this.emulator.on('send-to-plugin', (message) => ws.send(message));
    ws.on('message', (data) => this.emulator.onPluginMessage(JSON.parse(data.toString())));
    ws.emit('message', data); // TODO: not sure if the emulator needs the register event - it wont answer..
  }

  private onPiConnection(ws: WebSocket): void {
    this.logger.debug('message is pi register event');
    this.emulator.on('send-to-pi', (message) => ws.send(message));
    this.display.once('button-remove-pi', () => {
      this.logger.info('closing pi-websocket ...');
      ws.terminate();
    });
    ws.on('message', (data) => this.emulator.onPiMessage(JSON.parse(data.toString())));
    ws.on('close', () => {
      this.logger.info('pi-websocket was closed!');
      this.emulator.off('send-to-pi');
    });
  }

  private onBrowserClientConnection(ws: WebSocket): void {
    this.logger.debug('browser-client said hello 👋');
    this.display.on('send-to-client', (message) => ws.send(JSON.stringify(message)));
    this.display.onClientInit();
    ws.on('message', (data) => this.display.onClientMessage(JSON.parse(data.toString())));
    // TODO: notify the emulator - send disappear / gone-event?
    ws.on('close', () => this.logger.info('client-ws got closed'));
  }
}
