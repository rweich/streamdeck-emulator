import { MixedLogger } from '@livy/logger/lib/mixed-logger';
import { is } from 'ts-type-guards';

import { type ActionType, type ManifestType } from '../pluginloader/ManifestType';
import ActionButton from './ActionButton';
import ActionButtonFactory from './ActionButtonFactory';
import Messenger from './Messenger';

/** handles all things related to the DOM / displaying stuff */
export default class ClientDisplay {
  private readonly messenger: Messenger;
  private readonly actionButtonFactory: ActionButtonFactory;
  private readonly logger: MixedLogger;

  private readonly actionButtons: ActionButton[] = [];
  private readonly actionMap = new Map<string, ActionType>();
  private currentManifest: ManifestType | undefined;

  public constructor(messenger: Messenger, actionButtonFactory: ActionButtonFactory, logger: MixedLogger) {
    this.messenger = messenger;
    this.actionButtonFactory = actionButtonFactory;
    this.logger = logger;
  }

  /** initializes the display part of the client */
  public start(): void {
    const actionButtonsElements = Array.from(document.querySelectorAll('.action-button')).filter(is(HTMLElement));
    if (actionButtonsElements.length !== 4) {
      throw new Error('not enough action buttons');
    }
    for (const buttonElement of actionButtonsElements) {
      this.actionButtons.push(this.actionButtonFactory.createActionButton(buttonElement));
    }
  }

  public setTitle(context: string, title: string): void {
    for (const button of this.actionButtons) {
      if (button.isContext(context)) {
        button.setTitle(title);
        return;
      }
    }
  }

  public initByManifest(manifest: ManifestType): void {
    try {
      this.initPluginInfoAndActions(manifest);
    } catch (error) {
      this.logger.error('error on initializing: ' + String(error), { error });
    }
  }

  public setPiContext(context: string, piContext: string): void {
    for (const button of this.actionButtons) {
      if (button.isContext(context)) {
        button.setPiContext(piContext);
        return;
      }
    }
  }

  private initPluginInfoAndActions(manifest: ManifestType): void {
    this.currentManifest = manifest;
    this.setPluginIcon(manifest.Icon);
    this.setPluginName(manifest.Name);

    const actionListContainer = this.getActionListContainer();
    actionListContainer.innerHTML = '';
    this.actionMap.clear();

    for (const action of manifest.Actions) {
      this.actionMap.set(action.UUID, action);
      const actionHtml = this.getActionTemplate().content.cloneNode(true);
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
      const actionToggles = Array.from(actionHtml.querySelectorAll('.plugin-action__buttons button')).filter(
        is(HTMLButtonElement),
      );
      for (const toggle of actionToggles) {
        toggle.addEventListener('click', this.onActionButtonToggleClick.bind(this));
        toggle.dataset.actionUuid = action.UUID;
      }
      this.logger.debug(`appending action ${action.UUID} to list ...`);
      actionListContainer.append(actionHtml);
    }
  }

  private onActionButtonToggleClick({ target }): void {
    if (!is(HTMLElement)(target)) {
      throw new Error('onActionButtonToggleClick - not a proper element!');
    }

    const { buttonIndex, actionUuid } = target.dataset;
    if (buttonIndex === undefined || actionUuid === undefined) {
      throw new Error('toggle button is missing dataset params');
    }

    const isCurrentlyActive = target.classList.contains('user-button--active');
    // switch all toggle buttons with the same index to off ...
    const sameIndexButtons = document.querySelectorAll(
      `.plugin-action__buttons .user-button[data-button-index="${buttonIndex}"]`,
    );
    for (const sameButton of sameIndexButtons) {
      sameButton.classList.remove('user-button--active');
    }

    const actionInfo = this.actionMap.get(actionUuid);
    if (actionInfo === undefined) {
      throw new Error('action info not found in actionmap');
    }
    const acctionButton = this.getAcctionButton(Number(buttonIndex));

    if (isCurrentlyActive) {
      acctionButton.removeAction();
    } else {
      acctionButton.addAction(this.getCurrentManifest(), actionInfo);
      target.classList.add('user-button--active');
    }
  }

  private getAcctionButton(index: number): ActionButton {
    if (this.actionButtons[index] === undefined) {
      throw new Error(`button with index ${index} not found!`);
    }
    return this.actionButtons[index];
  }

  private getActionListContainer(): HTMLElement {
    const actionContainer = document.querySelector('.plugin-action-list');
    if (!is(HTMLElement)(actionContainer)) {
      throw new Error('action container not found');
    }
    return actionContainer;
  }

  private getActionTemplate(): HTMLTemplateElement {
    const template = document.querySelector('#plugin-action-template');
    if (!is(HTMLTemplateElement)(template)) {
      throw new Error('action template not found');
    }
    return template;
  }

  private setPluginIcon(icon: string): void {
    const iconElement = document.querySelector('.plugin-title__icon');
    if (is(HTMLImageElement)(iconElement)) {
      iconElement.src = `${icon}.png`;
    }
  }

  private setPluginName(name: string): void {
    const nameElement = document.querySelector('.plugin-title__name');
    if (nameElement !== null) {
      nameElement.textContent = name;
    }
  }

  private getCurrentManifest(): ManifestType {
    if (this.currentManifest === undefined) {
      throw new Error('not properly initialized');
    }
    return this.currentManifest;
  }
}
