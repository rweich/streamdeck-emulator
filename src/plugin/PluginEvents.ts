import { ConnectionType } from '../Server';

export type PluginEvents = {
  /** signals that the plugin is ready to receive the connect-message */
  ready: () => void;
  /** called if the plugins state should be reset - eg. when the watcher detects a code change */
  'reset-plugin': () => void;
  /** signals the plugin to connect to the passed connection */
  'connect-ws': (connection: ConnectionType) => void;
};
