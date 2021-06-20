import { FileWatcher, Plugin } from './plugin';

import Dispatcher from './Dispatcher';
import Display from './Display';
import Emulator from './Emulator';
import Server from './Server';
import logger from './Logger';
import path from 'path';

const file = path.resolve(process.cwd(), process.argv[2]);

const dispatcher = new Dispatcher(
  new Server(logger.getLogger('server')),
  new Plugin(file, new FileWatcher(), logger),
  new Emulator(logger.getLogger('emulator')),
  new Display(logger.getLogger('display')),
  logger.getLogger('dispatcher'),
);
dispatcher.run();
