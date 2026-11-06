import { createNodeWebSocket } from '@hono/node-ws';
import type { Hono } from 'hono';
import type { ServerType } from '@hono/node-server';

let boundApp: Hono<any, any, any> | undefined;

const nodeWebSocket = createNodeWebSocket({
  get app() {
    if (!boundApp) throw new Error('attachWebSockets must run before the first WebSocket upgrade');

    return boundApp;
  }
});

export const upgradeWebSocket = nodeWebSocket.upgradeWebSocket;

/** Routes WebSocket upgrades on `server` through `app`, so upgrade requests pass the same middleware as HTTP. */
export function attachWebSockets(app: Hono<any, any, any>, server: ServerType) {
  boundApp = app;
  nodeWebSocket.injectWebSocket(server);
}
