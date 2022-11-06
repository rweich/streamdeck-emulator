import { ButtonEventData } from './ButtonEventData';

export type ClientEvent = {
  payload: ButtonEventData;
  type: 'key-up' | 'key-down' | 'add-action' | 'remove-action' | 'remove-pi';
};
