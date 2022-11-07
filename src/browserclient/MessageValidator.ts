import { isString } from 'ts-type-guards';

import { ManifestType } from '../pluginloader/ManifestType';
import {
  type InitMessage,
  type LogMessage,
  type SetImageMessage,
  type SetPiContextMessage,
  type SetTitleMessage,
} from '../types/SendToClientMessageTypes';
import assertType from '../utils/AssertType';

export default class MessageValidator {
  public isSetTitleMessage(_message: unknown): _message is SetTitleMessage {
    const message = _message as SetTitleMessage;
    return (
      message.hasOwnProperty('type')
      && message.type === 'set-title'
      && message.hasOwnProperty('context')
      && message.hasOwnProperty('title')
      && isString(message.context)
      && isString(message.title)
    );
  }

  public isSetImageMessage(_message: unknown): _message is SetImageMessage {
    const message = _message as SetImageMessage;
    return (
      message.hasOwnProperty('type')
      && message.type === 'set-image'
      && message.hasOwnProperty('context')
      && message.hasOwnProperty('image')
      && isString(message.context)
      && isString(message.image)
    );
  }

  public isSetPiContextMessage(_message: unknown): _message is SetPiContextMessage {
    const message = _message as SetPiContextMessage;
    return (
      message.hasOwnProperty('type')
      && message.type === 'set-pi-context'
      && message.hasOwnProperty('context')
      && message.hasOwnProperty('piContext')
      && isString(message.context)
      && isString(message.piContext)
    );
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

  public isPluginLogMessage(_message: unknown): _message is LogMessage & { type: 'log-plugin' } {
    const message = _message as LogMessage;
    return (
      message.hasOwnProperty('type')
      && message.type === 'log-plugin'
      && message.hasOwnProperty('level')
      && message.hasOwnProperty('message')
      && message.hasOwnProperty('payload')
      && isString(message.level)
      && isString(message.message)
    );
  }
}
