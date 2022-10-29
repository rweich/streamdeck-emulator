import { Static, Type } from '@sinclair/typebox';

/* eslint-disable sort-keys */
export const ManifestType = Type.Object({
  Actions: Type.Array(
    Type.Object({
      Icon: Type.String(),
      Name: Type.String(),
      States: Type.Array(
        Type.Object({
          Image: Type.String(),
          TitleAlignment: Type.String(),
          FontSize: Type.String(),
        }),
      ),
      SupportedInMultiActions: Type.Boolean(),
      Tooltip: Type.String(),
      UUID: Type.String(),
    }),
  ),
  SDKVersion: Type.Number(),
  Author: Type.String(),
  CodePath: Type.String(),
  CodePathMac: Type.Optional(Type.String()),
  CodePathWin: Type.Optional(Type.String()),
  PropertyInspectorPath: Type.Optional(Type.String()),
  Description: Type.String(),
  Name: Type.String(),
  Category: Type.Optional(Type.String()),
  CategoryIcon: Type.Optional(Type.String()),
  Icon: Type.String(),
  URL: Type.Optional(Type.String()),
  Version: Type.String(),
  OS: Type.Array(
    Type.Object({
      Platform: Type.String(),
      MinimumVersion: Type.String(),
    }),
  ),
  Software: Type.Object({
    MinimumVersion: Type.String(),
  }),
  Profiles: Type.Optional(Type.Any()),
  DefaultWindowSize: Type.Optional(Type.Any()),
  ApplicationsToMonitor: Type.Optional(Type.Any()),
});
/* eslint-enable sort-keys */
export type ManifestType = Static<typeof ManifestType>;
