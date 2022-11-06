import { MixedLogger } from '@livy/logger/lib/mixed-logger';
import { customAlphabet } from 'nanoid';
import { is } from 'ts-type-guards';

import { type ActionType, ManifestType } from '../pluginloader/ManifestType';
import { ButtonEventData } from './ButtonEventData';
import Messenger from './Messenger';
import PiDisplay from './PiDisplay';

export default class ActionButton {
  private readonly actionElement: HTMLElement;
  private readonly messenger: Messenger;
  private readonly piDisplay: PiDisplay;
  private readonly logger: MixedLogger;

  private readonly actionDisplay: HTMLElement;
  private readonly row: number;
  private readonly column: number;
  private isActive = false;
  private currentManifest: ManifestType | undefined;
  private currentActionInfo: ActionType | undefined;
  private currentContext: string | undefined;

  public constructor(actionElement: HTMLElement, messenger: Messenger, piDisplay: PiDisplay, logger: MixedLogger) {
    this.actionElement = actionElement;
    this.messenger = messenger;
    this.piDisplay = piDisplay;
    this.logger = logger;

    if (actionElement.dataset.row === undefined || actionElement.dataset.column === undefined) {
      throw new Error('dataset params missing from actionbutton');
    }

    this.row = Number(actionElement.dataset.row);
    this.column = Number(actionElement.dataset.column);

    const actiondisplay = actionElement.querySelector('.action__display');
    if (!is(HTMLElement)(actiondisplay)) {
      throw new Error("where's the button?");
    }
    this.actionDisplay = actiondisplay;
    actiondisplay.addEventListener('mousedown', this.onMouseDown.bind(this));
    actiondisplay.addEventListener('mouseup', this.onMouseUp.bind(this));
  }

  public addAction(manifest: ManifestType, actionInfo: ActionType): void {
    if (this.isActive) {
      this.removeAction();
    }
    this.actionElement.classList.add('action-button--active');

    this.actionElement
      .querySelector('.action-button__toggle_pi')
      ?.addEventListener('click', this.onPiToggleClick.bind(this));

    this.isActive = true;
    this.currentManifest = manifest;
    this.currentActionInfo = actionInfo;
    this.currentContext = this.generateRandomContext();
    console.log('da context', this.currentContext);
    this.messenger.sendButtonEvent('add-action', this.getButtonEventData());
    this.logger.info('added action to button', {
      action: actionInfo,
      column: this.column,
      context: this.currentContext,
      row: this.row,
    });
  }

  public removeAction(): void {
    this.messenger.sendButtonEvent('remove-action', this.getButtonEventData());
    this.actionElement.classList.remove('action-button--active');
    this.isActive = false;
    this.currentActionInfo = undefined;
    this.currentContext = undefined;
    this.actionDisplay.textContent = '';
  }

  public setTitle(title: string): void {
    if (!this.isActive) {
      return;
    }
    this.actionDisplay.textContent = title;
  }

  public isContext(context: string): boolean {
    return this.currentContext !== undefined && this.currentContext === context;
  }

  private getButtonEventData(): ButtonEventData {
    if (this.currentActionInfo === undefined || this.currentContext === undefined) {
      throw new Error('actionbutton was not properly initialized');
    }
    return {
      action: this.currentActionInfo.UUID,
      column: this.column,
      context: this.currentContext,
      row: this.row,
    };
  }

  private onPiToggleClick({ target }): void {
    this.logger.debug('pi toggle button was clicked ...');
    if (this.currentManifest === undefined) {
      throw new Error('actionbutton was not properly initialized');
    }
    if (!is(HTMLElement)(target)) {
      throw new Error('event target is no html element');
    }
    const isPiActive = target.classList.contains('user-button--active');
    if (isPiActive) {
      this.piDisplay.hidePi();
    } else {
      this.piDisplay.showPi(this.currentManifest, this.generateRandomContext());
    }
    target.classList.toggle('user-button--active', !isPiActive);
  }

  private generateRandomContext(): string {
    return customAlphabet('1234567890ABCDEF', 32)();
  }

  private onMouseDown(): void {
    if (!this.isActive) {
      return;
    }
    this.messenger.sendButtonEvent('key-down', this.getButtonEventData());
  }

  private onMouseUp(): void {
    if (!this.isActive) {
      return;
    }
    this.messenger.sendButtonEvent('key-up', this.getButtonEventData());
  }
}
