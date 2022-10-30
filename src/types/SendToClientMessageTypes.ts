import { ManifestType } from '../pluginloader/ManifestType';

export type SetTitleMessage = {
  type: 'setTitle';
  title: string;
};
export type InitMessage = {
  type: 'init';
  manifest: ManifestType;
};
export type LogMessage = {
  type: 'log';
  level: 'debug' | 'info' | 'warning' | 'error';
  message: string;
  payload: unknown;
};
