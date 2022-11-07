import { MixedLogger } from '@livy/logger/lib/mixed-logger';
import { is } from 'ts-type-guards';

import { type ActionType, type ManifestType } from '../pluginloader/ManifestType';
import Messenger from './Messenger';

type Connectable = {
  connectElgatoStreamDeckSocket: (inPort, inPropertyInspectorUUID, inRegisterEvent, inInfo, inActionInfo) => void;
};

export default class PiDisplay {
  private readonly messenger: Messenger;
  private readonly logger: MixedLogger;
  private readonly piContainer: HTMLElement;

  constructor(messenger: Messenger, logger: MixedLogger) {
    this.messenger = messenger;
    this.logger = logger;
    const piContainer = document.querySelector('.pi-container');
    if (!is(HTMLElement)(piContainer)) {
      throw new Error('propertyinspector container not found');
    }
    this.piContainer = piContainer;
  }

  public showPi(
    manifest: ManifestType,
    actionInfo: ActionType,
    piContext: string,
    context: string,
    column: number,
    row: number,
  ): void {
    if (manifest.PropertyInspectorPath === undefined) {
      this.logger.info('no pi-path in manifest');
      return;
    }
    this.piContainer.innerHTML = '';
    const frame = document.createElement('iframe');
    // TODO: change content of pi html to send console logs to parent
    frame.src = manifest.PropertyInspectorPath;
    frame.addEventListener('load', () => this.onPiFrameLoad(frame, actionInfo, piContext, context, column, row));
    this.piContainer.append(frame);
  }

  public hidePi(): void {
    this.messenger.sendButtonEvent('remove-pi', { action: '', column: 1, context: '', row: 1 });
    this.piContainer.innerHTML = '';
  }

  private onPiFrameLoad(
    frame: HTMLIFrameElement,
    actionInfo: ActionType,
    piContext: string,
    context: string,
    column: number,
    row: number,
  ): void {
    const contentWindow = frame.contentWindow;
    if (contentWindow === null) {
      return;
    }
    if (!this.hasConnectMethod(contentWindow)) {
      return;
    }
    this.logger.info('calling connectElgatoStreamDeckSocket on PI');
    contentWindow.connectElgatoStreamDeckSocket(
      window.___streamdeck_connect?.port,
      piContext,
      'registerPropertyInspector',
      '{}',
      JSON.stringify({
        action: actionInfo.UUID,
        context,
        device: 'uniqueValue',
        payload: {
          coordinates: {
            column,
            row,
          },
          settings: {},
        },
      }),
    );
  }

  private hasConnectMethod(value: unknown): value is Connectable {
    return (value as Connectable).hasOwnProperty('connectElgatoStreamDeckSocket');
  }
}
