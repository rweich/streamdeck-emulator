import { MixedLogger } from '@livy/logger/lib/mixed-logger';
import { EventEmitter, EventListener } from 'eventemitter3';
import { JSDOM, VirtualConsole } from 'jsdom';

import { ConnectionType } from '../Server';
import FileWatcher from './FileWatcher';
import { PluginEvents } from './index';
import { readManifest } from './Manifest';

/** Loads the plugin, watches for changes in the plugins source (and then reloads it) */
export default class PluginLoader {
  private readonly pluginPath: string;
  private readonly eventEmitter = new EventEmitter<PluginEvents>();
  private readonly fileWatcher: FileWatcher;
  private readonly logger: MixedLogger;
  private readonly pluginLogger: MixedLogger;

  constructor(pluginPath: string, fileWatcher: FileWatcher, logger: MixedLogger, pluginLogger: MixedLogger) {
    this.pluginPath = pluginPath;
    this.fileWatcher = fileWatcher;
    this.logger = logger;
    this.pluginLogger = pluginLogger;

    this.fileWatcher.watch(pluginPath).on('change', () => this.eventEmitter.emit('reset-plugin'));
    this.eventEmitter.on('reset-plugin', () => this.createDOM());
    this.createDOM();
  }

  public connectTo(connection: ConnectionType): void {
    this.logger.debug('sending connect-ws event');
    this.eventEmitter.emit('connect-ws', connection);
  }

  public on<T extends keyof PluginEvents>(event: T, callback: EventListener<PluginEvents, T>): void {
    this.eventEmitter.on(event, callback);
  }

  private createDOM(): void {
    this.logger.info('createDOM called - fromfile', { path: this.pluginPath });

    const manifest = readManifest(`${this.pluginPath}/manifest.json`);
    this.logger.info(`loading plugin from: ${this.pluginPath}/${manifest.CodePath}`);

    JSDOM.fromFile(`${this.pluginPath}/${manifest.CodePath}`, {
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
        this.eventEmitter.emit('ready', manifest);
        return dom;
      })
      .catch((error) => this.logger.error(error));
  }

  private log(level: 'debug' | 'info' | 'warning' | 'error', message: string, ...arguments_: unknown[]): void {
    this.pluginLogger.log(level, message, arguments_);
    this.eventEmitter.emit('log', level, message, arguments_);
  }

  private createVirtualConsole() {
    const console = new VirtualConsole();
    console.on('debug', (message, ...arguments_) => this.log('debug', message, ...arguments_));
    console.on('info', (message, ...arguments_) => this.log('info', message, ...arguments_));
    console.on('warn', (message, ...arguments_) => this.log('warning', message, ...arguments_));
    console.on('error', (message, ...arguments_) => this.log('error', message, ...arguments_));
    console.on('log', (message, ...arguments_) => this.log('debug', message, ...arguments_));
    return console;
  }
}
