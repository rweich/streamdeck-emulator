import { ConsoleFormatter } from '@livy/console-formatter';
import { ConsoleHandler } from '@livy/console-handler';
import { createLogger as createLivyLogger } from '@livy/logger';
import { MixedLogger } from '@livy/logger/lib/mixed-logger';
import path from 'node:path';

import Dispatcher from './Dispatcher';
import Display from './Display';
import Emulator from './Emulator';
import { FileWatcher, PluginLoader } from './pluginloader';
import Server from './Server';

const pluginPath = path.resolve(process.cwd(), process.argv[2]);
const consoleFormatter = new ConsoleFormatter({ include: { channel: true } });

function createLogger(channel: string): MixedLogger {
  return createLivyLogger(channel, {
    handlers: [new ConsoleHandler({ formatter: consoleFormatter })],
    mode: 'mixed',
  }) as MixedLogger;
}

const dispatcher = new Dispatcher(
  new Server(createLogger('server')),
  new PluginLoader(pluginPath, new FileWatcher(), createLogger('pluginloader'), createLogger('bound-plugin')),
  new Emulator(createLogger('emulator')),
  new Display(pluginPath, createLogger('display')),
  createLogger('dispatcher'),
);
dispatcher.run();
