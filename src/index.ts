import path from 'node:path';

import Dispatcher from './Dispatcher';
import Display from './Display';
import Emulator from './Emulator';
import logger from './Logger';
import { FileWatcher, PluginLoader } from './pluginloader';
import Server from './Server';

const pluginPath = path.resolve(process.cwd(), process.argv[2]);

const dispatcher = new Dispatcher(
  new Server(logger.getLogger('server')),
  new PluginLoader(pluginPath, new FileWatcher(), logger),
  new Emulator(logger.getLogger('emulator')),
  new Display(pluginPath, logger.getLogger('display')),
  logger.getLogger('dispatcher'),
);
dispatcher.run();
