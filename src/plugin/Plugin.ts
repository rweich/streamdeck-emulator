import { JSDOM, VirtualConsole } from 'jsdom';

import { ConnectionType } from '../Server';
import EventEmitter from 'eventemitter3';
import FileWatcher from './FileWatcher';
import { PluginEvents } from './index';
import { RootLogger } from 'loglevel';

export default class Plugin {
  private readonly pluginPath: string;
  private readonly eventEmitter = new EventEmitter<PluginEvents>();
  private readonly fileWatcher: FileWatcher;
  private readonly logger: RootLogger;

  constructor(pluginPath: string, fileWatcher: FileWatcher, logger: RootLogger) {
    this.pluginPath = pluginPath;
    this.fileWatcher = fileWatcher;
    this.logger = logger;

    this.fileWatcher.watch(pluginPath).on('change', () => this.eventEmitter.emit('reset-plugin'));
    this.eventEmitter.on('reset-plugin', () => this.createDOM());
    this.createDOM();
  }

  public connectTo(connection: ConnectionType): void {
    this.logger.debug('sending connect-ws event');
    this.eventEmitter.emit('connect-ws', connection);
  }

  public on<T extends keyof PluginEvents>(event: T, callback: EventEmitter.EventListener<PluginEvents, T>): void {
    this.eventEmitter.on(event, callback);
  }

  private createDOM(): void {
    this.logger.info('createDOM called - fromfile', this.pluginPath);
    JSDOM.fromFile(this.pluginPath, {
      resources: 'usable',
      runScripts: 'dangerously',
      virtualConsole: this.createVirtualConsole(),
    })
      .then((dom) => {
        this.logger.debug('created DOM');
        return new Promise<JSDOM>((resolve) => {
          dom.window.addEventListener('load', () => {
            resolve(dom);
          });
        });
      })
      .then((dom) => {
        this.logger.info('dom is ready');
        this.eventEmitter.once('reset-plugin', () => dom.window.close());
        this.eventEmitter.once('connect-ws', (connection) => {
          this.logger.debug('received connect-ws event');
          dom.window.connectElgatoStreamDeckSocket(connection.port, 'uuidtest', 'register', '{}');
        });
        this.eventEmitter.emit('ready');
        return dom;
      })
      .catch((error) => this.logger.error(error));
  }

  private createVirtualConsole() {
    const console = new VirtualConsole();
    const logger = this.logger.getLogger('bound-plugin');
    console.on('debug', (...arguments_) => logger.debug(...arguments_));
    console.on('info', (...arguments_) => logger.info(...arguments_));
    console.on('warn', (...arguments_) => logger.warn(...arguments_));
    console.on('error', (...arguments_) => logger.error(...arguments_));
    console.on('log', (...arguments_) => logger.log(...arguments_));
    return console;
  }
}
