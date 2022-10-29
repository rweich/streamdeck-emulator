import { ButtonEventData } from './ButtonEventData';

export type ClientEvent = {
  payload: ButtonEventData;
  type: 'keyUp' | 'keyDown' | 'addPlugin' | 'removePlugin';
};
