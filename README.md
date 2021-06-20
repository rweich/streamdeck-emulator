# streamdeck-emulator

Proof of concept for a streamdeck emulator to help speed up development of streamdeck plugins.

## Usage

Build the client bundle:

```shell
yarn build
```

Start the emulator:

```shell
yarn ts-node src/index.ts ../streamdeck-datetime/dist/dev.de.rweich.datetime.sdPlugin/plugin.html
```
