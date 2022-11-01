import { MixedLogger } from '@livy/logger/lib/mixed-logger';
import { is, isNumber } from 'ts-type-guards';

import { ManifestType } from '../pluginloader/ManifestType';
import { type ActionButton } from './ActionButton';
import Messenger from './Messenger';

/** handles all things related to the DOM / displaying stuff */
export default class ClientDisplay {
  private readonly messenger: Messenger;
  private readonly logger: MixedLogger;

  public constructor(messenger: Messenger, logger: MixedLogger) {
    this.messenger = messenger;
    this.logger = logger;
  }

  public start(): void {
    this.addEventListeners();
  }

  public setTitle(data: string): void {
    const titleElement = this.getButtonContainer(0, 0).querySelector('.action__display');
    if (is(HTMLElement)(titleElement)) {
      titleElement.innerHTML = data.replace('\n', '<br>');
    }
  }

  public initActions(manifest: ManifestType): void {
    const iconElement = document.querySelector('.plugin-title__icon');
    if (is(HTMLImageElement)(iconElement)) {
      iconElement.src = `${manifest.Icon}.png`;
    }
    const nameElement = document.querySelector('.plugin-title__name');
    if (nameElement !== null) {
      nameElement.textContent = manifest.Name;
    }

    const template = document.querySelector('#plugin-action-template');
    if (!is(HTMLTemplateElement)(template)) {
      this.logger.error('action template not found');
      return;
    }
    const actionContainer = document.querySelector('.plugin-action-list');
    if (!is(HTMLElement)(actionContainer)) {
      this.logger.error('action container not found');
      return;
    }
    for (const action of manifest.Actions) {
      const actionHtml = template.content.cloneNode(true);
      if (!is(DocumentFragment)(actionHtml)) {
        this.logger.error('action html element not found');
        continue;
      }
      const iconElement = actionHtml.querySelector('.plugin-action__icon img');
      if (is(HTMLImageElement)(iconElement)) {
        iconElement.src = `${action.Icon}.png`;
      }
      const nameElement = actionHtml.querySelector('.plugin-action__name');
      if (is(HTMLElement)(nameElement)) {
        nameElement.textContent = action.Name;
      }
      this.logger.debug('appending action');
      actionContainer.append(actionHtml);
    }
  }

  private addEventListeners(): void {
    for (const button of document.querySelectorAll('.action__button-add')) {
      button.addEventListener('click', (event) =>
        this.messenger.sendButtonEvent('add-action', this.extractActionButton(event)),
      );
    }
    for (const button of document.querySelectorAll('.action__button-remove')) {
      button.addEventListener('click', (event) =>
        this.messenger.sendButtonEvent('remove-action', this.extractActionButton(event)),
      );
    }
    for (const button of document.querySelectorAll('.action__display')) {
      button.addEventListener('mousedown', (event) =>
        this.messenger.sendButtonEvent('key-down', this.extractActionButton(event)),
      );
      button.addEventListener('mouseup', (event) =>
        this.messenger.sendButtonEvent('key-up', this.extractActionButton(event)),
      );
    }
  }

  private extractActionButton(event: Event): ActionButton {
    if (!is(HTMLElement)(event.target)) {
      throw new Error('togglebutton is no htmlelement');
    }
    const actionElement = event.target.closest('.action');
    if (!is(HTMLElement)(actionElement)) {
      throw new Error('no action element found for button');
    }
    const row = Number(actionElement.dataset.row);
    const column = Number(actionElement.dataset.column);
    if (!isNumber(row) || !isNumber(column)) {
      throw new Error('no row/column set in action');
    }
    return { column, row };
  }

  private getButtonContainer(column: number, row: number): HTMLElement {
    const element = document.querySelector(`.action[data-row="${row}"][data-column="${column}"]`);
    if (!is(HTMLElement)(element)) {
      throw new Error('could not find action element');
    }
    return element;
  }
}
