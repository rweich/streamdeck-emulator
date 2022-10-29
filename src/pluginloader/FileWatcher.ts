import chokidar from 'chokidar';
import EventEmitter from 'eventemitter3';

import { FileWatcherEvents } from './FileWatcherEvents';

export default class FileWatcher {
  private readonly eventEmitter = new EventEmitter<FileWatcherEvents>();

  public watch(path: string): this {
    chokidar
      .watch(`${path}/**/*.js`, {
        awaitWriteFinish: {
          pollInterval: 1000,
          stabilityThreshold: 1000,
        },
        ignoreInitial: true,
        interval: 1000,
        usePolling: true,
      })
      .on('add', () => this.eventEmitter.emit('change'))
      .on('change', () => this.eventEmitter.emit('change'));
    return this;
  }

  public on<T extends keyof FileWatcherEvents>(
    event: T,
    callback: EventEmitter.EventListener<FileWatcherEvents, T>,
  ): this {
    this.eventEmitter.on(event, callback);
    return this;
  }
}
