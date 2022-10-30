import { ManifestType } from '../pluginloader/ManifestType';

export type SetTitleMessage = {
  type: 'setTitle';
  title: string;
};
export type InitMessage = {
  type: 'init';
  manifest: ManifestType;
};
