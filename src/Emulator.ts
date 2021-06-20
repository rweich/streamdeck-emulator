import { RegisterEvent, SetTitleEvent } from '@rweich/streamdeck-events/dist/Events/Streamdeck/Received';

import { DisplayButtonEvent } from './Display';
import EventEmitter from 'eventemitter3';
import { EventsStreamdeck } from '@rweich/streamdeck-events';
import { Logger } from 'ts-log';
import { ReceivedEventTypes } from '@rweich/streamdeck-events/dist/Events/Streamdeck/Received/ReceivedEventTypes';

type EmulatorEvents = {
  'send-to-plugin': (message: unknown) => void;
  'send-to-display': () => void;
};

type EventMapOfUnion<T extends { event: string }> = {
  [P in T['event']]: (event: Extract<T, { event: P }>) => void;
};
type PluginEvents = EventMapOfUnion<ReceivedEventTypes>;

/**
 * I am emulating the streamdeck
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

  public on<T extends keyof Pick<EmulatorEvents, 'send-to-plugin'>>(
    event: T,
    callback: EventEmitter.EventListener<EmulatorEvents, T>,
  ): void {
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

  public onDisplayButtonAdd(event: DisplayButtonEvent): void {
    //
  }

  public onDisplayButtonRemove(event: DisplayButtonEvent): void {
    //
  }

  private onRegister(event: RegisterEvent): void {
    this.logger.info('got register event');
    // TODO: use the data from the manifest (action)
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
    this.emulatorEvents.emit('send-to-plugin', JSON.stringify(new EventsStreamdeck().willAppear('action', event.uuid)));
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
    this.emulatorEvents.emit('send-to-display');
  }
}
