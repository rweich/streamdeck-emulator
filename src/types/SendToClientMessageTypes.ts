import { ManifestType } from '../pluginloader/ManifestType';

export type SetTitleMessage = {
  context: string;
  type: 'setTitle';
  title: string;
};
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
