import { ManifestType } from '../pluginloader/ManifestType';
import { InitMessage, SetTitleMessage } from '../types/SendToClientMessageTypes';
import assertType from '../utils/AssertType';

export default class MessageValidator {
  public isSetTitleMessage(_message: unknown): _message is SetTitleMessage {
    const message = _message as SetTitleMessage;
    return message.hasOwnProperty('type') && message.type === 'setTitle' && message.hasOwnProperty('title');
  }

  public isInitMessage(_message: unknown): _message is InitMessage {
    const message = _message as InitMessage;
    const isInitType = message.hasOwnProperty('type') && message.type === 'init' && message.hasOwnProperty('manifest');
    if (!isInitType) {
      return false;
    }
    try {
      assertType(ManifestType, message.manifest);
    } catch {
      return false;
    }
    return true;
  }
}
