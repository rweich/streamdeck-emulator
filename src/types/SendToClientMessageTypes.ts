import { ManifestType } from '../pluginloader/ManifestType';

export type InitMessage = {
  type: 'init';
  manifest: ManifestType;
};
export type LogMessage = {
  type: 'log-plugin' | 'log-pi';
  level: 'debug' | 'info' | 'warning' | 'error';
  message: string;
  payload: unknown;
};
export type SetPiContextMessage = {
  context: string;
  type: 'set-pi-context';
  piContext: string;
};
export type SetTitleMessage = {
  context: string;
  type: 'set-title';
  title: string;
};
export type SetImageMessage = {
  context: string;
  type: 'set-image';
  image: string;
};
