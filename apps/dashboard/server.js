import http from 'node:http';
import https from 'node:https';

import { server } from './build/index.js';

const PROXY_PREFIX = '/proxy';
const PROXIED_SOCKET_PATH = /^\/proxy\/practice\/calls\/[^/?]+\/stream(?:\?|$)/;
const DROPPED_CLIENT_HEADERS = ['cf-connecting-ip', 'x-real-ip', 'x-forwarded-for', 'forwarded'];

/** The browser address, honouring ADDRESS_HEADER / XFF_DEPTH the same way adapter-node does for HTTP requests. */
function resolveClientAddress(request) {
  const addressHeader = process.env.ADDRESS_HEADER?.toLowerCase();
  if (!addressHeader) return request.socket.remoteAddress ?? '';

  const value = String(request.headers[addressHeader] ?? '');
  if (addressHeader !== 'x-forwarded-for') return value.trim();

  const depth = Number(process.env.XFF_DEPTH ?? '1') || 1;
  const addresses = value.split(',').map((address) => address.trim());

  return addresses[addresses.length - depth] ?? '';
}

function rejectUpgrade(socket, statusCode, statusMessage) {
  socket.end(`HTTP/1.1 ${statusCode} ${statusMessage}\r\nConnection: close\r\nContent-Length: 0\r\n\r\n`);
}

function writeUpgradeResponse(socket, response) {
  const lines = [`HTTP/1.1 ${response.statusCode} ${response.statusMessage}`];

  for (let index = 0; index < response.rawHeaders.length; index += 2) {
    lines.push(`${response.rawHeaders[index]}: ${response.rawHeaders[index + 1]}`);
  }

  socket.write(`${lines.join('\r\n')}\r\n\r\n`);
}

/**
 * SvelteKit hooks cannot answer WebSocket upgrades, so live practice calls under `/proxy` are piped to the API here,
 * keeping the browser on the dashboard origin like every other `/proxy` request.
 */
function forwardUpgrade(request, socket, head) {
  const upstreamBase = process.env.PRIVATE_SERVER_URL;

  if (!upstreamBase || !PROXIED_SOCKET_PATH.test(request.url ?? '')) {
    rejectUpgrade(socket, 404, 'Not Found');

    return;
  }

  const upstream = new URL(upstreamBase);
  const headers = { ...request.headers };

  for (const name of DROPPED_CLIENT_HEADERS) delete headers[name];

  headers.host = upstream.host;
  headers['x-forwarded-host'] = request.headers.host ?? '';
  headers['x-forwarded-proto'] = request.headers['x-forwarded-proto'] ?? (request.socket.encrypted ? 'https' : 'http');

  const clientAddress = resolveClientAddress(request);
  if (clientAddress) headers['x-forwarded-for'] = clientAddress;

  const transport = upstream.protocol === 'https:' ? https : http;
  const upstreamRequest = transport.request({
    hostname: upstream.hostname,
    port: upstream.port || (upstream.protocol === 'https:' ? 443 : 80),
    path: request.url.slice(PROXY_PREFIX.length),
    method: 'GET',
    headers
  });

  upstreamRequest.on('upgrade', (response, upstreamSocket, upstreamHead) => {
    writeUpgradeResponse(socket, response);

    if (upstreamHead.length) socket.write(upstreamHead);
    if (head.length) upstreamSocket.write(head);

    upstreamSocket.pipe(socket);
    socket.pipe(upstreamSocket);

    upstreamSocket.on('error', () => socket.destroy());
    socket.on('error', () => upstreamSocket.destroy());
    upstreamSocket.on('close', () => socket.destroy());
    socket.on('close', () => upstreamSocket.destroy());
  });

  upstreamRequest.on('response', (response) => {
    response.resume();
    rejectUpgrade(socket, response.statusCode ?? 502, response.statusMessage ?? 'Bad Gateway');
  });

  upstreamRequest.on('error', (error) => {
    console.error('practice call socket proxy failed:', error.message);
    rejectUpgrade(socket, 502, 'Bad Gateway');
  });

  upstreamRequest.end();
}

server.server.on('upgrade', forwardUpgrade);
