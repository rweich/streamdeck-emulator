import { BrowserConsoleHandler } from '@livy/browser-console-handler';
import { DomHandler } from '@livy/dom-handler';
import { createLogger as createLivyLogger } from '@livy/logger';
import { MixedLogger } from '@livy/logger/lib/mixed-logger';
import whenDomReady from 'when-dom-ready';

import ActionButtonFactory from './ActionButtonFactory';
import Client from './Client';
import ClientDisplay from './ClientDisplay';
import MessageValidator from './MessageValidator';
import Messenger from './Messenger';
import PiDisplay from './PiDisplay';

function createLogger(channel: string, selector = '.log--client'): MixedLogger {
  return createLivyLogger(channel, {
    handlers: [new BrowserConsoleHandler({ timestamps: true }), new DomHandler(selector)],
    mode: 'mixed',
  }) as MixedLogger;
}

const mainLogger = createLogger('main');

function startup(): void {
  mainLogger.info('starting up browser-client ...');
  const messenger = new Messenger(createLogger('messenger'));

  new Client(
    messenger,
    new ClientDisplay(
      messenger,
      new ActionButtonFactory(
        messenger,
        new PiDisplay(messenger, createLogger('pi-display')),
        createLogger('action-button'),
      ),
      createLogger('client'),
    ),
    new MessageValidator(),
    createLogger('client'),
    createLogger('plugin', '.log--plugin'),
  ).start();
}

whenDomReady()
  .then(startup)
  .catch((error) => mainLogger.error(error));
