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
  private readonly pluginLogger: MixedLogger;

  constructor(
    messenger: Messenger,
    display: ClientDisplay,
    messageValidator: MessageValidator,
    logger: MixedLogger,
    pluginLogger: MixedLogger,
  ) {
    this.messenger = messenger;
    this.display = display;
    this.messageValidator = messageValidator;
    this.logger = logger;
    this.pluginLogger = pluginLogger;
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
    if (this.messageValidator.isPluginLogMessage(payload)) {
      this.pluginLogger.log(payload.level, payload.message, { payload: payload.payload });
      // don't use the normal logger for this!
      return;
    }
    this.logger.debug('got message from websocket:', { payload });
    if (this.messageValidator.isInitMessage(payload)) {
      this.display.initByManifest(payload.manifest);
      return;
    }
    if (this.messageValidator.isSetImageMessage(payload)) {
      this.display.setImage(payload.context, payload.image);
      return;
    }
    if (this.messageValidator.isSetPiContextMessage(payload)) {
      this.display.setPiContext(payload.context, payload.piContext);
      return;
    }
    if (this.messageValidator.isSetTitleMessage(payload)) {
      this.display.setTitle(payload.context, payload.title);
      return;
    }

    this.logger.error('got a message i could not handle (ᵟຶ︵ ᵟຶ)');
  }
}
