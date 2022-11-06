import { MixedLogger } from '@livy/logger/lib/mixed-logger';

import ActionButton from './ActionButton';
import Messenger from './Messenger';

export default class ActionButtonFactory {
  public constructor(
    private readonly messenger: Messenger,
    private readonly piDisplay,
    private readonly logger: MixedLogger,
  ) {}

  public createActionButton(buttonElement: HTMLElement): ActionButton {
    return new ActionButton(buttonElement, this.messenger, this.piDisplay, this.logger);
  }
}
