import { ConnectionType } from '../Server';
import { ManifestType } from './ManifestType';

export type PluginEvents = {
  /** signals that the plugin is ready to receive the connect-message */
  ready: (manifest: ManifestType) => void;
  /** called if the plugins state should be reset - eg. when the watcher detects a code change */
  'reset-plugin': () => void;
  /** signals the plugin to connect to the passed connection */
  'connect-ws': (connection: ConnectionType) => void;

  /** sends the log from the plugin as an event */
  log: (level: 'debug' | 'info' | 'warning' | 'error', message: string, payload: unknown) => void;
};
