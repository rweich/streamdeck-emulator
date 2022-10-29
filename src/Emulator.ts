import { EventsStreamdeck } from '@rweich/streamdeck-events';
import { RegisterEvent, SetTitleEvent } from '@rweich/streamdeck-events/dist/Events/Streamdeck/Received';
import { ReceivedEventTypes } from '@rweich/streamdeck-events/dist/Events/Streamdeck/Received/ReceivedEventTypes';
import { EventEmitter, EventListener } from 'eventemitter3';
import { Logger } from 'ts-log';

import { ButtonEventData } from './browserclient/ButtonEventData';

type EmulatorEvents = {
  'send-to-plugin': (message: unknown) => void;
  'send-to-display': (title: string) => void;
};

type EventMapOfUnion<T extends { event: string }> = {
  [P in T['event']]: (event: Extract<T, { event: P }>) => void;
};
type PluginEvents = EventMapOfUnion<ReceivedEventTypes>;

/**
 * Emulates the streamdeck "core"
 * Keeps track of the state of all the buttons.
 * Handles the plugins messages.
 */
export default class Emulator {
  private logger: Logger;
  private emulatorEvents = new EventEmitter<EmulatorEvents>();
  private pluginEvents = new EventEmitter<PluginEvents>();

  public constructor(logger: Logger) {
    this.logger = logger;

    this.pluginEvents.on('register', this.onRegister.bind(this));
    this.pluginEvents.on('setTitle', this.onSetTitle.bind(this));
  }

  public on<T extends keyof EmulatorEvents>(event: T, callback: EventListener<EmulatorEvents, T>): void {
    this.emulatorEvents.on(event, callback);
  }

  public off(event: 'send-to-plugin'): void {
    this.emulatorEvents.off(event);
  }

  public onPluginMessage(jsonPayload: unknown): void {
    this.logger.debug('got message from plugin', jsonPayload);
    let event: ReceivedEventTypes;
    try {
      event = new EventsStreamdeck().createFromPayload(jsonPayload);
    } catch (error) {
      this.logger.error(error);
      return;
    }
    // TODO: try to do that without the "as never" (not sure how to make typescript understand..)
    this.pluginEvents.emit(event.event, event as never);
  }

  public onDisplayButtonAdd(event: ButtonEventData): void {
    this.logger.debug('onDisplayButtonAdd', event);
    this.emulatorEvents.emit(
      'send-to-plugin',
      JSON.stringify(new EventsStreamdeck().willAppear(event.action, event.uid)),
    );
  }

  public onDisplayButtonRemove(event: ButtonEventData): void {
    this.logger.debug('onDisplayButtonRemove', event);
    // TODO: create event in other package
    // this.emulatorEvents.emit('send-to-plugin', JSON.stringify(new EventsStreamdeck().will('action', event.uuid)));
  }

  private onRegister(event: RegisterEvent): void {
    this.logger.info('got register event');
    /**
     * send to browser:
     *  - the new button to show
     *  - where to show it row/column
     *
     * hmmm. it should be already in the browser
     *  - so user created new button
     *  - we sent the register event to the plugin
     *  - the plugin sent it back <- this is where we are
     */
  }

  private onSetTitle(event: SetTitleEvent): void {
    this.logger.debug('got settitle event with title', event.title);
    /**
     * things to send:
     *  - title
     *  - context/uid
     *
     * we need to keep track (somewhere) of
     *  - all the buttons and their contexts
     *  - their states
     */
    this.emulatorEvents.emit('send-to-display', event.title);
  }
}
