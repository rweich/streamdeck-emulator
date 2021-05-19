import { ConnectionType } from '../Server';

export type PluginEvents = {
  ready: () => void;
  'reset-plugin': () => void;
  'connect-ws': (connection: ConnectionType) => void;
};
