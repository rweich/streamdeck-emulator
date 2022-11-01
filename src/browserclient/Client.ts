import './index.scss';

import { MixedLogger } from '@livy/logger/lib/mixed-logger';
import { MessageEvent } from 'isomorphic-ws';

import ClientDisplay from './ClientDisplay';
import MessageValidator from './MessageValidator';
import Messenger from './Messenger';

declare global {
  interface Window {
    ___streamdeck_connect?: { host: string; port: number };
  }
}

export default class Client {
  private readonly messenger: Messenger;
  private readonly display: ClientDisplay;
  private readonly messageValidator: MessageValidator;
  private readonly logger: MixedLogger;

  constructor(messenger: Messenger, display: ClientDisplay, messageValidator: MessageValidator, logger: MixedLogger) {
    this.messenger = messenger;
    this.display = display;
    this.messageValidator = messageValidator;
    this.logger = logger;
  }

  public start(): void {
    this.logger.info('starting client ...', window.___streamdeck_connect);
    this.messenger.startWebsocket();
    this.messenger.on('messageReceived', this.onMessageFromWebsocket.bind(this));
    this.display.start();
  }

  private onMessageFromWebsocket(messageEvent: MessageEvent): void {
    let payload: unknown;
    try {
      payload = JSON.parse(String(messageEvent.data));
    } catch (error) {
      this.logger.error('onMessageFromWebsocket - could not json parse payload', {
        error,
        payload: String(messageEvent.data),
      });
      return;
    }
    this.logger.debug('got message from websocket:', { payload });
    if (this.messageValidator.isSetTitleMessage(payload)) {
      this.display.setTitle(payload.title);
      return;
    }
    if (this.messageValidator.isInitMessage(payload)) {
      this.display.initActions(payload.manifest);
      return;
    }
  }
}
