import EventEmitter from 'eventemitter3';
import { Logger } from 'ts-log';
import WebSocket from 'ws';

export type ConnectionType = { host: string; port: number };
export type ServerEvents = {
  connection: (ws: WebSocket) => void;
};

export default class Server {
  public readonly connection: ConnectionType;
  private readonly logger: Logger;
  private readonly wsServer: WebSocket.Server;
  private readonly eventEmitter = new EventEmitter<ServerEvents>();

  constructor(logger: Logger) {
    this.logger = logger;
    this.connection = { host: '127.0.0.1', port: 32109 };
    this.wsServer = new WebSocket.Server(this.connection);
    this.wsServer.on('connection', (ws) => this.eventEmitter.emit('connection', ws));
    this.logger.debug('created ws server on', this.connection);
  }

  public on(event: keyof ServerEvents, callback: (ws: WebSocket) => void): void {
    this.eventEmitter.on(event, callback);
  }

  public shutdown(): void {
    this.wsServer.close();
  }
}
