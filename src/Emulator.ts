import { MixedLogger } from '@livy/logger/lib/mixed-logger';
import { EventsStreamdeck } from '@rweich/streamdeck-events';
import {
  GetSettingsEvent,
  RegisterEvent,
  SetSettingsEvent,
  SetTitleEvent,
} from '@rweich/streamdeck-events/dist/Events/Streamdeck/Received';
import { ReceivedEventTypes } from '@rweich/streamdeck-events/dist/Events/Streamdeck/Received/ReceivedEventTypes';
import { EventEmitter, EventListener } from 'eventemitter3';

import { ButtonEventData } from './browserclient/ButtonEventData';
import { SetPiContextMessage, SetTitleMessage } from './types/SendToClientMessageTypes';
import { generateRandomContext } from './utils/GenerateRandomContext';

type EmulatorEvents = {
  'send-to-plugin': (message: unknown) => void;
  'send-to-pi': (message: unknown) => void;
  'send-to-display': (message: SetPiContextMessage | SetTitleMessage) => void;
};

type EventMapOfUnion<T extends { event: string }> = {
  [P in T['event']]: (event: Extract<T, { event: P }>) => void;
};
type PluginPiEvents = EventMapOfUnion<ReceivedEventTypes>;

type RegisteredButton = ButtonEventData & { piContext: string; settings: unknown };

/**
 * Emulates the streamdeck "core"
 * Keeps track of the state of all the buttons.
 * Handles the plugins messages.
 */
export default class Emulator {
  private logger: MixedLogger;
  private emulatorEvents = new EventEmitter<EmulatorEvents>();
  private pluginEvents = new EventEmitter<PluginPiEvents>();
  private piEvents = new EventEmitter<PluginPiEvents>();

  private readonly registeredButtons = new Map<string, RegisteredButton>();

  public constructor(logger: MixedLogger) {
    this.logger = logger;

    this.pluginEvents.on('register', this.onRegister.bind(this));
    this.pluginEvents.on('setTitle', this.onSetTitle.bind(this));
    this.pluginEvents.on('getSettings', this.onPluginGetSettings.bind(this));
    this.pluginEvents.on('setSettings', this.onPluginSetSettings.bind(this));
    this.piEvents.on('register', this.onRegister.bind(this));
    this.piEvents.on('getSettings', this.onPiGetSettings.bind(this));
    this.piEvents.on('setSettings', this.onPiSetSettings.bind(this));
  }

  public on<T extends keyof EmulatorEvents>(event: T, callback: EventListener<EmulatorEvents, T>): void {
    this.emulatorEvents.on(event, callback);
  }

  public off(event: 'send-to-plugin' | 'send-to-pi'): void {
    this.emulatorEvents.off(event);
  }

  public onPluginMessage(jsonPayload: unknown): void {
    this.logger.debug('got message from plugin', { message: jsonPayload });
    let event: ReceivedEventTypes;
    try {
      event = new EventsStreamdeck().createFromPayload(jsonPayload);
    } catch (error) {
      this.logger.error('cannot create streamdeck event from playload', { error });
      return;
    }
    // TODO: try to do that without the "as never" (not sure how to make typescript understand..)
    this.pluginEvents.emit(event.event, event as never);
  }

  public onPiMessage(jsonPayload: unknown): void {
    this.logger.debug('got message from pi', { message: jsonPayload });
    let event: ReceivedEventTypes;
    try {
      event = new EventsStreamdeck().createFromPayload(jsonPayload);
    } catch (error) {
      this.logger.error('cannot create streamdeck event from playload', { error });
      return;
    }
    // TODO: try to do that without the "as never" (not sure how to make typescript understand..)
    this.piEvents.emit(event.event, event as never);
  }

  public onDisplayButtonAdd(event: ButtonEventData): void {
    this.logger.debug('onDisplayButtonAdd', event);
    const piContext = generateRandomContext();
    this.registeredButtons.set(event.context, { ...event, piContext, settings: {} });
    this.emulatorEvents.emit(
      'send-to-plugin',
      JSON.stringify(new EventsStreamdeck().willAppear(event.action, event.context)),
    );
    this.emulatorEvents.emit('send-to-display', { context: event.context, piContext, type: 'set-pi-context' });
  }

  public onDisplayButtonRemove(event: ButtonEventData): void {
    this.logger.debug('onDisplayButtonRemove', event);
    this.registeredButtons.delete(event.context);
    this.emulatorEvents.emit(
      'send-to-plugin',
      JSON.stringify(new EventsStreamdeck().willDisappear(event.action, event.context)),
    );
  }

  public onDisplayButtonDown(event: ButtonEventData): void {
    this.logger.debug('onDisplayButtonDown', event);
    this.emulatorEvents.emit(
      'send-to-plugin',
      JSON.stringify(
        new EventsStreamdeck().keyDown(event.action, event.context, { column: event.column, row: event.row }),
      ),
    );
  }

  public onDisplayButtonUp(event: ButtonEventData): void {
    this.logger.debug('onDisplayButtonUp', event);
    this.emulatorEvents.emit(
      'send-to-plugin',
      JSON.stringify(
        new EventsStreamdeck().keyUp(event.action, event.context, { column: event.column, row: event.row }),
      ),
    );
  }

  private onRegister(event: RegisterEvent): void {
    this.logger.info('got register event');
  }

  private onSetTitle(event: SetTitleEvent): void {
    this.logger.debug(`got settitle event with title "${event.title}"`);
    this.emulatorEvents.emit('send-to-display', { context: event.context, title: event.title, type: 'set-title' });
  }

  private onPluginGetSettings({ context }: GetSettingsEvent): void {
    this.logger.debug(`got getsettings event from th plugin`);
    this.sendSettingsToPlugin(context);
  }

  private onPluginSetSettings({ context, payload }: SetSettingsEvent): void {
    const button = this.getRegisteredButtonByButtonContext(context);
    this.registeredButtons.set(context, { ...button, settings: payload });
    this.sendSettingsToPi(button.piContext);
  }

  private onPiGetSettings({ context: piContext }: GetSettingsEvent): void {
    this.logger.debug(`got getsettings event from the PI`);
    this.sendSettingsToPi(piContext);
  }

  private onPiSetSettings(event: SetSettingsEvent): void {
    const button = this.getRegisteredButtonByPiContext(event.context);
    this.registeredButtons.set(button.context, { ...button, settings: event.payload });
    this.sendSettingsToPlugin(button.context);
  }

  private sendSettingsToPlugin(context: string): void {
    this.logger.debug(`sending settings to plugin (context: ${context}`);
    const button = this.getRegisteredButtonByButtonContext(context);
    this.emulatorEvents.emit(
      'send-to-plugin',
      JSON.stringify(
        new EventsStreamdeck().didReceiveSettings(button.action, button.context, { settings: button.settings }),
      ),
    );
  }

  private sendSettingsToPi(piContext: string): void {
    this.logger.debug(`sending settings to pi (pi-context: ${piContext}`);
    const button = this.getRegisteredButtonByPiContext(piContext);
    this.emulatorEvents.emit(
      'send-to-pi',
      JSON.stringify(
        new EventsStreamdeck().didReceiveSettings(button.action, button.piContext, { settings: button.settings }),
      ),
    );
  }

  private getRegisteredButtonByPiContext(piContext: string): RegisteredButton {
    for (const [, data] of this.registeredButtons.entries()) {
      if (data.piContext === piContext) {
        return data;
      }
    }
    throw new Error(`registered button for pi-context "${piContext}" not found`);
  }

  private getRegisteredButtonByButtonContext(context: string): RegisteredButton {
    const button = this.registeredButtons.get(context);
    if (button === undefined) {
      throw new Error(`could not find registered button for context ${context}`);
    }
    return button;
  }
}
