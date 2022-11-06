import { MixedLogger } from '@livy/logger/lib/mixed-logger';
import { EventsStreamdeck } from '@rweich/streamdeck-events';
import {
  GetSettingsEvent,
  RegisterEvent,
  SetTitleEvent,
} from '@rweich/streamdeck-events/dist/Events/Streamdeck/Received';
import { ReceivedEventTypes } from '@rweich/streamdeck-events/dist/Events/Streamdeck/Received/ReceivedEventTypes';
import { EventEmitter, EventListener } from 'eventemitter3';

import { ButtonEventData } from './browserclient/ButtonEventData';

type EmulatorEvents = {
  'send-to-plugin': (message: unknown) => void;
  'send-to-pi': (message: unknown) => void;
  'send-to-display': (context: string, title: string) => void;
};

type EventMapOfUnion<T extends { event: string }> = {
  [P in T['event']]: (event: Extract<T, { event: P }>) => void;
};
type PluginPiEvents = EventMapOfUnion<ReceivedEventTypes>;

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

  public constructor(logger: MixedLogger) {
    this.logger = logger;

    this.pluginEvents.on('register', this.onRegister.bind(this));
    this.pluginEvents.on('setTitle', this.onSetTitle.bind(this));
    this.pluginEvents.on('getSettings', this.onPluginGetSettings.bind(this));
    this.piEvents.on('getSettings', this.onPiGetSettings.bind(this));
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
    this.emulatorEvents.emit(
      'send-to-plugin',
      JSON.stringify(new EventsStreamdeck().willAppear(event.action, event.context)),
    );
  }

  public onDisplayButtonRemove(event: ButtonEventData): void {
    this.logger.debug('onDisplayButtonRemove', event);
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
    /**
     * things to send:
     *  - title
     *  - context/uid
     *
     * we need to keep track (somewhere) of
     *  - all the buttons and their contexts
     *  - their states
     */
    this.emulatorEvents.emit('send-to-display', event.context, event.title);
  }

  private onPluginGetSettings(event: GetSettingsEvent): void {
    this.logger.debug(`got getsettings event from th plugin`, event);
    // todo: get settings from somewhere(?)
    //  send settings back to plugin -> didreceivesettings
  }

  private onPiGetSettings(event: GetSettingsEvent): void {
    this.logger.debug(`got getsettings event from the PI`);
    // todo: get settings from somewhere(?)
    //  send settings back to plugin -> didreceivesettings
  }
}
