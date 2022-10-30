import { existsSync, readFileSync } from 'node:fs';

import assertType from '../utils/AssertType';
import { ManifestType } from './ManifestType';

export const readManifest = (fileName: string): ManifestType => {
  if (!existsSync(fileName)) {
    throw new Error('manifest file not found');
  }
  const manifest = JSON.parse(String(readFileSync(fileName)));
  assertType(ManifestType, manifest);
  return manifest;
};
